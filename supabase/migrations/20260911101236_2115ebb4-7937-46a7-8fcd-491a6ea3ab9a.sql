GRANT SELECT ON public.centers TO anon, authenticated;
GRANT SELECT ON public.slots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.centers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.centers, public.slots, public.bookings, public.profiles, public.user_roles TO service_role;