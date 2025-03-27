import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-2xl font-medium text-neutral-800 mb-6">Page Not Found</h2>
        <p className="text-neutral-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
} 