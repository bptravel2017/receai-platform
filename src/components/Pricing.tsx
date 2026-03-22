import Link from "next/link";

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted">
            Start free. Upgrade when you need more.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-border p-8 bg-white">
            <h3 className="text-lg font-semibold text-foreground">Free</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-foreground">$0</span>
              <span className="text-muted">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-muted mb-8">
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Unlimited receipt generation
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> PDF downloads
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> No login required
              </li>
            </ul>
            <Link
              href="https://receipts.receai.com"
              target="_blank"
              className="block text-center rounded-lg border border-primary text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary hover:text-white transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-primary p-8 bg-white relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
              Popular
            </div>
            <h3 className="text-lg font-semibold text-foreground">Pro</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-foreground">$9.99</span>
              <span className="text-muted">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-muted mb-8">
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Everything in Free
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Save receipts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Receipt history
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Export PDF
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> OCR scanning
              </li>
            </ul>
            <Link
              href="https://app.receai.com/pricing"
              target="_blank"
              className="block text-center rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>

          {/* Business */}
          <div className="rounded-2xl border border-border p-8 bg-white">
            <h3 className="text-lg font-semibold text-foreground">Business</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-foreground">$29.99</span>
              <span className="text-muted">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-muted mb-8">
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Everything in Pro
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> TourLedger integration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Team management
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Advanced reports
              </li>
            </ul>
            <Link
              href="https://app.receai.com/pricing"
              target="_blank"
              className="block text-center rounded-lg border border-primary text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary hover:text-white transition-colors"
            >
              Upgrade to Business
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
