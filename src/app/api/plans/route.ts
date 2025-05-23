import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';
import { Plan, Activity } from '@/lib/store/planSlice';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = new Database('./database.db', { readonly: true });

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