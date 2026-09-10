import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSession, initials } from "@/hooks/useAuth";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
      activeProps={{ className: "rounded-lg bg-brand/15 px-3.5 py-2 text-sm font-semibold text-foreground" }}
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const { data: roles } = useRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isOfficer = (roles ?? []).some((r) => r === "staff" || r === "admin");
  const isAdmin = (roles ?? []).some((r) => r === "admin");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-32 -left-24 size-[520px] rounded-full bg-brand/40 blur-3xl" />
      <div className="pointer-events-none absolute top-16 right-0 size-[460px] rounded-full bg-accent/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[380px] rounded-full bg-brand-soft/50 blur-3xl" />

      <div className="relative mx-auto max-w-[1360px] px-5 py-5">
        <nav className="glass flex items-center justify-between rounded-2xl border border-glassline px-5 py-3.5 shadow-sm">
          <Link to="/" className="flex items-center gap-3">
            <div className="shadow-brand grid size-10 place-items-center rounded-xl bg-brand">
              <span className="font-display text-lg font-extrabold text-primary-foreground">F</span>
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold tracking-tight">Easy FARM</p>
              <p className="text-[11px] font-medium tracking-[0.18em] text-foreground/45 uppercase">
                Procurement Platform
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <NavLink to="/book">Book a slot</NavLink>
            <NavLink to="/dashboard">My token</NavLink>
            <NavLink to="/bookings">Tracking</NavLink>
            {isOfficer ? <NavLink to="/desk">Center desk</NavLink> : null}
            {isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] leading-none font-semibold">
                {profile?.full_name || session?.user.email || "Farmer"}
              </p>
              <button
                onClick={signOut}
                className="mt-1 text-[11px] text-foreground/45 transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-accent/20 font-display text-sm font-bold text-accent-foreground">
              {initials(profile?.full_name, session?.user.email)}
            </div>
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}
