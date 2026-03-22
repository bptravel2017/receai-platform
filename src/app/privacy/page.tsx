export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
        Privacy Policy
      </h1>
      <div className="prose prose-slate max-w-none space-y-6 text-muted">
        <p className="text-sm text-muted mb-8">Last updated: March 16, 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p>
            ReceAI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects information you provide directly,
            including account details (name, email, company), ride and transaction data
            for receipt generation, and usage data to improve our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>
            We use your information to provide and improve our AI-powered receipt and
            accounting tools, process transactions, send service updates, and ensure
            platform security. We do not sell your personal data to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">3. Data Storage & Security</h2>
          <p>
            Your data is stored securely using industry-standard encryption. We use
            Supabase for database services with row-level security policies. Receipt
            data generated without login is not stored on our servers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">4. Third-Party Services</h2>
          <p>
            We may use third-party services for payment processing, analytics, and
            infrastructure. These services have their own privacy policies governing
            the use of your information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal information.
            You may also export your data or request account deletion by contacting us
            at privacy@receai.com.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">6. Contact Us</h2>
          <p>
            For questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:privacy@receai.com" className="text-primary hover:underline">
              privacy@receai.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
