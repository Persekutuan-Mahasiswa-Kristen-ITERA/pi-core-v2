import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-bold text-pmk-ink">Page not found</p>
      <p className="max-w-sm text-sm text-pmk-body">It may have been removed, or the link is wrong.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-pmk-brown px-8 text-sm font-semibold text-white">
        Go to dashboard
      </Link>
    </main>
  );
}
