import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-5xl font-bold text-gray-200">404</p>
        <h1 className="text-xl font-semibold text-gray-800 mt-4">Page not found</h1>
        <p className="text-sm text-gray-500 mt-2">The page you are looking for does not exist.</p>
        <Link
          href="/dashboard"
          className="inline-flex mt-6 bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
