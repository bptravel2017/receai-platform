"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/navigation";
import { canAccessFeature } from "@/modules/plans/access";
import type { WorkspacePlan } from "@/modules/plans/types";

type AppNavLinksProps = {
  plan: WorkspacePlan;
};

export function AppNavLinks({ plan }: AppNavLinksProps) {
  const pathname = usePathname();
  const visibleRoutes = appRoutes.filter(
    (route) => !route.feature || canAccessFeature(plan, route.feature),
  );

  return (
    <ul className="nav-list">
      {visibleRoutes.map((route) => {
        const isActive =
          pathname === route.href || pathname.startsWith(`${route.href}/`);

        return (
          <li key={route.href}>
            <Link className={`nav-link${isActive ? " active" : ""}`} href={route.href}>
              <span>{route.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
