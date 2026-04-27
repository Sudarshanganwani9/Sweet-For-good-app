import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Charity = {
  id: string; name: string; slug: string; short_description: string | null; description: string | null;
  image_url: string | null; category: string | null;
  upcoming_event_title: string | null; upcoming_event_date: string | null; upcoming_event_description: string | null;
  total_raised: number;
};

export default function CharityDetail() {
  const { slug } = useParams();
  const [c, setC] = useState<Charity | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase.from("charities").select("*").eq("slug", slug).maybeSingle().then(({ data }) => setC(data as Charity | null));
  }, [slug]);

  if (!c) return <AppLayout><div className="container py-24 text-center text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <article className="container py-12 md:py-16 max-w-5xl">
        <Link to="/charities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> All charities
        </Link>

        <div className="aspect-[16/8] rounded-3xl overflow-hidden mb-10">
          <img src={c.image_url ?? ""} alt={c.name} className="w-full h-full object-cover" />
        </div>

        {c.category && <p className="text-sm font-medium text-accent uppercase tracking-widest mb-3">{c.category}</p>}
        <h1 className="text-4xl md:text-6xl font-bold mb-4">{c.name}</h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-3xl">{c.short_description}</p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 prose prose-invert max-w-none">
            <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{c.description}</p>
          </div>
          <aside className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Total raised</p>
              <p className="text-3xl font-bold text-gradient">${Number(c.total_raised).toLocaleString()}</p>
              <Link to="/subscribe">
                <Button variant="hero" className="w-full mt-4">Support this cause</Button>
              </Link>
            </div>
            {c.upcoming_event_title && (
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-accent text-sm mb-2">
                  <Calendar className="w-4 h-4" /> Upcoming event
                </div>
                <h3 className="font-semibold text-lg mb-1">{c.upcoming_event_title}</h3>
                {c.upcoming_event_date && <p className="text-sm text-muted-foreground mb-2">{new Date(c.upcoming_event_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>}
                <p className="text-sm text-muted-foreground">{c.upcoming_event_description}</p>
              </div>
            )}
          </aside>
        </div>
      </article>
    </AppLayout>
  );
}