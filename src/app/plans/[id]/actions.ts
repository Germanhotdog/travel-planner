'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Database from 'better-sqlite3';
import { Activity } from '@/lib/store/planSlice';
import { v4 as uuidv4 } from 'uuid';

//more comment
interface DBPlan {
  id: string;
  title: string;
  ownerId: string;
}


export async function updatePlanTitle(planId: string, newTitle: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const db = new Database('./database.db');

  try {
    const plan = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(planId) as DBPlan | undefined;

    if (!plan) {
      throw new Error('Plan not found');
    }

    if (plan.ownerId !== session.user.id) {
      throw new Error('Only the plan owner can edit this plan');
    }

    if (!newTitle || newTitle.trim() === '') {
      throw new Error('Plan title cannot be empty');
    }

    db.prepare('UPDATE plans SET title = ? WHERE id = ?').run(newTitle.trim(), planId);
  } catch (err) {
    console.error('Update plan title error:', err);
    throw err;
  } finally {
    db.close();
  }
}

//update activity in the plan
export async function updateActivity(activityId: string, updatedActivity: Partial<Activity>): Promise<Activity> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const db = new Database('./database.db');

  try {
    const activity = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(activityId) as Activity | undefined;

    if (!activity) {
      throw new Error('Activity not found');
    }

    const plan = db
      .prepare('SELECT ownerId FROM plans WHERE id = ?')
      .get(activity.planId) as DBPlan | undefined;

    if (!plan || plan.ownerId !== session.user.id) {
      throw new Error('Only the plan owner can edit activities');
    }

    const updates: Partial<Activity> = {};
    if (updatedActivity.title) updates.title = updatedActivity.title.trim();
    if (updatedActivity.destination) updates.destination = updatedActivity.destination.trim();
    if (updatedActivity.startDate) updates.startDate = updatedActivity.startDate;
    if (updatedActivity.endDate) updates.endDate = updatedActivity.endDate;
    if (updatedActivity.startTime !== undefined) updates.startTime = updatedActivity.startTime;
    if (updatedActivity.endTime !== undefined) updates.endTime = updatedActivity.endTime;
    if (updatedActivity.activities !== undefined) updates.activities = updatedActivity.activities;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (updates.startTime && !timeRegex.test(updates.startTime)) {
      throw new Error(`Invalid startTime format: ${updates.startTime}. Expected HH:mm`);
    }
    if (updates.endTime && !timeRegex.test(updates.endTime)) {
      throw new Error(`Invalid endTime format: ${updates.endTime}. Expected HH:mm`);
    }

    // Validate dates
    if (updates.startDate && isNaN(Date.parse(updates.startDate))) {
      throw new Error(`Invalid startDate: ${updates.startDate}`);
    }
    if (updates.endDate && isNaN(Date.parse(updates.endDate))) {
      throw new Error(`Invalid endDate: ${updates.endDate}`);
    }

    // Check date/time logic and conflicts
    const newStartDate = updates.startDate || activity.startDate;
    const newEndDate = updates.endDate || activity.endDate;
    const newStartTime = updates.startTime !== undefined ? updates.startTime : activity.startTime;
    const newEndTime = updates.endTime !== undefined ? updates.endTime : activity.endTime;

    const start = new Date(newStartDate + (newStartTime ? `T${newStartTime}:00` : 'T00:00:00'));
    const end = new Date(newEndDate + (newEndTime ? `T${newEndTime}:00` : 'T23:59:59'));

    if (start > end) {
      throw new Error(`Invalid dates: start (${start.toISOString()}) must be before end (${end.toISOString()})`);
    }

    // Check for conflicts with other activities in the same plan
    const otherActivities = db
      .prepare('SELECT * FROM activities WHERE planId = ? AND id != ?')
      .all(activity.planId, activityId) as Activity[];

    for (const other of otherActivities) {
      const otherStart = new Date(other.startDate + (other.startTime ? `T${other.startTime}:00` : 'T00:00:00'));
      const otherEnd = new Date(other.endDate + (other.endTime ? `T${other.endTime}:00` : 'T23:59:59'));

      if (start <= otherEnd && end >= otherStart) {
        throw new Error(`Updated activity conflicts with "${other.title}"`);
      }
    }

    // Update the activity
    db.prepare(`
      UPDATE activities
      SET title = ?, destination = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?, activities = ?
      WHERE id = ?
    `).run(
      updates.title || activity.title,
      updates.destination || activity.destination,
      updates.startDate || activity.startDate,
      updates.endDate || activity.endDate,
      updates.startTime !== undefined ? updates.startTime : activity.startTime,
      updates.endTime !== undefined ? updates.endTime : activity.endTime,
      updates.activities !== undefined ? updates.activities : activity.activities,
      activityId
    );

    const updated = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(activityId) as Activity;

    return updated;
  } catch (err) {
    console.error('Update activity error:', err);
    throw err;
  } finally {
    db.close();
  }
}

