'use server';

export default async function getAvailableSenders(start?: string, end?: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const params = new URLSearchParams();
  if (start) params.append("start", start);
  if (end) params.append("end", end);

  const url = `${BACKEND_URL}/available-senders${params.toString() ? "?" + params.toString() : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch mock data');
  }

  return await response.json();
}
