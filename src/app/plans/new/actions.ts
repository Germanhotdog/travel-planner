'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Database from 'better-sqlite3';
import { redirect } from 'next/navigation';
import { Plan } from '@/lib/store/planSlice';
import { v4 as uuidv4 } from 'uuid';

// Define interface for SQLite user query
interface DBUser {
  id: string;
}

export async function createPlan(formData: FormData): Promise<Plan> {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const db = new Database('./database.db');

  try {
    // Verify user exists
    const user = db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(session.user.id) as DBUser | undefined;
    if (!user) {
      throw new Error('User not found in database');
    }

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

    console.log('Received activitiesData:', activitiesData); // Debug: Log raw activities data

    // Validate and normalize activity date-times
    for (const activity of activitiesData) {
      // Validate time format (HH:mm) or allow null
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (activity.startTime && !timeRegex.test(activity.startTime)) {
        // Fallback: Try parsing AM/PM formats
        const match = activity.startTime.match(/^(?:(\d{1,2}):(\d{2}))(?:\s*(上午|下午|AM|PM))?$/i);
        if (match) {
          const [, hours, minutes, period] = match;
          let hourNum = parseInt(hours, 10);
          if (period) {
            period.toLowerCase();
            if ((period === '下午' || period === 'pm') && hourNum < 12) {
              hourNum += 12;
            } else if ((period === '上午' || period === 'am') && hourNum === 12) {
              hourNum = 0;
            }
          }
          activity.startTime = `${hourNum.toString().padStart(2, '0')}:${minutes}`;
          console.log(`Parsed startTime for "${activity.title}": ${activity.startTime}`); // Debug
        } else {
          throw new Error(`Invalid startTime format for "${activity.title}": ${activity.startTime}. Expected HH:mm`);
        }
      }
      if (activity.endTime && !timeRegex.test(activity.endTime)) {
        const match = activity.endTime.match(/^(?:(\d{1,2}):(\d{2}))(?:\s*(上午|下午|AM|PM))?$/i);
        if (match) {
          const [, hours, minutes, period] = match;
          let hourNum = parseInt(hours, 10);
          if (period) {
            period.toLowerCase();
            if ((period === '下午' || period === 'pm') && hourNum < 12) {
              hourNum += 12;
            } else if ((period === '上午' || period === 'am') && hourNum === 12) {
              hourNum = 0;
            }
          }
          activity.endTime = `${hourNum.toString().padStart(2, '0')}:${minutes}`;
          console.log(`Parsed endTime for "${activity.title}": ${activity.endTime}`); // Debug
        } else {
          throw new Error(`Invalid endTime format for "${activity.title}": ${activity.endTime}. Expected HH:mm`);
        }
      }

      // Validate date format
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

    // Create plan
    db.prepare(`
      INSERT INTO plans (id, title, ownerId)
      VALUES (?, ?, ?)
    `).run(
      plan.id,
      plan.title,
      plan.ownerId
    );

    // Create activities
    const createdActivities = activitiesData.map((activity) => {
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

    // Share plan
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

    return {
      id: plan.id,
      title: plan.title,
      ownerId: plan.ownerId,
      activities: createdActivities,
    };
  } catch (err: unknown) {
    console.error('Create plan error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to create plan');
  } finally {
    db.close();
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const db = new Database('./database.db');

  try {
    const plan = db
      .prepare('SELECT ownerId FROM plans WHERE id = ?')
      .get(planId) as { ownerId: string } | undefined;

    if (!plan) {
      throw new Error('Plan not found');
    }

    if (plan.ownerId !== session.user.id) {
      throw new Error('Only the plan owner can delete this plan');
    }

    db.prepare('DELETE FROM plan_shares WHERE planId = ?').run(planId);
    db.prepare('DELETE FROM activities WHERE planId = ?').run(planId);
    db.prepare('DELETE FROM plans WHERE id = ?').run(planId);
  } catch (err) {
    console.error('Delete plan error:', err);
    throw err;
  } finally {
    db.close();
  }
}