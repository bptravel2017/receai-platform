import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </section>
      {children}
    </div>
  );
}
