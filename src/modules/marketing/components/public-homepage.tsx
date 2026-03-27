import Link from "next/link";

export function PublicHomepage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Hero Section */}
      <div className="relative px-4 pt-20 pb-32 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Simple AI Receipts</span>
              <span className="block text-orange-600 mt-2">for Limo Drivers</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-gray-600">
              AI-powered tools for transportation businesses. Receipts, accounting, and automation built for drivers and tour operators.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/receipts"
                className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 md:py-4 md:text-lg md:px-10"
              >
                Start Creating Receipts
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 md:py-4 md:text-lg md:px-10"
              >
                View Pricing
              </Link>
            </div>
            <div className="mt-8 flex justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Instant setup</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Built specifically for transportation professionals who value simplicity.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Receipts</h3>
              </div>
              <p className="text-gray-600">
                Create professional receipts in under 30 seconds. Auto-calculate totals and taxes.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">💰</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Earnings Tracking</h3>
              </div>
              <p className="text-gray-600">
                See your daily, weekly, and monthly earnings. Know exactly how much you&apos;re making.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📱</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Works Everywhere</h3>
              </div>
              <p className="text-gray-600">
                Access from your phone, tablet, or computer. No apps to install.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📧</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Email Receipts</h3>
              </div>
              <p className="text-gray-600">
                Send receipts directly to your customers. Professional and instant.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Simple Reports</h3>
              </div>
              <p className="text-gray-600">
                Generate monthly reports for taxes and accounting. Export to CSV or PDF.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">🔒</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Secure & Private</h3>
              </div>
              <p className="text-gray-600">
                Your data is encrypted and secure. We don&apos;t share your information with anyone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-orange-600 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to simplify your receipts?
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-orange-100">
            Join hundreds of limo drivers who&apos;ve already made the switch.
          </p>
          <div className="mt-10">
            <Link
              href="/receipts"
              className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-white text-orange-600 hover:bg-gray-100 md:py-4 md:text-lg md:px-10"
            >
              Get Started Now
            </Link>
          </div>
          <p className="mt-4 text-sm text-orange-100">
            No credit card required • Free forever
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2026 ReceAI. Built for transportation professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
