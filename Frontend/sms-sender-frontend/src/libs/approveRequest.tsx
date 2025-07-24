'use server'

export default async function approveRequest(requestId: string, token: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${BACKEND_URL}/api/request/approve-request/${requestId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error(`Failed to POST /approve-request/${requestId}`);
  }

  return await response.json();
}