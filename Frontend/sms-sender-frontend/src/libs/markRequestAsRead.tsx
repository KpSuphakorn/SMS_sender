// libs/markRequestAsRead.ts
'use server';

export default async function markRequestAsRead(
  requestId: string,
  token: string
) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(
    `${BACKEND_URL}/request/mark-read/${requestId}`,
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
    throw new Error('Failed to mark request as read');
  }

  return await response.json();
}