export async function createActivity(planId: string, activityData: Omit<Activity, 'id' | 'ownerId' | 'planId'>): Promise<Activity> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const db = new Database('./database.db');

  try {
    const plan = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(planId) as DBPlan | undefined;

    if (!plan) {
      throw new Error('Plan not found');
    }

    if (plan.ownerId !== session.user.id) {
      throw new Error('Only the plan owner can add activities');
    }

    // Validate inputs
    if (!activityData.title || !activityData.title.trim()) {
      throw new Error('Activity title is required');
    }
    if (!activityData.destination || !activityData.destination.trim()) {
      throw new Error('Destination is required');
    }
    if (isNaN(Date.parse(activityData.startDate))) {
      throw new Error('Invalid start date');
    }
    if (isNaN(Date.parse(activityData.endDate))) {
      throw new Error('Invalid end date');
    }
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (activityData.startTime && !timeRegex.test(activityData.startTime)) {
      throw new Error(`Invalid startTime format: ${activityData.startTime}. Expected HH:mm`);
    }
    if (activityData.endTime && !timeRegex.test(activityData.endTime)) {
      throw new Error(`Invalid endTime format: ${activityData.endTime}. Expected HH:mm`);
    }

    // Check date/time logic
    const start = new Date(activityData.startDate + (activityData.startTime ? `T${activityData.startTime}:00` : 'T00:00:00'));
    const end = new Date(activityData.endDate + (activityData.endTime ? `T${activityData.endTime}:00` : 'T23:59:59'));

    if (start > end) {
      throw new Error(`Invalid dates: start (${start.toISOString()}) must be before end (${end.toISOString()})`);
    }

    // Check for conflicts with existing activities
    const existingActivities = db
      .prepare('SELECT * FROM activities WHERE planId = ?')
      .all(planId) as Activity[];

    for (const existing of existingActivities) {
      const existingStart = new Date(existing.startDate + (existing.startTime ? `T${existing.startTime}:00` : 'T00:00:00'));
      const existingEnd = new Date(existing.endDate + (existing.endTime ? `T${existing.endTime}:00` : 'T23:59:59'));

      if (start <= existingEnd && end >= existingStart) {
        throw new Error(`New activity conflicts with "${existing.title}"`);
      }
    }

    // Insert new activity
    const activityId = uuidv4();
    db.prepare(`
      INSERT INTO activities (id, title, destination, startDate, endDate, startTime, endTime, activities, ownerId, planId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      activityId,
      activityData.title.trim(),
      activityData.destination.trim(),
      activityData.startDate,
      activityData.endDate,
      activityData.startTime || null,
      activityData.endTime || null,
      activityData.activities || null,
      session.user.id,
      planId
    );

    // Fetch the created activity
    const createdActivity = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(activityId) as Activity;

    return createdActivity;
  } catch (err) {
    console.error('Create activity error:', err);
    throw err;
  } finally {
    db.close();
  }
}

export async function deleteActivity(activityId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const db = new Database('./database.db');

  try {
    const activity = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(activityId) as Activity | undefined;

    if (!activity) {
      throw new Error('Activity not found');
    }

    const plan = db
      .prepare('SELECT ownerId FROM plans WHERE id = ?')
      .get(activity.planId) as DBPlan | undefined;

    if (!plan || plan.ownerId !== session.user.id) {
      throw new Error('Only the plan owner can delete activities');
    }

    db.prepare('DELETE FROM activities WHERE id = ?').run(activityId);
  } catch (err) {
    console.error('Delete activity error:', err);
    throw err;
  } finally {
    db.close();
  }
}