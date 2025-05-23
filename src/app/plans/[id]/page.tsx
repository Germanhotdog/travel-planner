import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Database from 'better-sqlite3';
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

//PageProps
interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function PlanDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const db = new Database('./database.db');
  let plan: DBPlan | undefined;
  let activities: DBActivity[] = [];
  let sharedUsers: DBUser[] = [];
  let isOwner = false;

  try {
    // Fetch the plan
    plan = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(params.id) as DBPlan | undefined;

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Check if the user is the owner
    isOwner = plan.ownerId === session.user.id;

    // Fetch activities
    activities = db
      .prepare('SELECT * FROM activities WHERE planId = ?')
      .all(params.id) as DBActivity[];

    // Fetch shared users
    const shares = db
      .prepare('SELECT userId FROM plan_shares WHERE planId = ?')
      .all(params.id) as { userId: string }[];

    const sharedUserIds = shares.map((share) => share.userId);
    if (sharedUserIds.length > 0) {
      sharedUsers = db
        .prepare('SELECT * FROM users WHERE id IN (' + sharedUserIds.map(() => '?').join(',') + ')')
        .all(...sharedUserIds) as DBUser[];
    }

    // Check if the user has access (owner or shared)
    if (!isOwner && !sharedUserIds.includes(session.user.id)) {
      throw new Error('You do not have access to this plan');
    }
  } catch (err) {
    console.error('Plan detail error:', err);
    throw err;
  } finally {
    db.close();
  }

  return (
    <ClientPlanDetail
      plan={plan}
      activities={activities}
      sharedUsers={sharedUsers}
      isOwner={isOwner}
    />
  );
}