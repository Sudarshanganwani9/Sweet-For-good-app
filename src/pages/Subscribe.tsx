import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Heart } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type Charity = { id: string; name: string; image_url: string | null; category: string | null };

export default function Subscribe() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [charities, setCharities] = useState<Charity[]>([]);
  const [charityId, setCharityId] = useState<string | null>(null);
  const [pct, setPct] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?mode=signup");
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("charities").select("id,name,image_url,category").order("name")
      .then(({ data }) => {
        const list = (data ?? []) as Charity[];
        setCharities(list);
        if (list.length && !charityId) setCharityId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fee = plan === "monthly" ? 10 : 100;
  const charityCut = ((fee * pct) / 100).toFixed(2);

  async function activate() {
    if (!user || !charityId) return;
    setSubmitting(true);
    try {
      const periodEnd = new Date();
      if (plan === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const { error } = await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan,
        status: "active" as const,
        charity_id: charityId,
        charity_percentage: pct,
        monthly_fee: plan === "monthly" ? 10 : 100 / 12,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("You're subscribed! Welcome to the movement.");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <section className="container py-12 md:py-20 max-w-5xl">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Choose your plan</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Pick a <span className="font-serif-display text-gradient">plan</span> & a cause.
          </h1>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {(["monthly", "yearly"] as const).map((p) => (
            <motion.button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`text-left rounded-2xl p-6 border-2 transition-all ${plan === p ? "border-primary bg-secondary/40 glow-ring" : "border-border bg-secondary/20"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-semibold capitalize">{p}</h3>
                {plan === p && <Check className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-4xl font-bold text-gradient mb-1">${p === "monthly" ? 10 : 100}<span className="text-base font-normal text-muted-foreground">/{p === "monthly" ? "mo" : "yr"}</span></p>
              <p className="text-sm text-muted-foreground">{p === "yearly" ? "Save 16% — two months free" : "Cancel anytime"}</p>
            </motion.button>
          ))}
        </div>

        {/* Charity */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-accent" /> Pick your charity</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {charities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCharityId(c.id)}
                className={`text-left rounded-xl overflow-hidden border-2 transition-all ${charityId === c.id ? "border-primary" : "border-border hover:border-primary/40"}`}
              >
                <div className="aspect-[3/2] overflow-hidden">
                  <img src={c.image_url ?? ""} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-accent">{c.category}</p>
                  <p className="font-medium text-sm">{c.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Charity % */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Your contribution</h3>
            <p className="text-2xl font-bold text-gradient">{pct}%</p>
          </div>
          <Slider value={[pct]} onValueChange={(v) => setPct(v[0])} min={10} max={100} step={5} />
          <p className="text-sm text-muted-foreground mt-3">
            ${charityCut} of your ${fee} {plan === "monthly" ? "monthly" : "yearly"} payment goes directly to your chosen charity.
          </p>
        </div>

        <Button variant="hero" size="xl" className="w-full" onClick={activate} disabled={submitting || !charityId}>
          {submitting ? "Activating…" : `Subscribe — $${fee}/${plan === "monthly" ? "month" : "year"}`}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Demo mode — no real payment is processed.
        </p>
      </section>
    </AppLayout>
  );
}