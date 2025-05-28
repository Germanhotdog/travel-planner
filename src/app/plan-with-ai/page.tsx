'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DoorOpen} from "lucide-react" 
import axios from 'axios';
import { createPlan} from '../plans/new/actions';
import { useRouter } from 'next/navigation';

interface Activity {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  activities?: string;
}

export default function PlanWithAI() {
  const [planName, setPlanName] = useState('');
  const [sharedEmail, setSharedEmail] = useState('');
  const [countryCity, setCountryCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError('');
    setActivities([]);

    try {
      const prompt = `Generate a travel itinerary as a JSON array of activities for a trip to ${countryCity}. The JSON must strictly follow this schema for each activity:
       {
        "title": "string",
        "destination": "string",
        "startDate": "string" (ISO format, e.g., "2025-05-28"),
        "endDate": "string" (ISO format, e.g., "2025-05-28"),
        "startTime": "string | null" (e.g., "14:30" or null),
        "endTime": "string | null" (e.g., "15:30" or null),
        "activities": "string | null" (e.g., "Visit Eiffel Tower" or null)
        }
      Ensure the JSON is valid and the dates align with the provided range.`;

      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      console.log(content)
      if (jsonMatch && jsonMatch[1]) {
        const generatedActivities = JSON.parse(jsonMatch[1]);
        setActivities(Array.isArray(generatedActivities) ? generatedActivities : []);
      } else {
        throw new Error('Invalid JSON response from DeepSeek API');
      }
    } catch (err) {
      setError('Failed to generate plan. Please check your input or API key.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const normalizeTime = (time: string | undefined): string | null => {
    if (!time || time.trim() === '') {
      console.log('normalizeTime: Empty or undefined time input, returning null');
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
  
    return `${hourNum.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleCreatePlan = async () => {
    if (!planName || !activities.length) {
      setError('Please provide a plan name and generate activities first.');
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('title', planName);
      formData.append('sharedEmail', sharedEmail || '');
      formData.append('ownerId', 'current-user-id'); // Replace with actual user ID from session
  
      const activitiesToSubmit = activities.map(activity => ({
        ...activity,
        startTime: normalizeTime(activity.startTime),
        endTime: normalizeTime(activity.endTime),
        activities: activity.activities || null,
      }));
      console.log('Activities after normalization:', activitiesToSubmit);
      formData.append('activities', JSON.stringify(activitiesToSubmit));
  
      await createPlan(formData);
      alert('Plan created successfully!');
      // Redirect or clear form as needed
      setPlanName('');
      setSharedEmail('');
      setCountryCity('');
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setActivities([]);
    } catch (err) {
      setError('Failed to create plan.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Plan With AI</h1>

        <Button
          onClick={() => router.push('/dashboard')}
          className="text-black-500 px-4 py-2 mb-4 rounded hover:bg-black hover:text-white"
          variant="secondary"
        >
          <DoorOpen/>
        </Button>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        {/* Plan Details */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="planName">Plan Name</Label>
            <Input
              id="planName"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Enter plan name"
              required
            />
          </div>
          <div>
            <Label htmlFor="sharedEmail">Shared Email (Optional)</Label>
            <Input
              id="sharedEmail"
              value={sharedEmail}
              onChange={(e) => setSharedEmail(e.target.value)}
              placeholder="Enter email to share with"
            />
          </div>
        </div>

        {/* Activity Parameters */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="countryCity">Country/City</Label>
            <Input
              id="countryCity"
              value={countryCity}
              onChange={(e) => setCountryCity(e.target.value)}
              placeholder="e.g., Paris, France"
              required
            />
          </div>
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="startTime">Start Time (Optional)</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endTime">End Time (Optional)</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <Button onClick={handleGeneratePlan} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Plan'}
          </Button>
        </div>

        {/* Display Activities */}
        {activities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Suggested Activities</h2>
            <ul className="list-disc pl-5 space-y-2">
              {activities.map((activity, index) => (
                <li key={index}>
                  {activity.title} - {activity.destination} ({activity.startDate} to {activity.endDate})
                  {activity.startTime && `, ${activity.startTime}`}
                  {activity.endTime && ` to ${activity.endTime}`}
                  {activity.activities && <p className="text-gray-600 ml-4">{activity.activities}</p>}
                </li>
              ))}
            </ul>
            <Button onClick={handleCreatePlan} className="mt-4">
              Add Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}