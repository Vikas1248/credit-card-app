const trustItems = [
  ["🔐", "Secure & Private"],
  ["⚡", "Instant Recommendations"],
  ["🇮🇳", "Built for India"],
  ["✨", "Growing Community"],
] as const;

export function TrustStrip() {
  return (
    <section className="rounded-3xl border border-zinc-200/70 bg-white p-4 shadow-md shadow-zinc-900/[0.03]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map(([icon, label]) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
              {icon}
            </span>
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
