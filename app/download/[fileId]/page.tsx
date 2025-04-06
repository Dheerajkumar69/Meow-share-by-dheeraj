import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import DownloadClientPage from './client-page'

// Define the interface for page params
interface PageParams {
  params: {
    fileId: string;
  };
}

// Generate the valid static params
export async function generateStaticParams() {
  // This would normally come from a database or API
  // Here we're just returning sample static file IDs
  return [
    { fileId: 'demo-file-1' },
    { fileId: 'demo-file-2' },
    { fileId: 'demo-file-3' }
  ];
}

// Server component that receives params by default
export default function Page({ params }: PageParams) {
  // Handle invalid params
  if (!params || !params.fileId) {
    notFound();
  }

  // Render the client component with the fileId
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DownloadClientPage fileId={params.fileId} />
    </Suspense>
  );
} 