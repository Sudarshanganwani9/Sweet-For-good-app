import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Sparkles, Trophy, Users, Wallet, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Charity = {
  id: string; name: string; slug: string; short_description: string | null;
  image_url: string | null; category: string | null;
};

export default function Index() {
  const [featured, setFeatured] = useState<Charity[]>([]);

  useEffect(() => {
    supabase.from("charities").select("id,name,slug,short_description,image_url,category")
      .eq("featured", true).limit(3).then(({ data }) => setFeatured((data ?? []) as Charity[]));
  }, []);

  return (
    <AppLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px] animate-pulse-glow" />
          <div className="absolute top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/30 blur-[120px] animate-pulse-glow" />
        </div>

        <div className="container relative pt-20 md:pt-32 pb-24 md:pb-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              A new kind of community — built around generosity
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6">
              <span className="text-foreground">Play.</span>{" "}
              <span className="text-gradient-brand">Win.</span>{" "}
              <span className="font-serif-display text-gradient">Give back.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Track your scores, enter monthly prize draws, and fund a cause that matters to you —
              every subscription powers real change.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="xl" className="group">
                  Start your impact
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="outline" size="xl">How it works</Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-12 mt-20 max-w-2xl mx-auto">
              {[
                { value: "$2.4M", label: "Raised for charity" },
                { value: "12K+", label: "Active members" },
                { value: "47", label: "Causes supported" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-4xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-24 md:py-32">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3">The flow</p>
          <h2 className="text-4xl md:text-6xl font-bold mb-4">
            Four steps. <span className="font-serif-display text-gradient">Real impact.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Wallet, title: "Subscribe", text: "Choose monthly or yearly. Cancel any time." },
            { icon: Heart, title: "Pick your cause", text: "10% of every subscription — or more — goes to a charity you select." },
            { icon: Calendar, title: "Log your scores", text: "Enter your last 5 Stableford scores. Each one is a draw entry." },
            { icon: Trophy, title: "Win monthly", text: "Match 3, 4, or 5 numbers. Jackpots roll over until claimed." },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass rounded-2xl p-6 hover:border-primary/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary grid place-items-center mb-4">
                <step.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">Step {i + 1}</div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CHARITY SPOTLIGHT */}
      <section className="container py-24 md:py-32">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Causes in focus</p>
            <h2 className="text-4xl md:text-6xl font-bold">
              <span className="font-serif-display text-gradient">Featured</span> charities
            </h2>
          </div>
          <Link to="/charities">
            <Button variant="outline">Explore all <ArrowRight /></Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {featured.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/charities/${c.slug}`} className="block group">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-4">
                  <img
                    src={c.image_url ?? ""}
                    alt={c.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  {c.category && (
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-full glass text-xs font-medium">
                      {c.category}
                    </span>
                  )}
                  <div className="absolute bottom-0 p-6 w-full">
                    <h3 className="text-2xl font-semibold mb-2">{c.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.short_description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-primary p-12 md:p-20 text-center"
        >
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent blur-3xl" />
          </div>
          <div className="relative">
            <Users className="w-12 h-12 mx-auto text-primary-foreground mb-6" />
            <h2 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Ready to <span className="font-serif-display">change the game?</span>
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
              Join thousands turning every round into a force for good.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="xl" className="bg-foreground text-background hover:bg-foreground/90">
                Get started — it's quick
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </AppLayout>
  );
}
