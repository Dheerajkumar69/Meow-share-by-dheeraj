import Link from 'next/link';

export default function AppHome() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">App Router Home</h1>
        <p className="text-xl text-gray-600 mb-6">
          This is the App Router version of the home page.
        </p>
        <p className="mb-6">
          We&apos;re using the Pages Router for the main site, and App Router for some specific features.
        </p>
        <Link 
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Main Site
        </Link>
      </div>
    </div>
  );
} 