import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Center = Database["public"]["Tables"]["centers"]["Row"];
export type Slot = Database["public"]["Tables"]["slots"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

type RpcResult = { data: unknown; error: { message: string } | null };
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<RpcResult>;

export const STATUS_STEPS: { key: BookingStatus; label: string }[] = [
  { key: "booked", label: "Booked" },
  { key: "verified", label: "Verified" },
  { key: "in_queue", label: "In queue" },
  { key: "weighing", label: "Weighing" },
  { key: "completed", label: "Completed" },
];

export function statusIndex(status: BookingStatus): number {
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

export function statusLabel(status: BookingStatus): string {
  if (status === "cancelled") return "Cancelled";
  return STATUS_STEPS[statusIndex(status)]?.label ?? "Booked";
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function prettyTime(t: string): string {
  return t.slice(0, 5);
}

export async function fetchCenters(): Promise<Center[]> {
  const { data, error } = await supabase
    .from("centers")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSlots(centerId: string, date: string): Promise<Slot[]> {
  const { data, error } = await rpc("list_slots", { _center_id: centerId, _date: date });
  if (error) throw new Error(error.message);
  return (data as Slot[]) ?? [];
}

export async function fetchDayLoad(centerId: string, date: string) {
  const { data, error } = await supabase
    .from("slots")
    .select("capacity, booked_count")
    .eq("center_id", centerId)
    .eq("slot_date", date);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const capacity = rows.reduce((a, r) => a + r.capacity, 0);
  const booked = rows.reduce((a, r) => a + r.booked_count, 0);
  return { capacity, booked, fill: capacity ? booked / capacity : 0 };
}

export async function bookSlot(input: {
  slotId: string;
  crop: string;
  quantityKg: number;
}): Promise<Booking> {
  const { data, error } = await rpc("book_slot", {
    _slot_id: input.slotId,
    _crop: input.crop,
    _quantity_kg: input.quantityKg,
  });
  if (error) throw new Error(error.message);
  return data as Booking;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await rpc("cancel_booking", { _booking_id: bookingId });
  if (error) throw new Error(error.message);
}

export async function fetchQueueInfo(bookingId: string) {
  const { data, error } = await rpc("queue_info", { _booking_id: bookingId });
  if (error) throw new Error(error.message);
  const rows = (data as { ahead: number; est_minutes: number }[]) ?? [];
  return rows[0] ?? { ahead: 0, est_minutes: 0 };
}

export async function fetchMyBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("farmer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCenterBookings(centerId: string, date: string) {
  const { data: slots, error: slotErr } = await supabase
    .from("slots")
    .select("id, start_time, end_time")
    .eq("center_id", centerId)
    .eq("slot_date", date);
  if (slotErr) throw new Error(slotErr.message);
  const ids = (slots ?? []).map((s) => s.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .in("slot_id", ids)
    .order("token_number");
  if (error) throw new Error(error.message);
  const slotById = new Map((slots ?? []).map((s) => [s.id, s]));
  return (data ?? []).map((b) => ({
    ...b,
    slot: slotById.get(b.slot_id) ?? null,
  }));
}

export async function fetchProfiles(ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function updateBooking(
  id: string,
  patch: Partial<Pick<Booking, "status" | "recorded_weight_kg" | "notes">>,
) {
  const { error } = await supabase.from("bookings").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
