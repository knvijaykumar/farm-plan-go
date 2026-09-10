import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Easy FARM procurement booking" },
      {
        name: "description",
        content:
          "Sign in or create your Easy FARM account to book a procurement slot and get a digital token.",
      },
      { property: "og:title", content: "Sign in · Easy FARM" },
      {
        property: "og:description",
        content: "Book procurement slots and track your crop token with Easy FARM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirm(true);
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-32 -left-24 size-[520px] rounded-full bg-brand/40 blur-3xl" />
      <div className="pointer-events-none absolute top-16 right-0 size-[460px] rounded-full bg-accent/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-6 flex items-center gap-3">
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

        <div className="glass shadow-glass rounded-3xl border border-glassline p-6">
          {sentConfirm ? (
            <div>
              <h1 className="font-display text-2xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-foreground/60">
                We sent a confirmation link to {email}. Open it to activate your account, then sign
                in.
              </p>
              <button
                onClick={() => {
                  setSentConfirm(false);
                  setMode("signin");
                }}
                className="mt-5 w-full rounded-xl border border-input bg-secondary px-5 py-3 text-sm font-semibold"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
                {mode === "signin" ? "Welcome back" : "New farmer"}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                {mode === "signin" ? "Sign in to Easy FARM" : "Create your account"}
              </h1>

              <button
                onClick={googleSignIn}
                className="mt-5 w-full rounded-xl border border-input bg-secondary px-5 py-3 text-sm font-semibold"
              >
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] tracking-widest text-foreground/40 uppercase">
                <span className="h-px flex-1 bg-input" />
                or
                <span className="h-px flex-1 bg-input" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "signup" ? (
                  <>
                    <div>
                      <label className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                        Full name
                      </label>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-input bg-secondary px-4 py-3 text-sm outline-none focus:border-brand"
                        placeholder="Ravi Sharma"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                        Phone
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-input bg-secondary px-4 py-3 text-sm outline-none focus:border-brand"
                        placeholder="98765 43210"
                      />
                    </div>
                  </>
                ) : null}
                <div>
                  <label className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-input bg-secondary px-4 py-3 text-sm outline-none focus:border-brand"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium tracking-wide text-foreground/45 uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-xl border border-input bg-secondary px-4 py-3 text-sm outline-none focus:border-brand"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="shadow-brand w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-foreground/55">
                {mode === "signin" ? "New to Easy FARM?" : "Already registered?"}{" "}
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-semibold text-brand"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
