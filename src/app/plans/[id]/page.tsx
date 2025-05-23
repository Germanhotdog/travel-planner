import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { redirect } from 'next/navigation';
import Database from 'better-sqlite3';
import { notFound } from 'next/navigation';
import ClientPlanDetail from './ClientPlanDetail';

interface DBPlan {
  id: string;
  title: string;
  ownerId: string;
}

interface DBActivity {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  activities: string | null;
  ownerId: string;
  planId: string;
}

interface DBUser {
  id: string;
  email: string;
  name: string | null;
}

export default async function PlanDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const db = new Database('./database.db', { readonly: true });

  try {
    const plan = db
      .prepare(`SELECT p.* FROM plans p WHERE p.id = ?`)
      .get(params.id) as DBPlan | undefined;

    if (!plan) {
      notFound();
    }

    const isOwner = plan.ownerId === session.user.id;
    const isShared = db
      .prepare(`SELECT 1 FROM plan_shares ps WHERE ps.planId = ? AND ps.userId = ?`)
      .get(params.id, session.user.id);

    if (!isOwner && !isShared) {
      notFound();
    }

    const activities = db
      .prepare(`
        SELECT a.*
        FROM activities a
        WHERE a.planId = ?
        ORDER BY a.startDate ASC, a.startTime ASC, a.endDate ASC, a.endTime ASC
      `)
      .all(params.id) as DBActivity[];

    const sharedUsers = db
      .prepare(`
        SELECT u.id, u.email, u.name
        FROM plan_shares ps
        JOIN users u ON ps.userId = u.id
        WHERE ps.planId = ?
      `)
      .all(params.id) as DBUser[];

    return (
      <ClientPlanDetail
        plan={plan}
        activities={activities}
        sharedUsers={sharedUsers}
        isOwner={isOwner}
      />
    );
  } catch (err) {
    console.error('Fetch plan details error:', err);
    throw new Error('Failed to load plan details');
  } finally {
    db.close();
  }
}