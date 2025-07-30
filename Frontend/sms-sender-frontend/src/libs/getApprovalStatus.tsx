'use server'

export default async function getApprovalStatus(requestId: string, token: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${BACKEND_URL}/api/get-approve-status/${requestId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error(`Failed to GET /get-approve-status/${requestId}`);
  }

  return await response.json();
}
