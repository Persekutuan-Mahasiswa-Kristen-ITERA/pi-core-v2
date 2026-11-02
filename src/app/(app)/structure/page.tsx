import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { CHILD_TYPES, UNIT_TYPE_LABEL } from "@/lib/org-structure";
import { listOrgUnits, listPositions, listRolesForPicker } from "@/lib/queries";
import { POSITION_UNIT_TYPES } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { LinkButton, PageHeader, RowList, SectionHeader, Tag } from "@/components/common/surfaces";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Structure" };

const iconLink =
  "grid size-10 shrink-0 place-items-center rounded-full text-pmk-muted transition-colors hover:bg-pmk-active hover:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent";

export default async function StructurePage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [units, positions, roles] = await Promise.all([listOrgUnits(), listPositions(), listRolesForPicker()]);
  const roleName = new Map(roles.map((r) => [r.id, r.name]));

  const root = units.find((u) => u.type === "organization");
  const tree = units.filter((u) => u.type !== "organization");
  const departments = tree.filter((u) => u.type === "department").length;
  const divisions = tree.filter((u) => u.type === "division").length;

  return (
    <div>
      <PageHeader
        title="Structure"
        description={`${root?.name ?? "PMK ITERA"}: BPH, ${departments} departments with ${divisions} divisions, and the bureaus. ${
          isSuperAdmin ? "Assignments pick a unit and one of its positions." : "Only a super admin can change them."
        }`}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="units-title" className="lg:col-span-7">
          <SectionHeader
            id="units-title"
            title="Units"
            meta={tree.length}
            action={
              isSuperAdmin && root ? (
                <LinkButton href={`/structure/units/new?parent=${root.id}`} variant="ghost">
                  <Plus aria-hidden /> Add unit
                </LinkButton>
              ) : null
            }
          />
          <RowList>
            {tree.map((u) => {
              const child = u.depth > 1;
              return (
                <li
                  key={u.id}
                  className={cn(
                    "flex items-center gap-2 py-1.5 pr-2",
                    child ? "pl-9" : "bg-pmk-tint/60 pl-4",
                    !u.is_active && "opacity-60",
                  )}
                >
                  <span className="min-w-0 flex-1 py-1">
                    <span className={cn("block truncate text-sm text-pmk-ink", child ? "" : "font-semibold")}>
                      {u.name}
                    </span>
                    <span className="text-xs text-pmk-muted">
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
                      <Plus className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                  {isSuperAdmin ? (
                    <Link href={`/structure/units/${u.id}`} className={iconLink} aria-label={`Edit ${u.name}`}>
                      <SquarePen className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </RowList>
        </section>

        <section aria-labelledby="positions-title" className="lg:col-span-5">
          <SectionHeader
            id="positions-title"
            title="Positions"
            meta={positions.length}
            action={
              isSuperAdmin ? (
                <LinkButton href="/structure/positions/new" variant="ghost">
                  <Plus aria-hidden /> Create Position
                </LinkButton>
              ) : null
            }
          />
          <p className="mb-4 text-sm text-pmk-muted">
            Ordered by rank (lower is more senior). A “one holder” position has a single holder per unit and period.
          </p>
          <div className="space-y-5">
            {POSITION_UNIT_TYPES.map((type) => {
              const list = positions.filter((p) => p.unitType === type);
              return (
                <div key={type}>
                  <h3 className="mb-2 text-sm font-medium text-pmk-muted">{UNIT_TYPE_LABEL[type]}</h3>
                  {list.length === 0 ? (
                    <p className="text-sm text-pmk-muted">No positions.</p>
                  ) : (
                    <RowList>
                      {list.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 py-2 pl-4 pr-2">
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-pmk-ink">{p.name}</span>
                              {p.isUniquePerUnit ? <Tag>One holder</Tag> : null}
                            </span>
                            <span className="mt-0.5 block text-xs text-pmk-muted">
                              <span className="tnum">Rank {p.rank}</span>
                              {p.roleIds.length
                                ? ` · ${p.roleIds.map((id) => roleName.get(id) ?? "?").join(", ")}`
                                : " · no roles"}
                              <span className="tnum">{` · ${p.usage} assignment${p.usage === 1 ? "" : "s"}`}</span>
                            </span>
                          </span>
                          {isSuperAdmin ? (
                            <Link
                              href={`/structure/positions/${p.id}`}
                              className={iconLink}
                              aria-label={`Edit ${p.name}`}
                            >
                              <SquarePen className="size-4" aria-hidden />
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </RowList>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
