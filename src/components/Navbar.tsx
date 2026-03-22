import Link from "next/link";

const links = [
  { label: "Customer", href: "#customer" },
  { label: "Vehicles", href: "#vehicles" },
  { label: "Guides", href: "#guides" },
  { label: "Invoice", href: "#invoice" },
  { label: "Payload", href: "#payload" },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/80 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm text-white shadow-[0_10px_20px_rgba(15,118,110,0.2)]">
            D
          </span>
          <span className="text-lg">Daytime</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#payload"
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          Payload
        </a>
      </div>
    </nav>
  );
}
