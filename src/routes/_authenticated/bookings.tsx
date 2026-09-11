import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useAuth";
import { fetchCenters, fetchMyBookings, statusLabel } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Booking history · Easy FARM" },
      {
        name: "description",
        content: "Every procurement booking you have made, with its token and current status.",
      },
      { property: "og:title", content: "Booking history · Easy FARM" },
      {
        property: "og:description",
        content: "Track past and upcoming procurement bookings in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchMyBookings(userId as string),
  });
  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });

  return (
    <div className="mt-5">
      <div className="glass shadow-glass rounded-3xl border border-glassline p-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">Tracking</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Your bookings</h1>

        <div className="mt-5 space-y-2.5">
          {(bookings ?? []).map((b) => {
            const center = centers?.find((c) => c.id === b.center_id);
            return (
              <Link
                key={b.id}
                to="/token/$id"
                params={{ id: b.id }}
                className="flex items-center justify-between gap-4 rounded-xl border border-glassline bg-secondary/60 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-bold">{b.booking_code}</p>
                  <p className="text-[11px] text-foreground/50">
                    {center?.name ?? "Centre"} · {b.crop} · {b.quantity_kg} kg
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-brand/20 px-2.5 py-1 text-[11px] font-semibold text-foreground/70">
                    {statusLabel(b.status)}
                  </span>
                  <p className="mt-1 text-[11px] text-foreground/45">
                    {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            );
          })}
          {(bookings ?? []).length === 0 ? (
            <p className="text-sm text-foreground/50">
              No bookings yet.{" "}
              <Link to="/book" className="font-semibold text-brand">
                Book your first slot
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
