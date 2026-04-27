import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Plus, Trash2, Heart, Trophy, Upload, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type Sub = {
  id: string; plan: string; status: string; charity_id: string | null; charity_percentage: number;
  monthly_fee: number; current_period_end: string;
};
type Score = { id: string; score: number; played_on: string };
type Charity = { id: string; name: string };
type Winner = {
  id: string; tier: string; prize_amount: number; verification_status: string; payment_status: string;
  proof_url: string | null; draw_id: string;
};

const TIER_LABEL: Record<string, string> = { match_5: "5-Number Match", match_4: "4-Number Match", match_3: "3-Number Match" };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sub, setSub] = useState<Sub | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [scoreVal, setScoreVal] = useState("");
  const [scoreDate, setScoreDate] = useState(new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  async function refresh() {
    if (!user) return;
    const [{ data: subData }, { data: scoreData }, { data: chData }, { data: winData }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("scores").select("*").eq("user_id", user.id).order("played_on", { ascending: false }),
      supabase.from("charities").select("id,name").order("name"),
      supabase.from("winners").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSub(subData as Sub | null);
    setScores((scoreData ?? []) as Score[]);
    setCharities((chData ?? []) as Charity[]);
    setWinners((winData ?? []) as Winner[]);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  async function addScore(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const v = parseInt(scoreVal);
    if (isNaN(v) || v < 1 || v > 45) return toast.error("Score must be between 1 and 45");
    const { error } = await supabase.from("scores").insert({ user_id: user.id, score: v, played_on: scoreDate });
    if (error) {
      if (error.code === "23505") toast.error("You already have a score for that date — edit it instead.");
      else toast.error(error.message);
      return;
    }
    setScoreVal(""); refresh();
    toast.success("Score added");
  }

  async function saveEdit(id: string) {
    const v = parseInt(editVal);
    if (isNaN(v) || v < 1 || v > 45) return toast.error("Score must be 1–45");
    const { error } = await supabase.from("scores").update({ score: v }).eq("id", id);
    if (error) toast.error(error.message);
    else { setEditing(null); refresh(); }
  }

  async function deleteScore(id: string) {
    await supabase.from("scores").delete().eq("id", id);
    refresh();
  }

  async function updateCharity(charityId: string) {
    if (!sub) return;
    await supabase.from("subscriptions").update({ charity_id: charityId }).eq("id", sub.id);
    refresh(); toast.success("Charity updated");
  }

  async function updatePct(p: number) {
    if (!sub) return;
    await supabase.from("subscriptions").update({ charity_percentage: p }).eq("id", sub.id);
    setSub({ ...sub, charity_percentage: p });
  }

  async function uploadProof(winnerId: string, file: File) {
    if (!user) return;
    const path = `${user.id}/${winnerId}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("winner-proofs").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.from("winners").update({ proof_url: path }).eq("id", winnerId);
    if (error) toast.error(error.message);
    else { toast.success("Proof uploaded — admin will review"); refresh(); }
  }

  if (loading) return <AppLayout><div className="container py-24 text-center">Loading…</div></AppLayout>;

  // No subscription state
  if (!sub) {
    return (
      <AppLayout>
        <section className="container py-16 max-w-2xl">
          <div className="glass rounded-3xl p-10 text-center">
            <Heart className="w-12 h-12 mx-auto text-accent mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome aboard.</h1>
            <p className="text-muted-foreground mb-6">Pick your plan and your charity to start playing the monthly draws.</p>
            <Button variant="hero" size="lg" onClick={() => navigate("/subscribe")}>Choose your plan</Button>
          </div>
        </section>
      </AppLayout>
    );
  }

  const totalWon = winners.filter((w) => w.verification_status === "approved").reduce((a, w) => a + Number(w.prize_amount), 0);

  return (
    <AppLayout>
      <section className="container py-12 md:py-16 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-accent uppercase tracking-widest font-medium">Your dashboard</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Hi, {user?.email?.split("@")[0]}.
          </h1>
          <p className="text-muted-foreground mb-10">Manage your scores, charity, and winnings.</p>
        </motion.div>

        {/* Top stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Subscription</p>
            <p className="text-2xl font-bold capitalize mt-1">{sub.plan} <span className={`text-sm font-medium ml-1 ${sub.status === "active" ? "text-neon" : "text-destructive"}`}>● {sub.status}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Renews {new Date(sub.current_period_end).toLocaleDateString()}</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Scores logged</p>
            <p className="text-2xl font-bold mt-1">{scores.length} / 5</p>
            <p className="text-xs text-muted-foreground mt-1">Latest 5 used in draws</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Total won</p>
            <p className="text-2xl font-bold text-gradient mt-1">${totalWon.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{winners.length} entries</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* SCORES */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-accent" /> Your scores</h3>
            <form onSubmit={addScore} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-4">
              <Input type="number" min={1} max={45} placeholder="Score (1–45)" value={scoreVal} onChange={(e) => setScoreVal(e.target.value)} />
              <Input type="date" value={scoreDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setScoreDate(e.target.value)} />
              <Button type="submit" size="icon" variant="hero"><Plus /></Button>
            </form>
            {scores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No scores yet — add your first one.</p>
            ) : (
              <ul className="space-y-2">
                {scores.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary grid place-items-center font-bold text-primary-foreground">{s.score}</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{new Date(s.played_on).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                    {editing === s.id ? (
                      <>
                        <Input type="number" className="w-20 h-9" value={editVal} onChange={(e) => setEditVal(e.target.value)} />
                        <Button size="sm" onClick={() => saveEdit(s.id)}>Save</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(s.id); setEditVal(String(s.score)); }}>Edit</Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteScore(s.id)}><Trash2 className="w-4 h-4" /></Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              Only the latest 5 are kept — adding a 6th replaces the oldest.
            </p>
          </div>

          {/* CHARITY */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-accent" /> Your charity</h3>
            <Label htmlFor="charity-sel" className="text-xs">Charity</Label>
            <select
              id="charity-sel"
              value={sub.charity_id ?? ""}
              onChange={(e) => updateCharity(e.target.value)}
              className="w-full h-11 rounded-xl bg-secondary/40 border border-border px-3 text-sm mb-5"
            >
              {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Contribution percentage</Label>
              <span className="text-2xl font-bold text-gradient">{sub.charity_percentage}%</span>
            </div>
            <Slider value={[sub.charity_percentage]} onValueChange={(v) => updatePct(v[0])} min={10} max={100} step={5} />
            <p className="text-sm text-muted-foreground mt-3">
              ${((Number(sub.monthly_fee) * sub.charity_percentage) / 100).toFixed(2)} of every ${Number(sub.monthly_fee).toFixed(2)} payment.
            </p>
          </div>

          {/* WINNINGS */}
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" /> Your winnings</h3>
            {winners.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No wins yet — keep playing! Draws happen monthly.</p>
            ) : (
              <ul className="space-y-3">
                {winners.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-secondary/40">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-semibold">{TIER_LABEL[w.tier]}</p>
                      <p className="text-2xl font-bold text-gradient">${Number(w.prize_amount).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="px-2 py-1 rounded-full bg-secondary text-center">Verification: <b className="capitalize">{w.verification_status}</b></span>
                      <span className="px-2 py-1 rounded-full bg-secondary text-center">Payment: <b className="capitalize">{w.payment_status}</b></span>
                    </div>
                    {!w.proof_url && w.verification_status === "pending" && (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadProof(w.id, e.target.files[0])} />
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium"><Upload className="w-3 h-3" /> Upload proof</span>
                      </label>
                    )}
                    {w.proof_url && <span className="text-xs text-neon">✓ Proof uploaded</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}