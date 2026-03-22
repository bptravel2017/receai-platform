export default function TermsOfService() {
  return (
    <main className="max-w-3xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
        Terms of Service
      </h1>
      <div className="prose prose-slate max-w-none space-y-6 text-muted">
        <p className="text-sm text-muted mb-8">Last updated: March 16, 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using ReceAI (&quot;Service&quot;), you agree to be bound by these
            Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p>
            ReceAI provides AI-powered receipt generation and accounting tools for
            transportation businesses, including ReceAI Receipts (free) and TourLedger
            (subscription-based). Features may change without prior notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activities under your account. You must provide
            accurate information and keep it updated.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
          <p>
            You agree not to misuse the Service, including but not limited to: generating
            fraudulent receipts, attempting unauthorized access, disrupting service
            availability, or violating any applicable laws.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">5. Payments & Subscriptions</h2>
          <p>
            Paid features require a subscription. Fees are billed in advance and are
            non-refundable except as required by law. You may cancel your subscription
            at any time through your account settings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. We are not
            liable for any indirect, incidental, or consequential damages arising from
            your use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">7. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service
            after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:legal@receai.com" className="text-primary hover:underline">
              legal@receai.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
