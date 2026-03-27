import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="marketing-header-wrap">
      <div className="marketing-shell">
        <div className="marketing-header">
          <Link className="marketing-brand" href="/">
            <span className="marketing-brand-mark">R</span>
            <span>ReceAI</span>
          </Link>

          <nav className="marketing-nav" aria-label="Primary">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
