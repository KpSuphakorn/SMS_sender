'use server';

export default async function getRequestList() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/requests`);

  if (!response.ok) {
    throw new Error('Failed to fetch request list');
  }

  return await response.json();
}