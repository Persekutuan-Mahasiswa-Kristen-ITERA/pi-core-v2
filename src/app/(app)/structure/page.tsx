import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { CHILD_TYPES, UNIT_TYPE_LABEL } from "@/lib/org-structure";
import { listOrgUnits, listPositions, listRolesForPicker } from "@/lib/queries";
import { POSITION_UNIT_TYPES } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { CreateBar, ListPanel, RowPill, SectionTitle } from "@/components/common/surfaces";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Structure" };

const iconLink =
  "grid size-11 shrink-0 place-items-center rounded-full text-pmk-brown hover:bg-white focus-visible:outline-2 focus-visible:outline-pmk-accent";

export default async function StructurePage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [units, positions, roles] = await Promise.all([listOrgUnits(), listPositions(), listRolesForPicker()]);
  const roleName = new Map(roles.map((r) => [r.id, r.name]));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <p className="text-sm text-pmk-body">
        {isSuperAdmin
          ? "The PMK ITERA units and the positions that exist in each kind of unit. Assignments pick a unit and one of its positions."
          : "The PMK ITERA units and positions. Only a super admin can change them."}
      </p>

      <section aria-labelledby="units-title" className="space-y-3">
        <SectionTitle id="units-title">Units</SectionTitle>
        <ListPanel>
          <ul className="space-y-2">
            {units.map((u) => (
              <li key={u.id} style={{ paddingLeft: `${Math.max(0, u.depth - 1) * 1.25}rem` }}>
                <RowPill
                  className={cn(
                    "flex items-center gap-2 py-1 pl-4 pr-1",
                    u.type === "organization" && "bg-pmk-tint-border/60",
                    !u.is_active && "opacity-60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-pmk-ink">{u.name}</span>
                    <span className="text-xs">
                      {UNIT_TYPE_LABEL[u.type]}
                      {u.is_active ? "" : " · inactive"}
                    </span>
                  </span>
                  {isSuperAdmin && CHILD_TYPES[u.type].length ? (
                    <Link
                      href={`/structure/units/new?parent=${u.id}`}
                      className={iconLink}
                      aria-label={`Add a unit under ${u.name}`}
                    >
                      <Plus className="size-5" aria-hidden />
                    </Link>
                  ) : null}
                  {isSuperAdmin && u.type !== "organization" ? (
                    <Link href={`/structure/units/${u.id}`} className={iconLink} aria-label={`Edit ${u.name}`}>
                      <SquarePen className="size-5" aria-hidden />
                    </Link>
                  ) : null}
                </RowPill>
              </li>
            ))}
          </ul>
        </ListPanel>
      </section>

      <section aria-labelledby="positions-title" className="space-y-3">
        <SectionTitle id="positions-title">Positions</SectionTitle>
        <p className="text-sm text-pmk-body">
          Rank: lower is more senior. “One per unit” positions can have a single holder per unit and period.
        </p>
        {isSuperAdmin ? <CreateBar href="/structure/positions/new">Create Position</CreateBar> : null}
        {POSITION_UNIT_TYPES.map((type) => {
          const list = positions.filter((p) => p.unitType === type);
          return (
            <div key={type} className="space-y-2">
              <h3 className="px-1 text-sm font-bold text-pmk-ink">{UNIT_TYPE_LABEL[type]}</h3>
              {list.length === 0 ? (
                <p className="px-1 text-sm text-pmk-body">No positions.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((p) => (
                    <li key={p.id}>
                      <RowPill className="flex items-center gap-2 py-1.5 pl-4 pr-1">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-pmk-ink">
                            {p.name}
                            {p.isUniquePerUnit ? (
                              <span className="ml-2 text-[11px] font-semibold text-pmk-accent">ONE PER UNIT</span>
                            ) : null}
                          </span>
                          <span className="block text-xs">
                            Rank {p.rank}
                            {p.roleIds.length
                              ? ` · ${p.roleIds.map((id) => roleName.get(id) ?? "?").join(", ")}`
                              : " · no roles"}
                            {` · ${p.usage} assignment${p.usage === 1 ? "" : "s"}`}
                          </span>
                        </span>
                        {isSuperAdmin ? (
                          <Link
                            href={`/structure/positions/${p.id}`}
                            className={iconLink}
                            aria-label={`Edit ${p.name}`}
                          >
                            <SquarePen className="size-5" aria-hidden />
                          </Link>
                        ) : null}
                      </RowPill>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
