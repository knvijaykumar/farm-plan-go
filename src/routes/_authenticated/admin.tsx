import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRoles } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchCenters, prettyTime, todayISO, statusLabel, type Booking } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "District overview · Easy FARM" },
      {
        name: "description",
        content:
          "District-level view of procurement centres, capacity, bookings and completed procurement.",
      },
      { property: "og:title", content: "District overview · Easy FARM" },
      {
        property: "og:description",
        content: "Reports and statistics across all procurement centres.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: roles, isLoading } = useRoles();
  const isAdmin = (roles ?? []).some((r) => r === "admin");

  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings"],
    enabled: isAdmin,
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: todayLoad } = useQuery({
    queryKey: ["admin-load", todayISO()],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slots")
        .select("center_id, capacity, booked_count")
        .eq("slot_date", todayISO());
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  if (isLoading) return <p className="mt-8 text-sm text-foreground/50">Loading…</p>;

  if (!isAdmin) {
    return (
      <div className="glass shadow-glass mt-5 rounded-3xl border border-glassline p-8">
        <h1 className="font-display text-2xl font-bold">District overview</h1>
        <p className="mt-2 text-sm text-foreground/60">
          This area is for district administrators only.
        </p>
      </div>
    );
  }

  const all = bookings ?? [];
  const completed = all.filter((b) => b.status === "completed");
  const totalKg = completed.reduce(
    (a, b) => a + Number(b.recorded_weight_kg ?? b.quantity_kg),
    0,
  );

  return (
    <div className="mt-5 space-y-5">
      <div className="glass shadow-glass rounded-3xl border border-glassline p-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
          Administration
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">District overview</h1>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Centres", value: String(centers?.length ?? 0) },
            { label: "Bookings", value: String(all.length) },
            { label: "Completed", value: String(completed.length) },
            { label: "Procured", value: `${Math.round(totalKg)} kg` },
          ].map((s) => (
            <div key={s.label} className="glass-soft rounded-xl border border-glassline px-4 py-3">
              <p className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                {s.label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7">
          <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
            <h2 className="font-display text-lg font-bold tracking-tight">Centres today</h2>
            <div className="mt-4 space-y-2.5">
              {(centers ?? []).map((c) => {
                const rows = (todayLoad ?? []).filter((s) => s.center_id === c.id);
                const capacity = rows.reduce((a, r) => a + r.capacity, 0);
                const booked = rows.reduce((a, r) => a + r.booked_count, 0);
                const fill = capacity ? Math.round((booked / capacity) * 100) : 0;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-glassline bg-secondary/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-[11px] text-foreground/50">
                          {c.district} · {prettyTime(c.opens_at)}–{prettyTime(c.closes_at)} ·{" "}
                          {c.slot_capacity} per slot
                        </p>
                      </div>
                      <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                        {booked}/{capacity || 0} booked
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${fill}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
            <h2 className="font-display text-lg font-bold tracking-tight">Latest procurement</h2>
            <div className="mt-4 space-y-2.5">
              {all.slice(0, 8).map((b) => (
                <div
                  key={b.id}
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
                </div>
              ))}
              {all.length === 0 ? (
                <p className="text-sm text-foreground/50">No procurement records yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
