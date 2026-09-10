-- roles
CREATE TYPE public.app_role AS ENUM ('farmer','staff','admin');
CREATE TYPE public.booking_status AS ENUM ('booked','verified','in_queue','weighing','completed','cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  village text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_officer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('staff','admin'));
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_officer(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- centers
CREATE TABLE public.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  district text NOT NULL,
  address text NOT NULL DEFAULT '',
  crops text[] NOT NULL DEFAULT '{}',
  opens_at time NOT NULL DEFAULT '09:00',
  closes_at time NOT NULL DEFAULT '17:00',
  slot_minutes int NOT NULL DEFAULT 30,
  slot_capacity int NOT NULL DEFAULT 6,
  avg_minutes_per_farmer int NOT NULL DEFAULT 12,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.centers TO anon, authenticated;
GRANT ALL ON public.centers TO service_role;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centers public read" ON public.centers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage centers" ON public.centers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- slots
CREATE TABLE public.slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity int NOT NULL DEFAULT 6,
  booked_count int NOT NULL DEFAULT 0,
  UNIQUE (center_id, slot_date, start_time)
);
GRANT SELECT ON public.slots TO anon, authenticated;
GRANT ALL ON public.slots TO service_role;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots public read" ON public.slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "officers manage slots" ON public.slots FOR ALL TO authenticated
  USING (public.is_officer(auth.uid())) WITH CHECK (public.is_officer(auth.uid()));

-- bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE,
  farmer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  crop text NOT NULL,
  quantity_kg numeric NOT NULL CHECK (quantity_kg > 0),
  status public.booking_status NOT NULL DEFAULT 'booked',
  token_number int NOT NULL DEFAULT 0,
  recorded_weight_kg numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or officer" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR public.is_officer(auth.uid()));
CREATE POLICY "farmer updates own" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id OR public.is_officer(auth.uid()))
  WITH CHECK (auth.uid() = farmer_id OR public.is_officer(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bookings_touch BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- new user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'farmer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- slot generation
CREATE OR REPLACE FUNCTION public.list_slots(_center_id uuid, _date date)
RETURNS SETOF public.slots
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.centers%ROWTYPE; t time;
BEGIN
  SELECT * INTO c FROM public.centers WHERE id = _center_id;
  IF NOT FOUND THEN RETURN; END IF;
  t := c.opens_at;
  WHILE t + (c.slot_minutes || ' minutes')::interval <= c.closes_at LOOP
    INSERT INTO public.slots (center_id, slot_date, start_time, end_time, capacity)
    VALUES (_center_id, _date, t, (t + (c.slot_minutes || ' minutes')::interval)::time, c.slot_capacity)
    ON CONFLICT (center_id, slot_date, start_time) DO NOTHING;
    t := (t + (c.slot_minutes || ' minutes')::interval)::time;
  END LOOP;
  RETURN QUERY SELECT * FROM public.slots s
    WHERE s.center_id = _center_id AND s.slot_date = _date ORDER BY s.start_time;
END; $$;
GRANT EXECUTE ON FUNCTION public.list_slots(uuid, date) TO anon, authenticated;

-- booking creation with capacity check
CREATE OR REPLACE FUNCTION public.book_slot(_slot_id uuid, _crop text, _quantity_kg numeric)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.slots%ROWTYPE; b public.bookings%ROWTYPE; n int; code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO s FROM public.slots WHERE id = _slot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
  IF s.booked_count >= s.capacity THEN RAISE EXCEPTION 'This slot is full'; END IF;
  SELECT COUNT(*) + 1 INTO n FROM public.bookings bb
    JOIN public.slots ss ON ss.id = bb.slot_id
    WHERE ss.center_id = s.center_id AND ss.slot_date = s.slot_date AND bb.status <> 'cancelled';
  code := 'EF-' || to_char(s.slot_date,'YYMMDD') || '-' || lpad(n::text, 3, '0');
  INSERT INTO public.bookings (booking_code, farmer_id, center_id, slot_id, crop, quantity_kg, token_number)
  VALUES (code, auth.uid(), s.center_id, s.id, _crop, _quantity_kg, n)
  RETURNING * INTO b;
  UPDATE public.slots SET booked_count = booked_count + 1 WHERE id = s.id;
  RETURN b;
END; $$;
GRANT EXECUTE ON FUNCTION public.book_slot(uuid, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.farmer_id <> auth.uid() AND NOT public.is_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed'; END IF;
  IF b.status = 'cancelled' THEN RETURN; END IF;
  UPDATE public.bookings SET status = 'cancelled' WHERE id = _booking_id;
  UPDATE public.slots SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = b.slot_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

INSERT INTO public.centers (name, code, district, address, crops, opens_at, closes_at, slot_minutes, slot_capacity, avg_minutes_per_farmer) VALUES
 ('Grain Hub 7 · Khed Mandi','GH7','Pune','Market Yard Road, Khed', ARRAY['Wheat','Paddy','Gram'], '09:00','17:00',30,6,12),
 ('Tanda Pauda North Yard','TPN','Nashik','NH-60 Bypass, Tanda Pauda', ARRAY['Soybean','Sunflower','Wheat'], '08:30','16:30',30,5,15),
 ('Kolhapur District Centre','KDC','Kolhapur','APMC Complex, Shahupuri', ARRAY['Paddy','Cotton','Gram'], '09:30','18:00',45,8,10);