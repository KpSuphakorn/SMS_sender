'use server'

export default async function ispResponse(requestId: string, files: FormData, token: string) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${BACKEND_URL}/api/isp-response/${requestId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: files,
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(err);
    throw new Error("Failed to POST /isp-response");
  }

  return await response.json();
}