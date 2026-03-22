export default function CTA() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-r from-primary to-accent">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Start using ReceAI today
        </h2>
        <p className="mt-4 text-lg text-white/80">
          Free to start. No credit card required.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://receipts.receai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90 transition-colors"
          >
            Try ReceAI Receipts
          </a>
          <a
            href="https://ledger.receai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Explore TourLedger
          </a>
        </div>
      </div>
    </section>
  );
}
