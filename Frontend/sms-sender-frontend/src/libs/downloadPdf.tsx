'use server';

export default async function downloadPdf(fileId: string): Promise<Blob> {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/pdf/${fileId}`);

  if (!response.ok) {
    throw new Error('Failed to download PDF');
  }

  return await response.blob();
}