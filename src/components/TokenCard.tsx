import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelBooking,
  statusIndex,
  statusLabel,
  STATUS_STEPS,
  type Booking,
} from "@/lib/farm";

export function TokenCard({
  booking,
  centerName,
  queue,
}: {
  booking: Booking;
  centerName: string;
  queue: { ahead: number; est_minutes: number } | null;
}) {
  const queryClient = useQueryClient();
  const [showCode, setShowCode] = useState(false);
  const current = statusIndex(booking.status);

  const cancel = useMutation({
    mutationFn: () => cancelBooking(booking.id),
    onSuccess: () => {
      toast.success("Booking cancelled");
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass shadow-glass overflow-hidden rounded-3xl border border-glassline">
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
            Your digital token
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Booking {booking.booking_code}
          </h1>
        </div>
        <span className="rounded-full bg-brand-soft/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 ring-1 ring-brand/20">
          {statusLabel(booking.status)}
        </span>
      </div>

      <div className="px-6 pt-5">
        <div className="glass-soft flex items-center justify-between rounded-2xl border border-glassline px-5 py-4">
          <div>
            <p className="font-mono text-3xl font-bold tracking-wider">{booking.booking_code}</p>
            <p className="mt-1 text-xs text-foreground/50">Token ID · verified by centre</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-foreground/45 uppercase">
              Queue position
            </p>
            <p className="font-display text-3xl font-bold text-brand">#{(queue?.ahead ?? 0) + 1}</p>
            <p className="text-[11px] text-foreground/50">est. ~{queue?.est_minutes ?? 0} min wait</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-6 pt-4 sm:grid-cols-4">
        {[
          { label: "Crop", value: booking.crop },
          { label: "Quantity", value: `${booking.quantity_kg} kg` },
          { label: "Centre", value: centerName || "—" },
          { label: "Token no.", value: `#${booking.token_number}` },
        ].map((f) => (
          <div key={f.label} className="glass-soft rounded-xl border border-glassline px-4 py-3">
            <p className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
              {f.label}
            </p>
            <p className="mt-1 font-display text-base font-semibold">{f.value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.14em] text-foreground/45 uppercase">
            Status timeline
          </p>
          <span className="text-[11px] text-foreground/45">
            Live · {new Date(booking.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="mt-4 flex items-center">
          {STATUS_STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex-1">
                <div
                  className={`h-1.5 w-full rounded-full ${
                    i < current ? "bg-brand" : i === current ? "bg-accent/80" : "bg-muted"
                  }`}
                />
                <div
                  className={`mt-2 text-[11px] ${
                    i <= current ? "font-semibold" : "font-medium text-foreground/40"
                  }`}
                >
                  {step.label}
                </div>
              </div>
              {i < STATUS_STEPS.length - 1 ? (
                <div
                  className={`mx-1.5 grid size-4 shrink-0 place-items-center rounded-full text-[8px] font-bold ${
                    i < current ? "bg-brand text-primary-foreground" : "bg-muted text-foreground/30"
                  }`}
                >
                  {i + 2}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 py-6">
        <button
          onClick={() => setShowCode((v) => !v)}
          className="shadow-brand flex-1 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {showCode ? "Hide token" : "Show token at counter"}
        </button>
        <button
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="rounded-xl border border-input bg-secondary px-5 py-3 text-sm font-semibold text-foreground/70"
        >
          Cancel booking
        </button>
      </div>

      {showCode ? (
        <div className="glass-soft mx-6 mb-6 rounded-2xl border border-glassline px-6 py-8 text-center">
          <p className="text-[11px] tracking-[0.2em] text-foreground/45 uppercase">
            Show this to the procurement officer
          </p>
          <p className="mt-3 font-mono text-5xl font-bold tracking-widest">
            {booking.token_number}
          </p>
          <p className="mt-2 font-mono text-sm text-foreground/60">{booking.booking_code}</p>
        </div>
      ) : null}
    </div>
  );
}
