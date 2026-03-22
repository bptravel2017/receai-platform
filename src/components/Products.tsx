import {
  Receipt,
  BookOpen,
  FileText,
  Download,
  Monitor,
  TrendingUp,
  BarChart3,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  label: string;
}

interface Product {
  icon: LucideIcon;
  name: string;
  description: string;
  features: Feature[];
  cta: string;
  href: string;
}

const products: Product[] = [
  {
    icon: Receipt,
    name: "ReceAI Receipts",
    description: "Generate professional ride receipts instantly. No login required.",
    features: [
      { icon: FileText, label: "Free receipt generation" },
      { icon: Download, label: "PDF download" },
      { icon: Monitor, label: "Driver-friendly interface" },
    ],
    cta: "Open Receipts",
    href: "https://receipts.receai.com",
  },
  {
    icon: BookOpen,
    name: "TourLedger",
    description:
      "Accounting and financial tracking for tour operators and travel agencies.",
    features: [
      { icon: TrendingUp, label: "Tour income tracking" },
      { icon: Wallet, label: "Expense management" },
      { icon: Receipt, label: "Group trip ledger" },
      { icon: BarChart3, label: "Financial reports" },
    ],
    cta: "Open TourLedger",
    href: "https://ledger.receai.com",
  },
];

export default function Products() {
  return (
    <section id="products" className="scroll-mt-16 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Our Products
          </h2>
          <p className="mt-4 text-lg text-muted">
            Purpose-built tools for transportation businesses.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {products.map((product) => (
            <div
              key={product.name}
              className="rounded-2xl border border-border p-8 hover:shadow-lg transition-shadow bg-white"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                <product.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Name + description */}
              <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
              <p className="mt-2 text-muted">{product.description}</p>

              {/* Features */}
              <ul className="mt-6 space-y-3">
                {product.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-3 text-sm text-foreground">
                    <feature.icon className="h-4 w-4 text-accent shrink-0" />
                    {feature.label}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center rounded-lg border border-primary text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary hover:text-white transition-colors w-full"
              >
                {product.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
