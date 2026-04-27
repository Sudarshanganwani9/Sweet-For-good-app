import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

type Draw = {
  id: string; draw_month: number; draw_year: number; status: string;
  winning_numbers: number[]; prize_pool: number; jackpot_rollover: number;
  total_subscribers: number; published_at: string | null;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Draws() {
  const [draws, setDraws] = useState<Draw[]>([]);
  useEffect(() => {
    supabase.from("draws").select("*").eq("status", "published")
      .order("draw_year", { ascending: false }).order("draw_month", { ascending: false })
      .then(({ data }) => setDraws((data ?? []) as Draw[]));
  }, []);

  return (
    <AppLayout>
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Monthly draws</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            Recent <span className="font-serif-display text-gradient">winners</span>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Every month we publish the winning numbers and the prize pool. Transparent, every time.
          </p>
        </div>

        {draws.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
            No draws published yet — the first one will appear here at the end of the month.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {draws.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Draw</p>
                    <h3 className="text-2xl font-bold">{MONTHS[d.draw_month - 1]} {d.draw_year}</h3>
                  </div>
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {d.winning_numbers.map((n, idx) => (
                    <div key={idx} className="w-12 h-12 rounded-full bg-gradient-primary grid place-items-center font-bold text-primary-foreground">
                      {n}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-muted-foreground text-xs">Prize pool</p>
                    <p className="font-semibold">${Number(d.prize_pool).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-muted-foreground text-xs">Subscribers</p>
                    <p className="font-semibold">{d.total_subscribers}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}