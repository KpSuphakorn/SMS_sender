'use server';

export default async function markNotificationAsRead(
  notificationId: string,
  token: string
) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(
    `${BACKEND_URL}/api/notification/mark-read/${notificationId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error('Failed to mark notification as read');
  }

  return await response.json();
}