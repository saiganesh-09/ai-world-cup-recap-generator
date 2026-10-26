import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-slate-700">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-gold px-6 py-2.5 font-semibold text-slate-950 hover:bg-amber-300"
      >
        Back to home
      </Link>
    </div>
  );
}
