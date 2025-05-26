'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updatePlanTitle, updateActivity, createActivity, deleteActivity } from './actions';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button"
import { Pencil,Trash2,DoorOpen } from "lucide-react" 

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

interface ClientPlanDetailProps {
  plan: DBPlan;
  activities: DBActivity[];
  sharedUsers: DBUser[];
  isOwner: boolean;
}

export default function ClientPlanDetail({ plan, activities: initialActivities, sharedUsers, isOwner }: ClientPlanDetailProps) {
  const [title, setTitle] = useState(plan.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activities, setActivities] = useState([...initialActivities].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    if (dateA !== dateB) return dateA - dateB;
    const timeA = a.startTime ? a.startTime : '23:59';
    const timeB = b.startTime ? b.startTime : '23:59';
    return timeA.localeCompare(timeB);
  }));
  const [editingActivity, setEditingActivity] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [newActivity, setNewActivity] = useState<Partial<DBActivity>>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    activities: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(initialActivities.length > 0 ? new Date(initialActivities[0].startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialActivities.length > 0 ? new Date(initialActivities[0].endDate) : undefined);
  const [editStartDate, setEditStartDate] = useState<{ [key: string]: Date | undefined }>({});
  const [editEndDate, setEditEndDate] = useState<{ [key: string]: Date | undefined }>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError('Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.');
      return;
    }

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => setMapError('Failed to load Google Maps API.');
      document.head.appendChild(script);
    };

    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        const map = new google.maps.Map(mapRef.current, {
          zoom: 2,
          center: { lat: 0, lng: 0 },
        });

        const geocoder = new google.maps.Geocoder();
        const bounds = new google.maps.LatLngBounds();
        const markers: google.maps.Marker[] = [];

        for (let i = 0; i < activities.length; i++) {
          const activity = activities[i];
          const destination = activity.destination;

          const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
            geocoder.geocode({ address: destination }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                resolve(results[0]);
              } else {
                console.error(`Geocoding failed for ${destination}: ${status}`);
                resolve(null);
              }
            });
          });

          if (result) {
            const position = result.geometry.location;
            const marker = new google.maps.Marker({
              position,
              map,
              label: `${i + 1}`,
              title: `${activity.title} - ${destination}`,
            });

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div>
                  <strong>${activity.title}</strong><br/>
                  ${destination}<br/>
                  ${new Date(activity.startDate).toLocaleDateString()}
                  ${activity.startTime || ''} to 
                  ${new Date(activity.endDate).toLocaleDateString()}
                  ${activity.endTime || ''}
                </div>
              `,
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

            markers.push(marker);
            bounds.extend(position);
          }
        }

        if (markers.length > 0) {
          map.fitBounds(bounds);
        } else {
          setMapError('No destinations could be geocoded.');
        }
      } catch (err) {
        setMapError('Error initializing map: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    loadGoogleMapsScript();

    return () => {
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((script) => script.remove());
    };
  }, [activities, GOOGLE_MAPS_API_KEY]);

  const handleUpdateTitle = async () => {
    if (!isOwner) return;
    try {
      await updatePlanTitle(plan.id, title);
      setIsEditingTitle(false);
      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update plan title';
      setError(errorMessage);
    }
  };

  const handleUpdateActivityField = async (activityId: string, field: keyof DBActivity, value: string) => {
    if (!isOwner) return;
    try {
      const updatedActivity = await updateActivity(activityId, { [field]: value || null });
      setActivities((prev) =>
        [...prev].sort((a, b) => {
          const dateA = new Date(a.startDate).getTime();
          const dateB = new Date(b.startDate).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const timeA = a.startTime ? a.startTime : '23:59';
          const timeB = b.startTime ? b.startTime : '23:59';
          return timeA.localeCompare(timeB);
        }).map((activity) => activity.id === activityId ? updatedActivity : activity)
      );
      setEditingActivity((prev) => {
        const newState = { ...prev };
        delete newState[`${activityId}-${field}`];
        return newState;
      });
      setError('');
      if (field === 'startDate' && editStartDate[activityId]) setEditStartDate((prev) => ({ ...prev, [activityId]: undefined }));
      if (field === 'endDate' && editEndDate[activityId]) setEditEndDate((prev) => ({ ...prev, [activityId]: undefined }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update activity ${field}`;
      setError(errorMessage);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setError('Only the plan owner can add activities');
      return;
    }

    try {
      const activityData = {
        title: newActivity.title || '',
        destination: newActivity.destination || '',
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : '',
        startTime: newActivity.startTime || null,
        endTime: newActivity.endTime || null,
        activities: newActivity.activities || null,
      };

      const createdActivity = await createActivity(plan.id, activityData);
      setActivities((prev) => [...prev, createdActivity].sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.startTime ? a.startTime : '23:59';
        const timeB = b.startTime ? b.startTime : '23:59';
        return timeA.localeCompare(timeB);
      }));
      setNewActivity({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        activities: '',
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setShowAddForm(false);
      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add activity';
      setError(errorMessage);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!isOwner) {
      setError('Only the plan owner can delete activities');
      return;
    }

    try {
      await deleteActivity(activityId);
      setActivities((prev) =>
        [...prev].filter((activity) => activity.id !== activityId).sort((a, b) => {
          const dateA = new Date(a.startDate).getTime();
          const dateB = new Date(b.startDate).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const timeA = a.startTime ? a.startTime : '23:59';
          const timeB = b.startTime ? b.startTime : '23:59';
          return timeA.localeCompare(timeB);
        })
      );
      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete activity';
      setError(errorMessage);
    }
  };

  const toggleEdit = (field: string) => {
    setEditingActivity((prev) => ({
      ...prev,
      [field]: prev[field] ? '' : field,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center space-x-2 mb-6">
          {isEditingTitle ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl font-bold border rounded p-1"
              />
              <button
                onClick={handleUpdateTitle}
                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingTitle(false);
                  setTitle(plan.title);
                }}
                className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{title}</h1>
              {isOwner && (
                <Button
                  onClick={() => setIsEditingTitle(true)}
                  className="hover:underline text-sm"
                  variant="secondary" size="sm"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="space-y-4">
          <p><strong>Owner:</strong> {isOwner ? 'You' : plan.ownerId}</p>
          <div>
            <strong>Destinations Map:</strong>
            {mapError ? (
              <p className="text-red-500">{mapError}</p>
            ) : (
              <div
                ref={mapRef}
                className="w-full h-96 border rounded"
              />
            )}
          </div>
          <div>
            <strong>Activities:</strong>
            {activities.length === 0 ? (
              <p>No activities</p>
            ) : (
              <ul className="list-disc pl-5">
                {activities.map((activity) => (
                  <li key={activity.id} className="mb-2">
                    <div className="flex flex-wrap items-center space-x-2">
                      {editingActivity[`${activity.id}-title`] ? (
                        <>
                          <input
                            type="text"
                            defaultValue={activity.title}
                            onBlur={(e) => handleUpdateActivityField(activity.id, 'title', e.target.value)}
                            className="border rounded p-1"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleEdit(`${activity.id}-title`)}
                            className="text-gray-500 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <strong>{activity.title}</strong>
                          {isOwner && (
                            <Button
                              onClick={() => toggleEdit(`${activity.id}-title`)}
                              className="hover:underline text-sm"
                              variant="secondary" size="sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <span>-</span>
                      {editingActivity[`${activity.id}-destination`] ? (
                        <>
                          <input
                            type="text"
                            defaultValue={activity.destination}
                            onBlur={(e) => handleUpdateActivityField(activity.id, 'destination', e.target.value)}
                            className="border rounded p-1"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleEdit(`${activity.id}-destination`)}
                            className="text-gray-500 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span>{activity.destination}</span>
                          {isOwner && (
                            <Button
                              onClick={() => toggleEdit(`${activity.id}-destination`)}
                              className="hover:underline text-sm"
                              variant="secondary" size="sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <span>(</span>
                      {editingActivity[`${activity.id}-startDate`] ? (
                        <div className="relative">
                          <input
                            type="date"
                            defaultValue={activity.startDate}
                            onBlur={(e) => handleUpdateActivityField(activity.id, 'startDate', e.target.value)}
                            className="border rounded p-1"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleEdit(`${activity.id}-startDate`)}
                            className="text-gray-500 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{new Date(activity.startDate).toLocaleDateString()}</span>
                          {isOwner && (
                            <Button
                              onClick={() => toggleEdit(`${activity.id}-startDate`)}
                              variant="secondary" size="sm"
                              className="hover:underline text-sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {editingActivity[`${activity.id}-startTime`] ? (
                        <>
                          <input
                            type="time"
                            defaultValue={activity.startTime || ''}
                            onBlur={(e) => handleUpdateActivityField(activity.id, 'startTime', e.target.value)}
                            className="border rounded p-1"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleEdit(`${activity.id}-startTime`)}
                            className="text-gray-500 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {activity.startTime && <span>{activity.startTime}</span>}
                          {isOwner && (
                            <Button
                              onClick={() => toggleEdit(`${activity.id}-startTime`)}
                              className="hover:underline text-sm"
                              variant="secondary" size="sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <span>to</span>
                      {editingActivity[`${activity.id}-endDate`] ? (
                        <div className="relative">
                          <input
                            type="date"
                            defaultValue={activity.endDate}
                            onBlur={(e) => handleUpdateActivityField(activity.id, 'endDate', e.target.value)}
                            className="border rounded p-1"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleEdit(`${activity.id}-endDate`)}
                            className="text-gray-500 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{new Date(activity.endDate).toLocaleDateString()}</span>
                          {isOwner && (
                            <Button
                              onClick={() => toggleEdit(`${activity.id}-endDate`)}
                              className="hover:underline text-sm"
                              variant="secondary" size="sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {editingActivity[`${activity.id}-endTime`] ? (
                        <>
                          <input
                            type="time"
                            defaultValue={activity.endTime || ''}
                            onBlur={(e) => handleUpdateActivityField(activity.id, 'endTime', e.target.value)}
                            className="border rounded p-1"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleEdit(`${activity.id}-endTime`)}
                            className="text-gray-500 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {activity.endTime && <span>{activity.endTime}</span>}
                          {isOwner && (
                            <Button
                              onClick={() => toggleEdit(`${activity.id}-endTime`)}
                              className="hover:underline text-sm"
                              variant="secondary" size="sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <span>)</span>
                      {isOwner && (
                        <Button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="text-red-500 hover:underline text-sm"
                          variant="secondary" size="sm"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      )}
                    </div>
                    {editingActivity[`${activity.id}-activities`] ? (
                      <div className="mt-1">
                        <textarea
                          defaultValue={activity.activities || ''}
                          onBlur={(e) => handleUpdateActivityField(activity.id, 'activities', e.target.value)}
                          className="border rounded p-1 w-full text-gray-600"
                          autoFocus
                        />
                        <button
                          onClick={() => toggleEdit(`${activity.id}-activities`)}
                          className="text-gray-500 hover:underline text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {activity.activities && (
                          <p className="text-gray-600">{activity.activities}</p>
                        )}
                        {isOwner && (
                          <Button
                            onClick={() => toggleEdit(`${activity.id}-activities`)}
                            className="hover:underline text-sm"
                            variant="secondary" size="sm"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isOwner && (
              <>
                {!showAddForm && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    
                  >
                    Add Activity
                  </Button>
                )}
                {showAddForm && (
                  <div className="mt-4 p-4 border rounded">
                    <h3 className="text-lg font-semibold mb-2">Add New Activity</h3>
                    <form onSubmit={handleAddActivity} className="space-y-2">
                      <div>
                        <label className="block text-gray-700">Title</label>
                        <input
                          type="text"
                          value={newActivity.title || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                          className="w-full p-1 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700">Destination</label>
                        <input
                          type="text"
                          value={newActivity.destination || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, destination: e.target.value })}
                          className="w-full p-1 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700">Start Date</label>
                        <input
                          type="date"
                          value={newActivity.startDate || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, startDate: e.target.value })}
                          className="w-full p-1 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700">Start Time (Optional)</label>
                        <input
                          type="time"
                          value={newActivity.startTime || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700">End Date</label>
                        <input
                          type="date"
                          value={newActivity.endDate || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, endDate: e.target.value })}
                          className="w-full p-1 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700">End Time (Optional)</label>
                        <input
                          type="time"
                          value={newActivity.endTime || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, endTime: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700">Activities (Optional)</label>
                        <textarea
                          value={newActivity.activities || ''}
                          onChange={(e) => setNewActivity({ ...newActivity, activities: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="submit"
                          
                        >
                          Add Activity
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setNewActivity({
                              title: '',
                              destination: '',
                              startDate: '',
                              endDate: '',
                              startTime: '',
                              endTime: '',
                              activities: '',
                            });
                            setStartDate(undefined);
                            setEndDate(undefined);
                          }}
                          className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <strong>Shared With:</strong>
            {sharedUsers.length === 0 ? (
              <p>No users shared</p>
            ) : (
              <ul className="list-disc pl-5">
                {sharedUsers.map((user) => (
                  <li key={user.id}>
                    {user.name || user.email} ({user.email})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button
          onClick={() => router.push('/dashboard')}
          variant="secondary"
        >
          <DoorOpen/>Back to Dashboard
        </Button>
      </div>
    </div>
  );
}