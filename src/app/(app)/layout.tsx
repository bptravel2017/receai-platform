import type { ReactNode } from "react";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireAuthenticatedAppContext();

  return (
    <div className="shell-grid">
      <AppSidebar context={context} />
      <main className="content">{children}</main>
    </div>
  );
}
