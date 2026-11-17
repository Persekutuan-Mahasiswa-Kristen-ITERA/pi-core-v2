import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, IntegrationsIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { listApps } from "@/lib/queries";
import { IconBadge, PageHeader, Tag } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.integrations.title };
}

/** D-16: the PMK apps that read their access from PI-CORE. */
export default async function IntegrationsPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [apps, { d }] = await Promise.all([listApps(), getI18n()]);
  const t = d.integrations;

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      {apps.length === 0 ? (
        <EmptyState icon={<IntegrationsIcon />} title={t.emptyTitle}>
          {t.emptyBody}
        </EmptyState>
      ) : (
        <ul className="pmk-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {apps.map((app) => (
            <li key={app.key}>
              <Link
                href={`/integrations/${app.key}`}
                className="pmk-lift flex h-full flex-col gap-1.5 rounded-[20px] border border-pmk-tint-border bg-white p-[18px] shadow-[var(--pmk-shadow-card)] focus-visible:outline-2 focus-visible:outline-pmk-accent"
              >
                <span className="mb-1.5">
                  <IconBadge>
                    <IntegrationsIcon />
                  </IconBadge>
                </span>
                <span className="text-lg font-extrabold leading-snug text-pmk-ink">{app.name}</span>
                {app.description ? (
                  <span className="line-clamp-2 text-sm text-pmk-muted">{app.description}</span>
                ) : null}
                <span className="flex flex-wrap gap-1.5 pt-1">
                  {app.roles.map((r) => (
                    <Tag key={r.key}>{r.name}</Tag>
                  ))}
                </span>
                <span className="mt-auto flex items-center justify-between gap-2 border-t border-pmk-rule pt-3 text-[13px] font-semibold text-pmk-ink">
                  <span className="tnum">{t.activeRules(app.enabledRules)}</span>
                  <ChevronRightIcon className="size-[18px] text-pmk-muted" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
