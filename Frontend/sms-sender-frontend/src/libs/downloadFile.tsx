'use server';

export default async function downloadFile(fileId: string, token: string, isPdf: boolean = false): Promise<{ blob: Blob, filename: string }> {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const response = await fetch(`${BACKEND_URL}/api/file/${fileId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${isPdf ? 'PDF' : 'Excel/CSV'}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = isPdf ? `document_${fileId}.pdf` : `data_${fileId}.xlsx`;

  if (contentDisposition && contentDisposition.includes('filename=')) {
    const matches = contentDisposition.match(/filename="([^"]+)"/);
    if (matches && matches[1]) {
      filename = matches[1];
    }
  }

  return { blob, filename };
}