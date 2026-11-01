import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-[22px] font-semibold text-pmk-ink">Page not found</h1>
      <p className="max-w-sm text-sm text-pmk-muted">It may have been removed, or the link is wrong.</p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center rounded-full bg-pmk-brown px-6 text-sm font-semibold text-white hover:bg-pmk-brown-hover"
      >
        Go to Home
      </Link>
    </main>
  );
}
