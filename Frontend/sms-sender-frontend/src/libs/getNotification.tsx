'use server';

export default async function getNotifications(token: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/api/notifications`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error('Failed to fetch notifications');
  }

  return await response.json();
}