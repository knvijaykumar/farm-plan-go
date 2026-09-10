import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bookSlot,
  fetchCenters,
  fetchDayLoad,
  fetchSlots,
  prettyDate,
  prettyTime,
  todayISO,
  addDaysISO,
} from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/book")({
  head: () => ({
    meta: [
      { title: "Book a procurement slot · Easy FARM" },
      {
        name: "description",
        content:
          "Enter your crop details, choose a procurement centre and pick a slot with the shortest wait.",
      },
      { property: "og:title", content: "Book a procurement slot · Easy FARM" },
      {
        property: "og:description",
        content: "Choose a centre, see live capacity and book a slot in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [centerId, setCenterId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [slotId, setSlotId] = useState<string | null>(null);

  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });

  useEffect(() => {
    if (!centerId && centers && centers.length > 0) setCenterId(centers[0]!.id);
  }, [centers, centerId]);

  const center = centers?.find((c) => c.id === centerId) ?? null;

  useEffect(() => {
    if (center && !crop && center.crops.length > 0) setCrop(center.crops[0]!);
  }, [center, crop]);

  const { data: slots } = useQuery({
    queryKey: ["slots", centerId, date],
    enabled: Boolean(centerId),
    queryFn: () => fetchSlots(centerId as string, date),
  });

  const book = useMutation({
    mutationFn: () =>
      bookSlot({ slotId: slotId as string, crop, quantityKg: Number(quantity) }),
    onSuccess: (booking) => {
      toast.success(`Token ${booking.booking_code} issued`);
      void queryClient.invalidateQueries();
      navigate({ to: "/token/$id", params: { id: booking.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dates = [0, 1, 2, 3, 4, 5, 6].map((d) => addDaysISO(todayISO(), d));
  const selectedSlot = (slots ?? []).find((s) => s.id === slotId) ?? null;
  const canBook = Boolean(slotId && crop && Number(quantity) > 0);

  return (
    <div className="mt-5 grid grid-cols-12 gap-5">
      <div className="col-span-12 lg:col-span-7">
        <div className="glass shadow-glass rounded-3xl border border-glassline p-6">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
            Choose your centre
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Where are you bringing your crop?
          </h1>

          <div className="mt-5 space-y-2.5">
            {(centers ?? []).map((c) => (
              <CenterRow
                key={c.id}
                id={c.id}
                name={c.name}
                district={c.district}
                crops={c.crops}
                date={date}
                selected={c.id === centerId}
                onSelect={() => {
                  setCenterId(c.id);
                  setSlotId(null);
                  setCrop(c.crops[0] ?? "");
                }}
              />
            ))}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-foreground/45 uppercase">
              Pick a day
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDate(d);
                    setSlotId(null);
                  }}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${
                    d === date
                      ? "shadow-brand bg-brand text-primary-foreground"
                      : "border border-glassline bg-secondary text-foreground/70"
                  }`}
                >
                  {prettyDate(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-foreground/45 uppercase">
              Available slots
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {(slots ?? []).map((s) => {
                const left = s.capacity - s.booked_count;
                const full = left <= 0;
                const isSel = s.id === slotId;
                return (
                  <button
                    key={s.id}
                    disabled={full}
                    onClick={() => setSlotId(s.id)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      isSel
                        ? "shadow-brand border-brand bg-brand text-primary-foreground"
                        : full
                          ? "border-glassline bg-secondary/25 opacity-60"
                          : "border-glassline bg-secondary/60"
                    }`}
                  >
                    <p className="font-mono text-sm font-bold">
                      {prettyTime(s.start_time)} – {prettyTime(s.end_time)}
                    </p>
                    <p
                      className={`text-[11px] ${isSel ? "text-primary-foreground/80" : "text-foreground/50"}`}
                    >
                      {full ? "Full" : `${left} open`}
                    </p>
                  </button>
                );
              })}
              {(slots ?? []).length === 0 ? (
                <p className="text-sm text-foreground/50">Loading slots…</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 flex flex-col gap-5 lg:col-span-5">
        <div className="glass shadow-glass rounded-3xl border border-glassline p-5">
          <h2 className="font-display text-lg font-bold tracking-tight">Crop details</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                Crop
              </label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-secondary px-4 py-3 text-sm outline-none focus:border-brand"
              >
                {(center?.crops ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                Quantity (kg)
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-secondary px-4 py-3 text-sm outline-none focus:border-brand"
                placeholder="480"
              />
            </div>
          </div>

          <div className="glass-soft mt-5 rounded-2xl border border-glassline px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-foreground/45 uppercase">
              Your booking
            </p>
            <p className="mt-2 text-sm font-semibold">{center?.name ?? "Select a centre"}</p>
            <p className="text-[11px] text-foreground/50">
              {prettyDate(date)}
              {selectedSlot
                ? ` · ${prettyTime(selectedSlot.start_time)}–${prettyTime(selectedSlot.end_time)}`
                : " · pick a slot"}
            </p>
          </div>

          <button
            onClick={() => book.mutate()}
            disabled={!canBook || book.isPending}
            className="shadow-brand mt-5 w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {book.isPending ? "Issuing token…" : "Confirm & issue token"}
          </button>
          <p className="mt-2 text-center text-[11px] text-foreground/45">
            No fee to book · you can cancel any time
          </p>
        </div>
      </div>
    </div>
  );
}

function CenterRow({
  id,
  name,
  district,
  crops,
  date,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  district: string;
  crops: string[];
  date: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { data: load } = useQuery({
    queryKey: ["day-load", id, date],
    queryFn: () => fetchDayLoad(id, date),
  });
  const fill = Math.round((load?.fill ?? 0) * 100);

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left ${
        selected ? "border-brand bg-brand/10" : "border-glassline bg-secondary/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-foreground/50">
            {district} · {crops.join(", ")}
          </p>
        </div>
        <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
          {fill}% full
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${fill}%` }} />
      </div>
    </button>
  );
}
