import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [accountType, setAccountType] = useState<"user" | "admin">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(isAdmin && accountType === "admin" ? "/admin" : "/dashboard");
  }, [user, isAdmin, accountType, navigate]);

  async function ensureAdminRole(code: string) {
    const { data, error } = await supabase.functions.invoke("promote-admin", {
      body: { code },
    });
    if (error || (data as any)?.error) {
      throw new Error((data as any)?.error || error?.message || "Invalid admin code");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;

        const alreadySignedIn = Boolean(signUpData.session);
        if (!alreadySignedIn) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        }

        if (accountType === "admin") {
          await ensureAdminRole(adminCode);
          toast.success("Admin account created — welcome!");
          navigate("/admin");
        } else {
          toast.success("Account created — welcome!");
          navigate("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (accountType === "admin") {
          if (adminCode) await ensureAdminRole(adminCode);
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user.id;
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid!)
            .eq("role", "admin")
            .maybeSingle();
          if (!roles) {
            await supabase.auth.signOut();
            throw new Error("This account does not have admin access. Enter the admin access code and try again.");
          }
          toast.success("Welcome back, Admin!");
          navigate("/admin");
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
      if (/invalid login credentials/i.test(msg)) {
        toast.error("Incorrect email or password. Please try again.");
      } else if (/already registered|already been registered|user already|already exists/i.test(msg)) {
        toast.error("This email is already registered. Please sign in instead.");
        setMode("signin");
        setPassword("");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero grid place-items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl p-8 md:p-10"
      >
        <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-8 justify-center">
          <div className="w-9 h-9 rounded-full bg-gradient-primary grid place-items-center">
            <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="text-gradient">SwingForGood</span>
        </Link>

        <h1 className="text-3xl font-bold mb-2 text-center">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {mode === "signup" ? "Join the movement in 30 seconds." : "Sign in to your dashboard."}
        </p>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 mb-6">
          <button
            type="button"
            onClick={() => setAccountType("user")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
              accountType === "user" ? "bg-gradient-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4" /> User
          </button>
          <button
            type="button"
            onClick={() => setAccountType("admin")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
              accountType === "admin" ? "bg-gradient-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" /> Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {accountType === "admin" && (
            <div>
              <Label htmlFor="adminCode">Admin access code</Label>
              <Input
                id="adminCode"
                type="password"
                required={mode === "signup"}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter the secret admin code"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Admin access code: 1234
              </p>
            </div>
          )}
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground mt-6">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-primary hover:underline font-medium"
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}