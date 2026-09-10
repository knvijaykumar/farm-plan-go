import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCenters, prettyTime } from "@/lib/farm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Easy FARM · Book your crop procurement slot" },
      {
        name: "description",
        content:
          "Plan your visit, book a procurement slot, get a digital token and track your crop procurement status — no unnecessary waiting at the centre.",
      },
      { property: "og:title", content: "Easy FARM · Book your crop procurement slot" },
      {
        property: "og:description",
        content:
          "Digital slot booking and tokens for agricultural procurement centres. Less waiting for farmers, better management for centres.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-32 -left-24 size-[520px] rounded-full bg-brand/40 blur-3xl" />
      <div className="pointer-events-none absolute top-16 right-0 size-[460px] rounded-full bg-accent/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[380px] rounded-full bg-brand-soft/50 blur-3xl" />

      <div className="relative mx-auto max-w-[1360px] px-5 py-5">
        <nav className="glass flex items-center justify-between rounded-2xl border border-glassline px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="shadow-brand grid size-10 place-items-center rounded-xl bg-brand">
              <span className="font-display text-lg font-extrabold text-primary-foreground">F</span>
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold tracking-tight">Easy FARM</p>
              <p className="text-[11px] font-medium tracking-[0.18em] text-foreground/45 uppercase">
                Procurement Platform
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="rounded-lg bg-brand/15 px-3.5 py-2 text-sm font-semibold text-foreground"
          >
            Sign in
          </Link>
        </nav>

        <div className="mt-5 grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-7">
            <div className="glass shadow-glass overflow-hidden rounded-3xl border border-glassline p-6">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
                Government procurement, digitised
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Plan your visit, book your slot, get your token.
              </h1>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-foreground/60">
                Check the live queue at your procurement centre before you travel. Book a time,
                receive a digital token, and follow your crop from weighing to payment — all from
                your phone.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  to="/auth"
                  className="shadow-brand flex-1 rounded-xl bg-brand px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Book a slot
                </Link>
                <Link
                  to="/auth"
                  className="rounded-xl border border-input bg-secondary px-5 py-3 text-sm font-semibold text-foreground/70"
                >
                  Centre staff login
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Step 1", value: "Register" },
                  { label: "Step 2", value: "Crop details" },
                  { label: "Step 3", value: "Pick a slot" },
                  { label: "Step 4", value: "Get token" },
                ].map((s) => (
                  <div key={s.label} className="glass-soft rounded-xl border border-glassline px-4 py-3">
                    <p className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                      {s.label}
                    </p>
                    <p className="mt-1 font-display text-base font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 flex flex-col gap-5 lg:col-span-5">
            <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Procurement centres
                </h2>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground/60">
                  Live
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(centers ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-glassline bg-secondary/60 px-4 py-3"
                  >
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-[11px] text-foreground/50">
                      {c.district} · {prettyTime(c.opens_at)}–{prettyTime(c.closes_at)} ·{" "}
                      {c.crops.join(", ")}
                    </p>
                  </div>
                ))}
                {(centers ?? []).length === 0 ? (
                  <p className="text-sm text-foreground/50">Loading centres…</p>
                ) : null}
              </div>
            </div>

            <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
              <h3 className="font-display text-base font-bold tracking-tight">
                Less waiting for farmers
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-foreground/55">
                Slot capacity and expected waiting time are estimated from each centre's throughput,
                so you can pick a quiet hour and avoid the peak rush.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
