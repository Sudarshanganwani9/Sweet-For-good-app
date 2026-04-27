import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Heart, BarChart3, Check, X } from "lucide-react";

const TIER_LABEL: Record<string, string> = { match_5: "5-Match", match_4: "4-Match", match_3: "3-Match" };

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, subs: 0, totalPool: 0, totalCharity: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);

  // Draw form
  const now = new Date();
  const [drawMonth, setDrawMonth] = useState(now.getMonth() + 1);
  const [drawYear, setDrawYear] = useState(now.getFullYear());
  const [drawLogic, setDrawLogic] = useState<"random" | "algorithmic">("random");
  const [simResult, setSimResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  // New charity
  const [newCharity, setNewCharity] = useState({ name: "", slug: "", short_description: "", description: "", image_url: "", category: "" });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !isAdmin) {
      toast.error("Admin access required. You can grant yourself admin via the backend (user_roles table).");
      navigate("/dashboard");
    }
  }, [user, isAdmin, loading, navigate]);

  async function refresh() {
    const [{ data: profs }, { data: subs }, { data: ch }, { data: wins }, { data: drws }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("charities").select("*").order("name"),
      supabase.from("winners").select("*, draws(draw_month, draw_year)").order("created_at", { ascending: false }),
      supabase.from("draws").select("*").order("draw_year", { ascending: false }).order("draw_month", { ascending: false }),
    ]);
    setUsers(profs ?? []);
    setCharities(ch ?? []);
    setWinners(wins ?? []);
    setDraws(drws ?? []);
    const totalPool = (drws ?? []).reduce((a: number, d: any) => a + Number(d.prize_pool ?? 0), 0);
    const totalCharity = (subs ?? []).reduce((a: number, s: any) => a + (Number(s.monthly_fee) * Number(s.charity_percentage)) / 100, 0);
    setStats({ users: (profs ?? []).length, subs: (subs ?? []).length, totalPool, totalCharity });
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function runDraw(publish: boolean) {
    setRunning(true);
    setSimResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("run-draw", {
        body: { month: drawMonth, year: drawYear, logic: drawLogic, publish },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSimResult(data);
      toast.success(publish ? "Draw published!" : "Simulation complete");
      if (publish) refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setRunning(false);
    }
  }

  async function reviewWinner(id: string, status: "approved" | "rejected") {
    await supabase.from("winners").update({ verification_status: status }).eq("id", id);
    refresh();
  }
  async function markPaid(id: string) {
    await supabase.from("winners").update({ payment_status: "paid" }).eq("id", id);
    refresh();
  }
  async function deleteCharity(id: string) {
    await supabase.from("charities").delete().eq("id", id);
    refresh();
  }
  async function addCharity() {
    if (!newCharity.name || !newCharity.slug) return toast.error("Name & slug required");
    const { error } = await supabase.from("charities").insert(newCharity);
    if (error) toast.error(error.message);
    else { setNewCharity({ name: "", slug: "", short_description: "", description: "", image_url: "", category: "" }); refresh(); toast.success("Charity added"); }
  }

  if (loading || !isAdmin) return <AppLayout><div className="container py-24 text-center">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <section className="container py-12 max-w-6xl">
        <p className="text-sm text-accent uppercase tracking-widest font-medium">Control center</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Admin panel</h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Users, label: "Total users", value: stats.users },
            { icon: Heart, label: "Active subs", value: stats.subs },
            { icon: Trophy, label: "Prize pool (all-time)", value: `$${stats.totalPool.toFixed(0)}` },
            { icon: BarChart3, label: "Charity raised (monthly run-rate)", value: `$${stats.totalCharity.toFixed(0)}` },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-5">
              <s.icon className="w-5 h-5 text-accent mb-2" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="draws">
          <TabsList className="bg-secondary/40">
            <TabsTrigger value="draws">Draws</TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
            <TabsTrigger value="charities">Charities</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* DRAWS */}
          <TabsContent value="draws" className="space-y-6 mt-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Run a draw</h3>
              <div className="grid sm:grid-cols-4 gap-3 mb-4">
                <div><Label>Month</Label><Input type="number" min={1} max={12} value={drawMonth} onChange={(e) => setDrawMonth(+e.target.value)} /></div>
                <div><Label>Year</Label><Input type="number" value={drawYear} onChange={(e) => setDrawYear(+e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Logic</Label>
                  <select value={drawLogic} onChange={(e) => setDrawLogic(e.target.value as any)} className="w-full h-10 rounded-full bg-secondary/40 border border-border px-3 text-sm">
                    <option value="random">Random (lottery)</option>
                    <option value="algorithmic">Algorithmic (weighted)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => runDraw(false)} disabled={running}>Simulate</Button>
                <Button variant="hero" onClick={() => runDraw(true)} disabled={running}>Publish</Button>
              </div>
              {simResult && (
                <div className="mt-4 p-4 rounded-xl bg-secondary/40 text-sm">
                  <p className="font-semibold mb-2">{simResult.published ? "Published ✓" : "Simulation"}</p>
                  <div className="flex gap-2 mb-2">
                    {(simResult.winning_numbers ?? []).map((n: number, i: number) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center font-bold text-primary-foreground text-sm">{n}</div>
                    ))}
                  </div>
                  <p>Pool: <b>${simResult.prize_pool}</b> · Rollover: <b>${simResult.jackpot_rollover}</b> · Subs: <b>{simResult.total_subscribers}</b></p>
                  {simResult.winners_summary && <p>Winners — 5: {simResult.winners_summary.match_5}, 4: {simResult.winners_summary.match_4}, 3: {simResult.winners_summary.match_3}</p>}
                </div>
              )}
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Published draws</h3>
              {draws.filter((d) => d.status === "published").length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                <ul className="divide-y divide-border">
                  {draws.filter((d) => d.status === "published").map((d) => (
                    <li key={d.id} className="py-3 flex items-center justify-between text-sm">
                      <span>{d.draw_month}/{d.draw_year} — {d.winning_numbers.join(", ")}</span>
                      <span className="text-muted-foreground">${Number(d.prize_pool).toFixed(0)} pool</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* WINNERS */}
          <TabsContent value="winners" className="mt-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Winner verification</h3>
              {winners.length === 0 ? <p className="text-sm text-muted-foreground">No winners yet.</p> : (
                <ul className="space-y-3">
                  {winners.map((w) => (
                    <li key={w.id} className="p-4 rounded-xl bg-secondary/40 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-semibold">{TIER_LABEL[w.tier]} — ${Number(w.prize_amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">User: {w.user_id.slice(0, 8)}… · Draw {w.draws?.draw_month}/{w.draws?.draw_year}</p>
                        <p className="text-xs">Proof: {w.proof_url ? <span className="text-neon">uploaded</span> : <span className="text-muted-foreground">pending upload</span>}</p>
                      </div>
                      <div className="flex gap-1 text-xs">
                        <span className="px-2 py-1 rounded-full bg-secondary capitalize">V: {w.verification_status}</span>
                        <span className="px-2 py-1 rounded-full bg-secondary capitalize">P: {w.payment_status}</span>
                      </div>
                      <div className="flex gap-2">
                        {w.verification_status === "pending" && (
                          <>
                            <Button size="sm" variant="hero" onClick={() => reviewWinner(w.id, "approved")}><Check /></Button>
                            <Button size="sm" variant="outline" onClick={() => reviewWinner(w.id, "rejected")}><X /></Button>
                          </>
                        )}
                        {w.verification_status === "approved" && w.payment_status === "pending" && (
                          <Button size="sm" variant="neon" onClick={() => markPaid(w.id)}>Mark paid</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* CHARITIES */}
          <TabsContent value="charities" className="mt-6 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Add charity</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Name" value={newCharity.name} onChange={(e) => setNewCharity({ ...newCharity, name: e.target.value })} />
                <Input placeholder="Slug (url-friendly)" value={newCharity.slug} onChange={(e) => setNewCharity({ ...newCharity, slug: e.target.value })} />
                <Input placeholder="Category" value={newCharity.category} onChange={(e) => setNewCharity({ ...newCharity, category: e.target.value })} />
                <Input placeholder="Image URL" value={newCharity.image_url} onChange={(e) => setNewCharity({ ...newCharity, image_url: e.target.value })} />
                <Input className="sm:col-span-2" placeholder="Short description" value={newCharity.short_description} onChange={(e) => setNewCharity({ ...newCharity, short_description: e.target.value })} />
                <Input className="sm:col-span-2" placeholder="Full description" value={newCharity.description} onChange={(e) => setNewCharity({ ...newCharity, description: e.target.value })} />
              </div>
              <Button variant="hero" className="mt-4" onClick={addCharity}>Add</Button>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">All charities</h3>
              <ul className="divide-y divide-border">
                {charities.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.name} {c.featured && <span className="text-xs text-accent">★ featured</span>}</p>
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => deleteCharity(c.id)}>Delete</Button>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="mt-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">All users</h3>
              <ul className="divide-y divide-border">
                {users.map((u) => (
                  <li key={u.id} className="py-3 text-sm flex justify-between">
                    <span>{u.display_name ?? "—"}</span>
                    <span className="text-muted-foreground text-xs">{u.user_id.slice(0, 8)}…</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </AppLayout>
  );
}