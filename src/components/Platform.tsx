import { Sparkles, Cloud, Users, TrendingUp } from "lucide-react";

const points = [
  {
    icon: Sparkles,
    title: "AI-powered automation",
    description: "Smart tools that reduce manual work and improve accuracy.",
  },
  {
    icon: Cloud,
    title: "Cloud-based platform",
    description: "Access your tools from anywhere, on any device.",
  },
  {
    icon: Users,
    title: "Built for drivers & tour operators",
    description: "Purpose-designed for transportation professionals.",
  },
  {
    icon: TrendingUp,
    title: "Scalable for any size",
    description: "Works for individuals and growing companies alike.",
  },
];

export default function Platform() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              One Platform, Multiple Solutions
            </h2>
            <p className="mt-4 text-lg text-muted">
              ReceAI provides a unified SaaS platform with specialized tools
              designed specifically for transportation businesses.
            </p>
          </div>

          {/* Right: Key points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {points.map((point) => (
              <div key={point.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <point.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
