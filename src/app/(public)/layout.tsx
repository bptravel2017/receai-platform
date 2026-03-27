import type { ReactNode } from "react";

import { SiteFooter } from "@/components/navigation/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell marketing-shell-root">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
