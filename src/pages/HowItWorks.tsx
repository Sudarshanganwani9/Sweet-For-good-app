import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Trophy, Wallet, Calendar, ShieldCheck, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

export default function HowItWorks() {
  const steps = [
    { icon: Wallet, title: "Subscribe", desc: "Pick monthly ($10) or yearly ($100, two months free). Cancel any time.", color: "from-primary to-accent" },
    { icon: Heart, title: "Choose your charity", desc: "A minimum of 10% of every payment goes to a cause you select. Bump it up to 100% if you wish.", color: "from-accent to-neon" },
    { icon: Calendar, title: "Log your scores", desc: "Enter your last 5 Stableford scores (1–45). Each is a number in your draw entry. Only the latest five count.", color: "from-neon to-primary" },
    { icon: Trophy, title: "Win the draw", desc: "Each month we run a 5/4/3-number match. 40% of the pool goes to 5-match (rolls over if no winner).", color: "from-primary to-accent" },
    { icon: ShieldCheck, title: "Verify & get paid", desc: "Winners upload a screenshot of their golf platform. Admin verifies, marks as paid.", color: "from-accent to-primary" },
  ];
  return (
    <AppLayout>
      <section className="container py-16 md:py-28">
        <div className="max-w-3xl mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3 inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> The mechanics
          </p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Simple to play. <span className="font-serif-display text-gradient">Honest in impact.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Five steps from sign up to celebration. Here's exactly how it works.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start"
            >
              <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${step.color} grid place-items-center`}>
                <step.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Step {i + 1}</p>
                <h2 className="text-2xl font-semibold mb-2">{step.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="glass rounded-3xl p-8 md:p-12 mt-16">
          <h2 className="text-3xl font-bold mb-6">Prize pool breakdown</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { tier: "5-Number Match", pct: "40%", note: "Jackpot — rolls over" },
              { tier: "4-Number Match", pct: "35%", note: "Split among winners" },
              { tier: "3-Number Match", pct: "25%", note: "Split among winners" },
            ].map((p) => (
              <div key={p.tier} className="rounded-2xl p-6 bg-secondary/40 border border-border">
                <p className="text-sm text-muted-foreground">{p.tier}</p>
                <p className="text-4xl font-bold text-gradient my-2">{p.pct}</p>
                <p className="text-xs text-muted-foreground">{p.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link to="/auth?mode=signup">
            <Button variant="hero" size="xl">Start now <ArrowRight /></Button>
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}