import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRoles } from "@/hooks/useAuth";
import {
  fetchCenterBookings,
  fetchCenters,
  fetchProfiles,
  prettyDate,
  prettyTime,
  statusLabel,
  todayISO,
  updateBooking,
  type BookingStatus,
} from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/desk")({
  head: () => ({
    meta: [
      { title: "Centre desk · Easy FARM" },
      {
        name: "description",
        content: "Procurement centre queue: verify farmers, record weights and update status.",
      },
      { property: "og:title", content: "Centre desk · Easy FARM" },
      {
        property: "og:description",
        content: "Manage today's procurement queue, tokens and crop records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeskPage,
});

const NEXT: Record<string, BookingStatus> = {
  booked: "verified",
  verified: "in_queue",
  in_queue: "weighing",
  weighing: "completed",
};

function DeskPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isOfficer = (roles ?? []).some((r) => r === "staff" || r === "admin");
  const queryClient = useQueryClient();

  const [centerId, setCenterId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [weights, setWeights] = useState<Record<string, string>>({});

  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });

  useEffect(() => {
    if (!centerId && centers && centers.length > 0) setCenterId(centers[0]!.id);
  }, [centers, centerId]);

  const { data: rows } = useQuery({
    queryKey: ["desk", centerId, date],
    enabled: Boolean(centerId) && isOfficer,
    refetchInterval: 20_000,
    queryFn: () => fetchCenterBookings(centerId as string, date),
  });

  const { data: profiles } = useQuery({
    queryKey: ["desk-profiles", (rows ?? []).map((r) => r.farmer_id).join(",")],
    enabled: Boolean(rows && rows.length > 0),
    queryFn: () => fetchProfiles([...new Set((rows ?? []).map((r) => r.farmer_id))]),
  });

  const save = useMutation({
    mutationFn: (input: {
      id: string;
      status?: BookingStatus;
      recorded_weight_kg?: number | null;
    }) =>
      updateBooking(input.id, {
        ...(input.status ? { status: input.status } : {}),
        ...(input.recorded_weight_kg !== undefined
          ? { recorded_weight_kg: input.recorded_weight_kg }
          : {}),
      }),
    onSuccess: () => {
      toast.success("Record updated");
      void queryClient.invalidateQueries({ queryKey: ["desk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rolesLoading) return <p className="mt-8 text-sm text-foreground/50">Loading…</p>;

  if (!isOfficer) {
    return (
      <div className="glass shadow-glass mt-5 rounded-3xl border border-glassline p-8">
        <h1 className="font-display text-2xl font-bold">Centre desk</h1>
        <p className="mt-2 text-sm text-foreground/60">
          This area is for procurement centre staff. Ask an administrator to grant you staff access.
        </p>
      </div>
    );
  }

  const active = (rows ?? []).filter((r) => r.status !== "cancelled");
  const done = active.filter((r) => r.status === "completed").length;
  const waiting = active.filter((r) => r.status === "booked" || r.status === "verified").length;
  const weighing = active.filter((r) => r.status === "weighing").length;

  return (
    <div className="mt-5 space-y-5">
      <div className="glass shadow-glass rounded-3xl border border-glassline p-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
          Procurement centre
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Today's queue</h1>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={centerId ?? ""}
            onChange={(e) => setCenterId(e.target.value)}
            className="rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand"
          >
            {(centers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <span className="text-[11px] tracking-wide text-foreground/45 uppercase">
            {prettyDate(date)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "In queue", value: waiting },
            { label: "Weighing", value: weighing },
            { label: "Completed", value: done },
            { label: "Total today", value: active.length },
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

      <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">Farmer records</h2>
        <div className="mt-4 space-y-2.5">
          {active.map((b) => {
            const p = profiles?.get(b.farmer_id);
            const next = NEXT[b.status];
            return (
              <div
                key={b.id}
                className="rounded-xl border border-glassline bg-secondary/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <p className="font-mono text-2xl font-bold">{b.token_number}</p>
                    <div>
                      <p className="text-sm font-semibold">
                        {p?.full_name || "Farmer"} · {b.crop} · {b.quantity_kg} kg
                      </p>
                      <p className="text-[11px] text-foreground/50">
                        {b.booking_code}
                        {b.slot ? ` · ${prettyTime(b.slot.start_time)}` : ""}
                        {p?.phone ? ` · ${p.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand/20 px-2.5 py-1 text-[11px] font-semibold text-foreground/70">
                      {statusLabel(b.status)}
                    </span>
                    {next ? (
                      <button
                        onClick={() => save.mutate({ id: b.id, status: next })}
                        className="shadow-brand rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        Mark {statusLabel(next).toLowerCase()}
                      </button>
                    ) : null}
                  </div>
                </div>

                {b.status === "weighing" || b.status === "completed" ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder={
                        b.recorded_weight_kg !== null
                          ? String(b.recorded_weight_kg)
                          : "Recorded weight (kg)"
                      }
                      value={weights[b.id] ?? ""}
                      onChange={(e) => setWeights({ ...weights, [b.id]: e.target.value })}
                      className="w-56 rounded-lg border border-input bg-secondary px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                    <button
                      onClick={() =>
                        save.mutate({
                          id: b.id,
                          recorded_weight_kg: Number(weights[b.id] ?? 0),
                        })
                      }
                      className="rounded-lg border border-input bg-secondary px-3.5 py-2 text-xs font-semibold"
                    >
                      Save weight
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {active.length === 0 ? (
            <p className="text-sm text-foreground/50">No bookings for this day yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
