import { MapPin, Car, Bus, Truck, type LucideIcon } from "lucide-react";

interface Industry {
  icon: LucideIcon;
  title: string;
  description: string;
}

const industries: Industry[] = [
  {
    icon: MapPin,
    title: "Tour Operators",
    description: "Manage tour finances, receipts, and client billing.",
  },
  {
    icon: Car,
    title: "Chauffeur Services",
    description: "Generate receipts and track ride income effortlessly.",
  },
  {
    icon: Bus,
    title: "Travel Agencies",
    description: "Streamline accounting for group trips and bookings.",
  },
  {
    icon: Truck,
    title: "Fleet Companies",
    description: "Track expenses and revenue across your entire fleet.",
  },
];

export default function Industry() {
  return (
    <section className="py-20 lg:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built for Transportation
          </h2>
          <p className="mt-4 text-lg text-muted">
            Tools designed for businesses that move people every day.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {industries.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-white p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {item.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
