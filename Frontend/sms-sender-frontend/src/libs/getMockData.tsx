'use server';

export default async function getMockData(date: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/mock-data?date=${date}`);

  if (!response.ok) {
    throw new Error('Failed to fetch mock data');
  }

  return await response.json();
}