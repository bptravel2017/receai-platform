import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="marketing-footer-wrap">
      <div className="marketing-shell">
        <div className="marketing-footer">
          <div className="marketing-footer-brand">
            <strong>ReceAI</strong>
            <span>Create receipts instantly and upgrade only when the workflow expands.</span>
          </div>

          <nav className="marketing-footer-nav" aria-label="Footer">
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
            <a href="mailto:support@example.com">Support</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
