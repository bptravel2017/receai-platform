export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>
          Daytime revenue builder. One customer, one revenue record, one invoice.
        </p>
        <div className="flex flex-wrap gap-4">
          <span>Revenue-first POS flow</span>
          <span>Dynamic vehicle + guide input</span>
          <span>Live invoice preview</span>
        </div>
      </div>
    </footer>
  );
}
