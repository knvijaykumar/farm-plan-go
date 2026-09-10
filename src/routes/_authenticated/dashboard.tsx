import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useAuth";
import {
  fetchMyBookings,
  fetchCenters,
  fetchSlots,
  fetchQueueInfo,
  todayISO,
  prettyTime,
  STATUS_STEPS,
  statusIndex,
  statusLabel,
  type Booking,
} from "@/lib/farm";
import { TokenCard } from "@/components/TokenCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My token · Easy FARM" },
      {
        name: "description",
        content: "Your live procurement token, queue position and expected waiting time.",
      },
      { property: "og:title", content: "My token · Easy FARM" },
      {
        property: "og:description",
        content: "Track your procurement token, queue position and status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const ACTIVE: Booking["status"][] = ["booked", "verified", "in_queue", "weighing"];

function Dashboard() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchMyBookings(userId as string),
  });
  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });

  const active = (bookings ?? []).find((b) => ACTIVE.includes(b.status));
  const center = centers?.find((c) => c.id === active?.center_id);

  const { data: queue } = useQuery({
    queryKey: ["queue", active?.id],
    enabled: Boolean(active?.id),
    refetchInterval: 30_000,
    queryFn: () => fetchQueueInfo(active?.id as string),
  });

  const { data: slots } = useQuery({
    queryKey: ["slots", center?.id ?? centers?.[0]?.id, todayISO()],
    enabled: Boolean(center?.id ?? centers?.[0]?.id),
    queryFn: () => fetchSlots((center?.id ?? centers?.[0]?.id) as string, todayISO()),
  });

  const openSlots = (slots ?? []).filter((s) => s.booked_count < s.capacity).slice(0, 3);
  const peak = (slots ?? []).reduce(
    (best, s) => (s.booked_count > (best?.booked_count ?? -1) ? s : best),
    (slots ?? [])[0],
  );
  const maxBooked = Math.max(1, ...(slots ?? []).map((s) => s.booked_count));

  return (
    <div className="mt-5 grid grid-cols-12 gap-5">
      <div className="col-span-12 lg:col-span-7">
        {active ? (
          <TokenCard booking={active} centerName={center?.name ?? ""} queue={queue ?? null} />
        ) : (
          <div className="glass shadow-glass rounded-3xl border border-glassline p-8">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
              No active token
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
              You have no booking right now
            </h1>
            <p className="mt-3 max-w-[46ch] text-sm text-foreground/60">
              Enter your crop details, choose a procurement centre and pick a slot. You'll get a
              digital token straight away.
            </p>
            <Link
              to="/book"
              className="shadow-brand mt-6 inline-block rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Book a slot
            </Link>
          </div>
        )}

        {(bookings ?? []).length > 0 ? (
          <div className="glass shadow-glass mt-5 rounded-3xl border border-glassline p-5">
            <h2 className="font-display text-lg font-bold tracking-tight">Recent bookings</h2>
            <div className="mt-4 space-y-2.5">
              {(bookings ?? []).slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  to="/token/$id"
                  params={{ id: b.id }}
                  className="flex items-center justify-between rounded-xl border border-glassline bg-secondary/60 px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-sm font-bold">{b.booking_code}</p>
                    <p className="text-[11px] text-foreground/50">
                      {b.crop} · {b.quantity_kg} kg
                    </p>
                  </div>
                  <span className="rounded-full bg-brand/20 px-2.5 py-1 text-[11px] font-semibold text-foreground/70">
                    {statusLabel(b.status)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="col-span-12 flex flex-col gap-5 lg:col-span-5">
        <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight">Available slots</h2>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground/60">
              Today
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {openSlots.map((s) => (
              <Link
                key={s.id}
                to="/book"
                className="flex items-center justify-between rounded-xl border border-glassline bg-secondary/60 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-bold">
                    {prettyTime(s.start_time)} – {prettyTime(s.end_time)}
                  </p>
                  <p className="text-[11px] text-foreground/50">
                    {center?.name ?? centers?.[0]?.name} · {s.booked_count} farmers in
                  </p>
                </div>
                <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                  {s.capacity - s.booked_count} open
                </span>
              </Link>
            ))}
            {openSlots.length === 0 ? (
              <p className="text-sm text-foreground/50">No open slots left today.</p>
            ) : null}
          </div>
        </div>

        <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
            </span>
            <h3 className="font-display text-base font-bold tracking-tight">Wait-time estimate</h3>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <p className="font-display text-4xl font-extrabold tracking-tight">
              ~{queue?.est_minutes ?? 0}
              <span className="text-xl font-bold text-foreground/50"> min</span>
            </p>
          </div>
          <div className="mt-4 flex h-14 items-end gap-1.5">
            {(slots ?? []).slice(0, 10).map((s) => (
              <div
                key={s.id}
                className="w-full rounded-t bg-brand/40"
                style={{ height: `${Math.max(8, (s.booked_count / maxBooked) * 52)}px` }}
              />
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-foreground/55">
            {peak
              ? `Busiest hour today is around ${prettyTime(peak.start_time)}. Slots outside that window move faster.`
              : "Pick a centre to see today's demand pattern."}
          </p>
        </div>

        <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
          <h3 className="font-display text-base font-bold tracking-tight">Procurement steps</h3>
          <div className="mt-3 space-y-2">
            {STATUS_STEPS.map((s, i) => {
              const done = active ? i <= statusIndex(active.status) : false;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[9px] font-bold ${
                      done ? "bg-brand text-primary-foreground" : "bg-muted text-foreground/40"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-sm ${done ? "font-semibold" : "text-foreground/50"}`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
