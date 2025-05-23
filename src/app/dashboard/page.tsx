import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { redirect } from 'next/navigation';
import Database from 'better-sqlite3';
import ClientDashboard from './ClientDashboard';
import { Plan, Activity } from '@/lib/store/planSlice';
import path from 'path';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const dbPath = path.resolve(process.cwd(), 'database.db');
  const db = new Database(dbPath);

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

    return <ClientDashboard plans={plansWithActivities} user={session.user} />;
  } catch (err) {
    console.error('Fetch plans error:', err);
    throw new Error('Failed to load dashboard');
  } finally {
    db.close();
  }
}