import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Database from 'better-sqlite3';
import ClientPlanDetail from './ClientPlanDetail';
import { redirect } from 'next/navigation';

// Adjusted to match Next.js App Router expectations
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params: paramsPromise}: PageProps) {
  // Await both promises
  const params = await paramsPromise;
  const { id } = params;

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const db = new Database('./database.db');
  let plan: DBPlan | undefined;
  let activities: DBActivity[] = [];
  let sharedUsers: DBUser[] = [];

  try {
    plan = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(id) as DBPlan | undefined;

    if (!plan) {
      redirect('/dashboard');
    }

    activities = db
      .prepare('SELECT * FROM activities WHERE planId = ?')
      .all(id) as DBActivity[];

    const sharedUserIds = db
      .prepare('SELECT userId FROM plan_shares WHERE planId = ?')
      .all(id) as { userId: string }[];

    if (sharedUserIds.length > 0) {
      const placeholders = sharedUserIds.map(() => '?').join(',');
      sharedUsers = db
        .prepare(`SELECT id, email, name FROM users WHERE id IN (${placeholders})`)
        .all(...sharedUserIds.map((u) => u.userId)) as DBUser[];
    }
  } catch (err) {
    console.error('Error fetching plan details:', err);
    redirect('/dashboard');
  } finally {
    db.close();
  }

  const isOwner = plan.ownerId === session.user.id;

  return (
    <ClientPlanDetail
      plan={plan}
      activities={activities}
      sharedUsers={sharedUsers}
      isOwner={isOwner}
    />
  );
}

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