'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';
import { Plan, Activity } from '@/lib/store/planSlice';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Define interface for SQLite user query
interface DBUser {
  id: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbPath = path.resolve(process.cwd(), 'database.db');
  const db = new Database(dbPath, {readonly:true});

  try {
    const plans = db
      .prepare(`
        SELECT p.*
        FROM plans p
        LEFT JOIN plan_shares ps ON p.id = ps.planId
        WHERE p.ownerId = ? OR ps.userId = ?
        GROUP BY p.id
      `)
      .all(session.user.id, session.user.id) as {
        id: string;
        title: string;
        ownerId: string;
      }[];

    const plansWithActivities: Plan[] = plans.map((plan) => {
      const activities = db
        .prepare(`
          SELECT a.*
          FROM activities a
          WHERE a.planId = ?
          ORDER BY a.startDate ASC, a.startTime ASC, a.endDate ASC, a.endTime ASC
        `)
        .all(plan.id) as Activity[];

      return {
        id: plan.id,
        title: plan.title,
        ownerId: plan.ownerId,
        activities,
      };
    });

    return NextResponse.json(plansWithActivities);
  } catch (err) {
    console.error('Fetch plans error:', err);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = new Database('./database.db');

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
    db.prepare(`
      INSERT INTO plans (id, title, ownerId)
      VALUES (?, ?, ?)
    `).run(
      plan.id,
      plan.title,
      plan.ownerId
    );

    // Insert activities into activities table
    const createdActivities: Activity[] = activitiesData.map((activity) => {
      const activityId = uuidv4();
      db.prepare(`
        INSERT INTO activities (id, title, destination, startDate, endDate, startTime, endTime, activities, ownerId, planId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        activityId,
        activity.title,
        activity.destination,
        activity.startDate,
        activity.endDate,
        activity.startTime,
        activity.endTime,
        activity.activities,
        session.user.id,
        planId
      );
      return {
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
      };
    });

    // Share plan if sharedEmail is provided
    if (sharedEmail) {
      const sharedUser = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(sharedEmail) as DBUser | undefined;
      if (sharedUser) {
        db.prepare(`
          INSERT INTO plan_shares (planId, userId)
          VALUES (?, ?)
        `).run(planId, sharedUser.id);
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
  } finally {
    db.close();
  }
}