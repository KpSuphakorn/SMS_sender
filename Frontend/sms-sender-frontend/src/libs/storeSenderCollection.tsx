'use server'

export default async function storeSenderCollection(postData: any, token: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${BACKEND_URL}/api/store-sender-collection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error("Failed to POST /store-sender-collection");
  }

  return await response.json();
}