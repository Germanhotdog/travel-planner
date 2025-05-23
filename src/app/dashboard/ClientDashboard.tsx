'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPlans, Plan } from '@/lib/store/planSlice';
import { RootState } from '@/lib/store';
import Link from 'next/link';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { deletePlan } from '@/app/plans/new/actions';

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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome, {user.name || user.email}</h1>
          <p className="text-1xl font-bold">attention! please do not use Safari browser for better user experience</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        
        </div>
        <Link
          href="/plans/new"
          className="mb-6 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Plan
        </Link>
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
                  <Link
                    href={`/plans/${plan.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    View Details
                  </Link>
                  {plan.ownerId === user.id && (
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
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