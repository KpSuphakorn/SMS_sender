'use server';

export default async function createRequest(postData: any) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error("Failed to POST /request");
  }

  return await response.json();
}
