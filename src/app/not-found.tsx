import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { actionClass } from "@/components/common/surfaces";

export default async function NotFound() {
  const { d } = await getI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="tnum text-[56px] font-extrabold leading-none tracking-[-0.03em] text-pmk-gold">404</p>
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-pmk-ink">{d.states.notFoundTitle}</h1>
      <p className="max-w-sm text-[15px] text-pmk-muted">{d.states.notFoundBody}</p>
      <Link href="/" className={actionClass("primary", "mt-3 h-12 px-7")}>
        {d.states.goHome}
      </Link>
    </main>
  );
}
