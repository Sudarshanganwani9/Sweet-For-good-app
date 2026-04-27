import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Charity = {
  id: string; name: string; slug: string; short_description: string | null;
  image_url: string | null; category: string | null;
};

export default function Charities() {
  const [items, setItems] = useState<Charity[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("charities").select("id,name,slug,short_description,image_url,category")
      .order("featured", { ascending: false }).order("name")
      .then(({ data }) => setItems((data ?? []) as Charity[]));
  }, []);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  const filtered = items.filter((i) => {
    const matchQ = !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.short_description?.toLowerCase().includes(q.toLowerCase());
    const matchCat = !cat || i.category === cat;
    return matchQ && matchCat;
  });

  return (
    <AppLayout>
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Causes</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            Find a <span className="font-serif-display text-gradient">cause</span> that moves you.
          </h1>
          <p className="text-lg text-muted-foreground">
            Each charity is vetted. Your subscription powers their mission month after month.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search charities…"
              className="pl-11 h-12 rounded-full"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setCat(null)} className={`px-4 h-12 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${!cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>All</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`px-4 h-12 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
            >
              <Link to={`/charities/${c.slug}`} className="block group glass rounded-2xl overflow-hidden hover:border-primary/40 transition-colors">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={c.image_url ?? ""} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <div className="p-5">
                  {c.category && <span className="text-xs text-accent uppercase tracking-widest font-medium">{c.category}</span>}
                  <h3 className="text-xl font-semibold mt-1 mb-2">{c.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.short_description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground">No charities match your search.</p>}
        </div>
      </section>
    </AppLayout>
  );
}