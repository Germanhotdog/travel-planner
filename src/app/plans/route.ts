'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { NextResponse } from 'next/server';
import { Plan, Activity } from '@/lib/store/planSlice';
import { v4 as uuidv4 } from 'uuid';
import { createClient,type Row } from '@libsql/client';

// Define interface for SQLite user query
interface DBUser {
  id: string;
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function mapToActivity(row: Row): Activity {
  return {
    id: String(row.id),
    title: String(row.title),
    destination: String(row.destination),
    startDate: new Date(String(row.startDate)).toISOString(),
    endDate: new Date(String(row.endDate)).toISOString(),
    startTime: row.startTime ? String(row.startTime) : null,
    endTime: row.endTime ? String(row.endTime) : null,
    activities: row.activities ? String(row.activities) : null,
    ownerId: String(row.ownerId),
    planId: String(row.planId)
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch plans where the user is either the owner or a shared user
    const plansResult = await db.execute({
      sql: `
        SELECT p.*
        FROM plans p
        LEFT JOIN plan_shares ps ON p.id = ps.planId
        WHERE p.ownerId = ? OR ps.userId = ?
        GROUP BY p.id
      `,
      args: [session.user.id, session.user.id],
    });

    const plans = plansResult.rows.map(row => ({
      id: row.id as string,
      title: row.title as string,
      ownerId: row.ownerId as string
    }));

    // Fetch activities for each plan
    const plansWithActivities: Plan[] = [];
    for (const plan of plans) {
      const activitiesResult = await db.execute({
        sql: `
          SELECT a.*
          FROM activities a
          WHERE a.planId = ?
          ORDER BY a.startDate ASC, a.startTime ASC, a.endDate ASC, a.endTime ASC
        `,
        args: [plan.id],
      });

      const activities = activitiesResult.rows.map(mapToActivity);

      plansWithActivities.push({
        id: plan.id,
        title: plan.title,
        ownerId: plan.ownerId,
        activities,
      });
    }

    return NextResponse.json(plansWithActivities);
  } catch (err) {
    console.error('Fetch plans error:', err);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const sharedEmail = formData.get('sharedEmail') as string;
    const activitiesData = JSON.parse(formData.get('activities') as string) as {
      title: string;
      destination: string;
      startDate: string;
      endDate: string;
      startTime: string | null;
      endTime: string | null;
      activities: string | null;
    }[];

    // Validate and normalize activity date-times
    for (const activity of activitiesData) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (activity.startTime && !timeRegex.test(activity.startTime)) {
        throw new Error(`Invalid startTime format for "${activity.title}": ${activity.startTime}. Expected HH:mm`);
      }
      if (activity.endTime && !timeRegex.test(activity.endTime)) {
        throw new Error(`Invalid endTime format for "${activity.title}": ${activity.endTime}. Expected HH:mm`);
      }

      if (isNaN(Date.parse(activity.startDate)) || isNaN(Date.parse(activity.endDate))) {
        throw new Error(`Invalid date for "${activity.title}": ${activity.startDate} to ${activity.endDate}`);
      }
    }

    // Check for scheduling conflicts
    for (let i = 0; i < activitiesData.length; i++) {
      const activity = activitiesData[i];
      const start = new Date(activity.startDate + (activity.startTime ? `T${activity.startTime}:00` : 'T00:00:00'));
      const end = new Date(activity.endDate + (activity.endTime ? `T${activity.endTime}:00` : 'T23:59:59'));

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Invalid date/time for "${activity.title}": ${activity.startDate} ${activity.startTime} to ${activity.endDate} ${activity.endTime}`);
      }

      if (start > end) {
        throw new Error(`Activity "${activity.title}" has invalid dates: start (${start.toISOString()}) must be before end (${end.toISOString()})`);
      }

      for (let j = 0; j < activitiesData.length; j++) {
        if (i !== j) {
          const other = activitiesData[j];
          const otherStart = new Date(other.startDate + (other.startTime ? `T${other.startTime}:00` : 'T00:00:00'));
          const otherEnd = new Date(other.endDate + (other.endTime ? `T${other.endTime}:00` : 'T23:59:59'));

          if (start <= otherEnd && end >= otherStart) {
            throw new Error(`Activity "${activity.title}" conflicts with "${other.title}"`);
          }
        }
      }
    }

    const planId = uuidv4();
    const plan = {
      id: planId,
      title,
      ownerId: session.user.id,
    };

    // Insert into plans table
    await db.execute({
      sql: `
        INSERT INTO plans (id, title, ownerId)
        VALUES (?, ?, ?)
      `,
      args: [plan.id, plan.title, plan.ownerId],
    });

    // Insert activities into activities table
    const createdActivities: Activity[] = [];
    for (const activity of activitiesData) {
      const activityId = uuidv4();
      await db.execute({
        sql: `
          INSERT INTO activities (id, title, destination, startDate, endDate, startTime, endTime, activities, ownerId, planId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          activityId,
          activity.title,
          activity.destination,
          activity.startDate,
          activity.endDate,
          activity.startTime,
          activity.endTime,
          activity.activities,
          session.user.id,
          planId,
        ],
      });
      createdActivities.push({
        id: activityId,
        title: activity.title,
        destination: activity.destination,
        startDate: new Date(activity.startDate).toISOString(),
        endDate: new Date(activity.endDate).toISOString(),
        startTime: activity.startTime,
        endTime: activity.endTime,
        activities: activity.activities,
        ownerId: session.user.id,
        planId,
      });
    }

    // Share plan if sharedEmail is provided
    if (sharedEmail) {
      const sharedUserResult = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [sharedEmail],
      });
      const sharedUserRow = sharedUserResult.rows[0];
      const sharedUser = sharedUserRow ? {
        id: String(sharedUserRow.id)
      } as DBUser : undefined;
      if (sharedUser) {
        await db.execute({
          sql: `
            INSERT INTO plan_shares (planId, userId)
            VALUES (?, ?)
          `,
          args: [planId, sharedUser.id],
        });
      }
    }

    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      ownerId: plan.ownerId,
      activities: createdActivities,
    });
  } catch (err: unknown) {
    console.error('Create plan error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to create plan';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}