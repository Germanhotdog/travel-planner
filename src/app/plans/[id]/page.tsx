import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import ClientPlanDetail from './ClientPlanDetail';
import { redirect } from 'next/navigation';
import { createClient, Row } from '@libsql/client';

// Adjusted to match Next.js App Router expectations
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params: paramsPromise }: PageProps) {
  // Await both promises
  const params = await paramsPromise;
  const { id } = params;

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  let plan: DBPlan | undefined;
  let activities: DBActivity[] = [];
  let sharedUsers: DBUser[] = [];

  try {
    const planResult = await db.execute({
      sql: 'SELECT * FROM plans WHERE id = ?',
      args: [id],
    });
    plan = planResult.rows[0] as Row & DBPlan | undefined;

    if (!plan) {
      redirect('/dashboard');
    }

    const activitiesResult = await db.execute({
      sql: 'SELECT * FROM activities WHERE planId = ?',
      args: [id],
    });
    activities = activitiesResult.rows as (Row & DBActivity)[];

    const sharedUserIdsResult = await db.execute({
      sql: 'SELECT userId FROM plan_shares WHERE planId = ?',
      args: [id],
    });
    const sharedUserIds = sharedUserIdsResult.rows as (Row & { userId: string })[];

    if (sharedUserIds.length > 0) {
      const placeholders = sharedUserIds.map(() => '?').join(',');
      const sharedUsersResult = await db.execute({
        sql: `SELECT id, email, name FROM users WHERE id IN (${placeholders})`,
        args: sharedUserIds.map((u) => u.userId),
      });
      sharedUsers = sharedUsersResult.rows as (Row & DBUser)[];
    }
  } catch (err) {
    console.error('Error fetching plan details:', err);
    redirect('/dashboard');
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