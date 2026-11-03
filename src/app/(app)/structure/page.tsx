import type { Metadata } from "next";
import Link from "next/link";
import { EditIcon, PlusIcon, StructureIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { CHILD_TYPES } from "@/lib/org-structure";
import { listOrgUnits, listPositions, listRolesForPicker } from "@/lib/queries";
import { POSITION_UNIT_TYPES } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import {
  IconBadge,
  LinkButton,
  PageHeader,
  RowList,
  SectionHeader,
  Tag,
  iconActionClass,
} from "@/components/common/surfaces";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.structure.title };
}

export default async function StructurePage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [units, positions, roles, { d }] = await Promise.all([
    listOrgUnits(),
    listPositions(),
    listRolesForPicker(),
    getI18n(),
  ]);
  const s = d.structure;
  const roleName = new Map(roles.map((r) => [r.id, r.name]));

  const root = units.find((u) => u.type === "organization");
  const tree = units.filter((u) => u.type !== "organization");
  const departments = tree.filter((u) => u.type === "department").length;
  const divisions = tree.filter((u) => u.type === "division").length;

  return (
    <div>
      <PageHeader
        title={s.title}
        description={s.description(root?.name ?? "PMK ITERA", departments, divisions, isSuperAdmin)}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="units-title" className="lg:col-span-7">
          <SectionHeader
            id="units-title"
            title={s.units}
            meta={tree.length}
            action={
              isSuperAdmin && root ? (
                <LinkButton href={`/structure/units/new?parent=${root.id}`} variant="ghost">
                  <PlusIcon aria-hidden /> {s.addUnit}
                </LinkButton>
              ) : null
            }
          />
          <RowList className="gap-1.5">
            {tree.map((u) => {
              const child = u.depth > 1;
              return (
                <li
                  key={u.id}
                  className={cn(
                    "flex items-center gap-3 py-2 pr-2",
                    child ? "pl-6 md:pl-14" : "pl-4 md:bg-pmk-tint/70",
                    !u.is_active && "opacity-60",
                  )}
                >
                  {child ? null : (
                    <IconBadge className="size-9 [&_svg]:size-[18px]">
                      <StructureIcon />
                    </IconBadge>
                  )}
                  <span className="min-w-0 flex-1 py-1">
                    <span
                      className={cn("block truncate text-[15px] text-pmk-ink", child ? "font-medium" : "font-bold")}
                    >
                      {u.name}
                    </span>
                    <span className="text-[13px] text-pmk-muted">
                      {d.unitType[u.type]}
                      {u.is_active ? "" : ` · ${s.inactive}`}
                    </span>
                  </span>
                  {isSuperAdmin && CHILD_TYPES[u.type].length ? (
                    <Link
                      href={`/structure/units/new?parent=${u.id}`}
                      className={iconActionClass}
                      aria-label={s.addUnder(u.name)}
                    >
                      <PlusIcon aria-hidden />
                    </Link>
                  ) : null}
                  {isSuperAdmin ? (
                    <Link href={`/structure/units/${u.id}`} className={iconActionClass} aria-label={s.edit(u.name)}>
                      <EditIcon aria-hidden />
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
            title={s.positions}
            meta={positions.length}
            action={
              isSuperAdmin ? (
                <LinkButton href="/structure/positions/new" variant="ghost">
                  <PlusIcon aria-hidden /> {s.createPosition}
                </LinkButton>
              ) : null
            }
          />
          <p className="mb-4 text-sm text-pmk-muted">{s.positionsNote}</p>
          <div className="space-y-5">
            {POSITION_UNIT_TYPES.map((type) => {
              const list = positions.filter((p) => p.unitType === type);
              return (
                <div key={type}>
                  <h3 className="mb-2 text-sm font-bold text-pmk-muted">{d.unitType[type]}</h3>
                  {list.length === 0 ? (
                    <p className="text-sm text-pmk-muted">{s.noPositions}</p>
                  ) : (
                    <RowList>
                      {list.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 py-2.5 pl-4 pr-2">
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[15px] font-bold text-pmk-ink">{p.name}</span>
                              {p.isUniquePerUnit ? <Tag tone="gold">{s.oneHolder}</Tag> : null}
                            </span>
                            <span className="mt-0.5 block text-[13px] text-pmk-muted">
                              <span className="tnum">{s.rank(p.rank)}</span>
                              {p.roleIds.length
                                ? ` · ${p.roleIds.map((id) => roleName.get(id) ?? "?").join(", ")}`
                                : ` · ${s.noRoles}`}
                              <span className="tnum">{` · ${s.usage(p.usage)}`}</span>
                            </span>
                          </span>
                          {isSuperAdmin ? (
                            <Link
                              href={`/structure/positions/${p.id}`}
                              className={iconActionClass}
                              aria-label={s.edit(p.name)}
                            >
                              <EditIcon aria-hidden />
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
