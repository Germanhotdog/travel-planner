'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { setPlans } from '@/lib/store/planSlice';
import { useSession } from 'next-auth/react';

interface Activity {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  activities: string;
}

export default function NewPlan() {
  const [title, setTitle] = useState('');
  const [sharedEmail, setSharedEmail] = useState('');
  const [activities, setActivities] = useState<Activity[]>([
    { title: '', destination: '', startDate: '', endDate: '', startTime: '', endTime: '', activities: '' },
  ]);
  const [error, setError] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session, status } = useSession();

  const addActivity = () => {
    setActivities([...activities, { title: '', destination: '', startDate: '', endDate: '', startTime: '', endTime: '', activities: '' }]);
  };

  const updateActivity = (index: number, field: keyof Activity, value: string) => {
    const newActivities = [...activities];
    newActivities[index] = { ...newActivities[index], [field]: value };
    setActivities(newActivities);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const normalizeTime = (time: string): string | null => {
    if (!time) return null;
    console.log('Normalizing time:', time); // Debug log
    const match = time.match(/(\d{1,2}):(\d{2})(\s*(上午|下午|AM|PM))?/i);
    if (!match) return time; // Assume HH:mm if no AM/PM
    const [, hours, minutes, , period] = match;
    let hourNum = parseInt(hours, 10);
    if (period) {
      period.toLowerCase();
      if ((period === '下午' || period === 'pm') && hourNum < 12) {
        hourNum += 12;
      } else if ((period === '上午' || period === 'am') && hourNum === 12) {
        hourNum = 0;
      }
    }
    return `${hourNum.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (status === 'loading') {
      setError('Session is loading...');
      return;
    }
    if (!session) {
      setError('Please log in to create a plan');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('sharedEmail', sharedEmail);
      const normalizedActivities = activities.map(activity => ({
        ...activity,
        startTime: normalizeTime(activity.startTime),
        endTime: normalizeTime(activity.endTime),
        activities: activity.activities || null,
      }));
      console.log('Submitting normalized activities:', normalizedActivities); // Debug log
      formData.append('activities', JSON.stringify(normalizedActivities));

      const response = await fetch('/api/plans', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create plan');
      }

      const newPlan = await response.json();
      const currentPlans = await dispatch(setPlans([])); // Get current state
      dispatch(setPlans([newPlan, ...(currentPlans.payload || [])]));
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create plan';
      setError(errorMessage);
      console.error('Create plan error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Create New Plan</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Plan Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Share with (Email)</label>
            <input
              type="email"
              value={sharedEmail}
              onChange={(e) => setSharedEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Activities</h2>
            {activities.map((activity, index) => (
              <div key={index} className="mb-4 p-4 border rounded">
                <div className="mb-2">
                  <label className="block text-gray-700">Activity Title</label>
                  <input
                    type="text"
                    value={activity.title}
                    onChange={(e) => updateActivity(index, 'title', e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700">Destination</label>
                  <input
                    type="text"
                    value={activity.destination}
                    onChange={(e) => updateActivity(index, 'destination', e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={activity.startDate}
                    onChange={(e) => updateActivity(index, 'startDate', e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700">Start Time (Optional)</label>
                  <input
                    type="time"
                    value={activity.startTime}
                    onChange={(e) => updateActivity(index, 'startTime', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={activity.endDate}
                    onChange={(e) => updateActivity(index, 'endDate', e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700">End Time (Optional)</label>
                  <input
                    type="time"
                    value={activity.endTime}
                    onChange={(e) => updateActivity(index, 'endTime', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700">Activities (Optional)</label>
                  <textarea
                    value={activity.activities}
                    onChange={(e) => updateActivity(index, 'activities', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                {activities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeActivity(index)}
                    className="text-red-500 hover:underline"
                  >
                    Remove Activity
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addActivity}
              className="text-blue-500 hover:underline"
            >
              Add Activity
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Create Plan
          </button>
        </form>
      </div>
    </div>
  );
}