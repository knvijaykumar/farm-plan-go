import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchCenters, fetchQueueInfo, type Booking } from "@/lib/farm";
import { TokenCard } from "@/components/TokenCard";

export const Route = createFileRoute("/_authenticated/token/$id")({
  head: () => ({
    meta: [
      { title: "Procurement token · Easy FARM" },
      {
        name: "description",
        content: "Your digital procurement token with queue position and live status.",
      },
      { property: "og:title", content: "Procurement token · Easy FARM" },
      {
        property: "og:description",
        content: "Digital token, queue position and procurement status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const { id } = Route.useParams();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async (): Promise<Booking | null> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: centers } = useQuery({ queryKey: ["centers"], queryFn: fetchCenters });
  const { data: queue } = useQuery({
    queryKey: ["queue", id],
    enabled: Boolean(booking),
    refetchInterval: 30_000,
    queryFn: () => fetchQueueInfo(id),
  });

  if (isLoading) {
    return <p className="mt-8 text-sm text-foreground/50">Loading token…</p>;
  }

  if (!booking) {
    return (
      <div className="glass shadow-glass mt-5 rounded-3xl border border-glassline p-8">
        <h1 className="font-display text-2xl font-bold">Token not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-brand">
          Back to my token
        </Link>
      </div>
    );
  }

  const center = centers?.find((c) => c.id === booking.center_id);

  return (
    <div className="mt-5 grid grid-cols-12 gap-5">
      <div className="col-span-12 lg:col-span-8 lg:col-start-3">
        <TokenCard booking={booking} centerName={center?.name ?? ""} queue={queue ?? null} />
      </div>
    </div>
  );
}
