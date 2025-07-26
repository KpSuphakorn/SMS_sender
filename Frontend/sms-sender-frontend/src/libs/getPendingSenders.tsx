'use server';

export default async function getPendingSenders(token: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const url = `${BACKEND_URL}/api/pending-senders`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch pending senders');
  }

  return await response.json();
}
