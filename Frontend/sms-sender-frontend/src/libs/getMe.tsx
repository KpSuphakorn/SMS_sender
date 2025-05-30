'use server';

export default async function getMe(token: string) {
  const BACKEND_URL = process.env.BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/api/user/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get me");
  }

  return await response.json();
}
