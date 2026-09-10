CREATE OR REPLACE FUNCTION public.queue_info(_booking_id uuid)
RETURNS TABLE (ahead int, est_minutes int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings%ROWTYPE; s public.slots%ROWTYPE; c public.centers%ROWTYPE; a int;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF b.farmer_id <> auth.uid() AND NOT private.is_officer(auth.uid()) THEN RETURN; END IF;
  SELECT * INTO s FROM public.slots WHERE id = b.slot_id;
  SELECT * INTO c FROM public.centers WHERE id = b.center_id;
  SELECT COUNT(*) INTO a FROM public.bookings bb
    JOIN public.slots ss ON ss.id = bb.slot_id
   WHERE ss.center_id = s.center_id AND ss.slot_date = s.slot_date
     AND bb.token_number < b.token_number
     AND bb.status IN ('booked','verified','in_queue','weighing');
  ahead := a;
  est_minutes := a * COALESCE(c.avg_minutes_per_farmer, 12);
  RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION public.queue_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_info(uuid) TO authenticated;