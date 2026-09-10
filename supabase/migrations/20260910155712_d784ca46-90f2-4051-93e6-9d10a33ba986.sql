CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION private.is_officer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('staff','admin'));
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION private.is_officer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_officer(uuid) TO authenticated;

DROP POLICY "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR private.is_officer(auth.uid()));
DROP POLICY "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'));
DROP POLICY "admins manage centers" ON public.centers;
CREATE POLICY "admins manage centers" ON public.centers FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
DROP POLICY "officers manage slots" ON public.slots;
CREATE POLICY "officers manage slots" ON public.slots FOR ALL TO authenticated
  USING (private.is_officer(auth.uid())) WITH CHECK (private.is_officer(auth.uid()));
DROP POLICY "read own or officer" ON public.bookings;
CREATE POLICY "read own or officer" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR private.is_officer(auth.uid()));
DROP POLICY "farmer updates own" ON public.bookings;
CREATE POLICY "farmer updates own" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id OR private.is_officer(auth.uid()))
  WITH CHECK (auth.uid() = farmer_id OR private.is_officer(auth.uid()));

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.farmer_id <> auth.uid() AND NOT private.is_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed'; END IF;
  IF b.status = 'cancelled' THEN RETURN; END IF;
  UPDATE public.bookings SET status = 'cancelled' WHERE id = _booking_id;
  UPDATE public.slots SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = b.slot_id;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_officer(uuid);