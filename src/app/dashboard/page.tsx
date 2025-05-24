import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { redirect } from 'next/navigation';
import ClientDashboard from './ClientDashboard';
import { Plan } from '@/lib/store/planSlice';
import { createClient, Row } from '@libsql/client';

// Define a serializable version of Activity for Client Component
interface SerializableActivity {
  id: string;
  title: string;
  destination: string;
  startDate: string; // Ensure this is a string, not a Date
  endDate: string;   // Ensure this is a string, not a Date
  startTime: string | null;
  endTime: string | null;
  activities: string | null;
  ownerId: string;
  planId: string;
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
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
    const plans = plansResult.rows as (Row & { id: string; title: string; ownerId: string })[];

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
      const activities = activitiesResult.rows as (Row & SerializableActivity)[];

      // Ensure startDate and endDate are strings (they should already be from the DB, but this is for safety)
      const serializableActivities = activities.map(activity => ({
        ...activity,
        startDate: activity.startDate, // Already a string from the DB
        endDate: activity.endDate,     // Already a string from the DB
      }));

      plansWithActivities.push({
        id: plan.id,
        title: plan.title,
        ownerId: plan.ownerId,
        activities: serializableActivities,
      });
    }

    // Extract serializable properties from session.user
    const user = {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    };

    return <ClientDashboard plans={plansWithActivities} user={user} />;
  } catch (err) {
    console.error('Fetch plans error:', err);
    throw new Error('Failed to load dashboard');
  }
}