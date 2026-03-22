import { FileText, BookOpen, Code, HelpCircle } from "lucide-react";

const docs = [
  {
    title: "Getting Started",
    description: "Learn how to generate your first receipt in under 2 minutes.",
    icon: FileText,
    href: "https://receipts.receai.com",
  },
  {
    title: "TourLedger Guide",
    description: "Set up your accounting system for tour operations.",
    icon: BookOpen,
    href: "https://ledger.receai.com",
  },
  {
    title: "API Reference",
    description: "Integrate ReceAI into your existing workflow.",
    icon: Code,
    href: "https://app.receai.com",
  },
  {
    title: "FAQ",
    description: "Answers to the most common questions.",
    icon: HelpCircle,
    href: "https://receipts.receai.com/pricing",
  },
];

export default function Docs() {
  return (
    <section id="docs" className="scroll-mt-16 py-20 lg:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Documentation
          </h2>
          <p className="mt-4 text-lg text-muted">
            Everything you need to get started with ReceAI.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {docs.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              className="rounded-2xl border border-border bg-white p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                <doc.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                {doc.title}
              </h3>
              <p className="mt-2 text-xs text-muted">{doc.description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
