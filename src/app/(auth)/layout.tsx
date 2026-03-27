import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <main className="page hero">{children}</main>
    </div>
  );
}
