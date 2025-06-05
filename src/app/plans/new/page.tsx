'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlan } from '@/lib/services/createPlanActions';
import { Button } from "@/components/ui/button"
import { CirclePlus } from 'lucide-react';

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
  const [activityDates, setActivityDates] = useState<(Date | undefined)[][]>(
    [[undefined, undefined]] // [startDate, endDate] for each activity
  );
  const [error, setError] = useState('');
  const router = useRouter();

  const addActivity = () => {
    setActivities([...activities, { title: '', destination: '', startDate: '', endDate: '', startTime: '', endTime: '', activities: '' }]);
    setActivityDates([...activityDates, [undefined, undefined]]);
  };

  const updateActivity = (index: number, field: keyof Activity, value: string) => {
    const newActivities = [...activities];
    newActivities[index] = { ...newActivities[index], [field]: value };
    setActivities(newActivities);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
    setActivityDates(activityDates.filter((_, i) => i !== index));
  };

  const normalizeTime = (time: string): string | null => {
    if (!time || time.trim() === '') {
      console.log('normalizeTime: Empty time input, returning null');
      return null;
    }

    const match = time.match(/^(?:(\d{1,2}):(\d{2}))(?:\s*(上午|下午|AM|PM))?$/i);
    if (!match) {
      console.log('normalizeTime: Invalid time format, input:', time);
      return time; // Let server handle validation
    }

    const [, hours, minutes, period] = match;
    let hourNum = parseInt(hours, 10);

    if (period) {
      const lowerPeriod = period.toLowerCase();
      if ((lowerPeriod === '下午' || lowerPeriod === 'pm') && hourNum < 12) {
        hourNum += 12;
      } else if ((lowerPeriod === '上午' || lowerPeriod === 'am') && hourNum === 12) {
        hourNum = 0;
      }
    }

    const normalized = `${hourNum.toString().padStart(2, '0')}:${minutes}`;
    console.log('normalizeTime: Input:', time, 'Normalized:', normalized);
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Submitting activities:', activities);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('sharedEmail', sharedEmail);
      const activitiesToSubmit = activities.map(activity => ({
        ...activity,
        startTime: normalizeTime(activity.startTime),
        endTime: normalizeTime(activity.endTime),
        activities: activity.activities || null,
      }));
      console.log('Activities after normalization:', activitiesToSubmit);
      formData.append('activities', JSON.stringify(activitiesToSubmit));

      await createPlan(formData);
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
                  <label className="block text-gray-700">Remarks (Optional)</label>
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
            <Button
              type="button"
              onClick={addActivity}
              variant="ghost"
            >
              <CirclePlus/>
            </Button>
          </div>
          <Button
            type="submit"
            className="w-full"
          >
            Create Plan
          </Button>
        </form>
      </div>
    </div>
  );
}