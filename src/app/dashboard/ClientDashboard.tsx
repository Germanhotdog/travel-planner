'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPlans, Plan } from '@/lib/store/planSlice';
import { RootState } from '@/lib/store';
import Link from 'next/link';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { deletePlan } from '@/lib/services/createPlanActions';
import { Button } from "@/components/ui/button"
import { LogOut,CirclePlus,Trash2,Share } from 'lucide-react';
import { saveAs } from 'file-saver';

interface ClientDashboardProps {
  plans: Plan[];
  user: Session['user'];
}

export default function ClientDashboard({ plans, user }: ClientDashboardProps) {
  const dispatch = useDispatch();
  const reduxPlans = useSelector((state: RootState) => state.plans.plans);
  const router = useRouter();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    dispatch(setPlans(plans));
  }, [dispatch, plans]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) {
      return;
    }

    try {
      await deletePlan(planId);
      dispatch(setPlans(reduxPlans.filter((plan) => plan.id !== planId)));
      setError('');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete plan');
    }
  };

  const handleExportToCSV = (plan: Plan) => {
    const headers = ['Plan Title', 'Activity Title', 'Destination', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Remark'];
    const rows = plan.activities.map(activity => [
      plan.title,
      activity.title,
      activity.destination,
      new Date(activity.startDate).toLocaleDateString(),
      activity.startTime || '',
      new Date(activity.endDate).toLocaleDateString(),
      activity.endTime || '',
      activity.activities || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(',')) // Wrap fields in quotes to handle commas
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${plan.title.replace(/[^a-zA-Z0-9]/g, '_')}_plan.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome, {user.name || user.email}</h1>
          <p className="text-sm ">attention! please do not use Safari browser for better user experience</p>
          <Button
            onClick={handleLogout}
            className="text-red-500 px-4 py-2 rounded hover:bg-red-600 hover:text-white"
            variant="secondary"
          >
            <LogOut/>
          </Button>
        </div>
        <Button asChild className="mb-6 mr-4 bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black transition-colors">
          <Link href="/plans/new">
            Create Plan<CirclePlus />
          </Link>
        </Button>

        <Button asChild className="mb-6 mr-4 bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black transition-colors">
          <Link href="/plan-with-ai">
            Create Plan with AI<CirclePlus />
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold mb-4">Your Travel Plans</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {reduxPlans.length === 0 ? (
          <p className="text-gray-600">No plans yet. Create one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reduxPlans.map((plan) => (
              <div key={plan.id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-xl font-bold">{plan.title}</h3>
                <div className="mt-2">
                  <strong>Activities:</strong>
                  {plan.activities.length === 0 ? (
                    <p>No activities</p>
                  ) : (
                    <ul className="list-disc pl-5">
                      {plan.activities.map((activity) => (
                        <li key={activity.id}>
                          <strong>{activity.title}</strong> - {activity.destination} (
                          {new Date(activity.startDate).toLocaleDateString()}
                          {activity.startTime && ` ${activity.startTime}`} to{' '}
                          {new Date(activity.endDate).toLocaleDateString()}
                          {activity.endTime && ` ${activity.endTime}`})
                          {activity.activities && (
                            <p className="text-gray-600">{activity.activities}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-2 flex space-x-2">
                  <Link href={`/plans/${plan.id}`} passHref>
                    <Button variant="secondary" asChild>
                      <a>View Details</a>
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    onClick={() => handleExportToCSV(plan)}
                  >
                    <Share/>CSV
                  </Button>
                  
                  {plan.ownerId === user.id && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2/>
                      </Button>
                      
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}