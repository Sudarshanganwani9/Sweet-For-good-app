// Edge function to run a monthly draw (simulate or publish).
// Body: { month: number, year: number, logic: "random" | "algorithmic", publish: boolean }
// Caller must be admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin using their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json();
    const month = Number(body.month);
    const year = Number(body.year);
    const logic = (body.logic === "algorithmic" ? "algorithmic" : "random") as "random" | "algorithmic";
    const publish = Boolean(body.publish);

    if (!month || !year) return json({ error: "month and year required" }, 400);

    // 1. Active subscribers
    const { data: subs } = await admin.from("subscriptions").select("user_id, monthly_fee, charity_percentage").eq("status", "active");
    const subscriberCount = subs?.length ?? 0;
    const grossPool = (subs ?? []).reduce((acc, s) => {
      const game = Number(s.monthly_fee) * (1 - Number(s.charity_percentage) / 100);
      return acc + game;
    }, 0);

    // 2. Get prior unclaimed jackpot rollover from last published draw
    const { data: lastDraw } = await admin.from("draws").select("jackpot_rollover, prize_pool, draw_year, draw_month")
      .eq("status", "published").order("draw_year", { ascending: false }).order("draw_month", { ascending: false }).limit(1).maybeSingle();
    const carry = lastDraw ? Number(lastDraw.jackpot_rollover) : 0;
    const prizePool = grossPool + carry;

    // 3. Get latest scores for each subscriber and use as their numbers
    const subscriberIds = (subs ?? []).map((s) => s.user_id);
    const userNumbers: Record<string, number[]> = {};
    if (subscriberIds.length) {
      const { data: scoreRows } = await admin.from("scores").select("user_id, score, played_on")
        .in("user_id", subscriberIds).order("played_on", { ascending: false });
      for (const row of scoreRows ?? []) {
        if (!userNumbers[row.user_id]) userNumbers[row.user_id] = [];
        if (userNumbers[row.user_id].length < 5) userNumbers[row.user_id].push(row.score);
      }
    }

    // 4. Generate winning numbers
    let winningNumbers: number[];
    if (logic === "algorithmic") {
      const freq: Record<number, number> = {};
      Object.values(userNumbers).flat().forEach((n) => { freq[n] = (freq[n] ?? 0) + 1; });
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([n]) => Number(n));
      // weight: alternate most & least frequent for variety
      const least = [...sorted].reverse();
      const picks = new Set<number>();
      let i = 0;
      while (picks.size < 5) {
        const candidate = i % 2 === 0 ? sorted[Math.floor(i / 2)] : least[Math.floor(i / 2)];
        if (candidate && !picks.has(candidate)) picks.add(candidate);
        else picks.add(Math.floor(Math.random() * 45) + 1);
        i++;
        if (i > 100) break;
      }
      winningNumbers = Array.from(picks).slice(0, 5);
    } else {
      const picks = new Set<number>();
      while (picks.size < 5) picks.add(Math.floor(Math.random() * 45) + 1);
      winningNumbers = Array.from(picks);
    }

    const winSet = new Set(winningNumbers);

    // 5. Compute matches per subscriber
    type EntryRow = { user_id: string; numbers: number[]; matches: number };
    const entries: EntryRow[] = [];
    const winnersByTier: { match_5: string[]; match_4: string[]; match_3: string[] } = { match_5: [], match_4: [], match_3: [] };
    for (const [uid, nums] of Object.entries(userNumbers)) {
      if (nums.length === 0) continue;
      const matches = nums.filter((n) => winSet.has(n)).length;
      entries.push({ user_id: uid, numbers: nums, matches });
      if (matches >= 5) winnersByTier.match_5.push(uid);
      else if (matches === 4) winnersByTier.match_4.push(uid);
      else if (matches === 3) winnersByTier.match_3.push(uid);
    }

    // 6. Pool distribution
    const pool5 = prizePool * 0.4;
    const pool4 = prizePool * 0.35;
    const pool3 = prizePool * 0.25;
    let jackpotRollover = 0;
    const winnerRows: { user_id: string; tier: "match_5" | "match_4" | "match_3"; prize_amount: number }[] = [];

    if (winnersByTier.match_5.length > 0) {
      const each = pool5 / winnersByTier.match_5.length;
      winnersByTier.match_5.forEach((uid) => winnerRows.push({ user_id: uid, tier: "match_5", prize_amount: round2(each) }));
    } else {
      jackpotRollover += pool5;
    }
    if (winnersByTier.match_4.length > 0) {
      const each = pool4 / winnersByTier.match_4.length;
      winnersByTier.match_4.forEach((uid) => winnerRows.push({ user_id: uid, tier: "match_4", prize_amount: round2(each) }));
    }
    if (winnersByTier.match_3.length > 0) {
      const each = pool3 / winnersByTier.match_3.length;
      winnersByTier.match_3.forEach((uid) => winnerRows.push({ user_id: uid, tier: "match_3", prize_amount: round2(each) }));
    }

    if (!publish) {
      // Simulation only — return preview without writing
      return json({
        simulated: true, month, year, logic,
        winning_numbers: winningNumbers, prize_pool: round2(prizePool), jackpot_rollover: round2(jackpotRollover),
        total_subscribers: subscriberCount,
        winners_summary: { match_5: winnersByTier.match_5.length, match_4: winnersByTier.match_4.length, match_3: winnersByTier.match_3.length },
      });
    }

    // 7. Persist (upsert draw, replace entries & winners)
    const { data: drawRow, error: drawErr } = await admin.from("draws").upsert({
      draw_month: month, draw_year: year, status: "published",
      logic_type: logic, winning_numbers: winningNumbers,
      prize_pool: round2(prizePool), jackpot_rollover: round2(jackpotRollover),
      total_subscribers: subscriberCount, published_at: new Date().toISOString(),
    }, { onConflict: "draw_month,draw_year" }).select("id").single();
    if (drawErr) throw drawErr;
    const drawId = drawRow.id;

    await admin.from("draw_entries").delete().eq("draw_id", drawId);
    if (entries.length) {
      await admin.from("draw_entries").insert(entries.map((e) => ({ ...e, draw_id: drawId })));
    }
    await admin.from("winners").delete().eq("draw_id", drawId);
    if (winnerRows.length) {
      await admin.from("winners").insert(winnerRows.map((w) => ({ ...w, draw_id: drawId })));
    }

    return json({
      published: true, draw_id: drawId,
      winning_numbers: winningNumbers, prize_pool: round2(prizePool), jackpot_rollover: round2(jackpotRollover),
      total_subscribers: subscriberCount,
      winners_count: winnerRows.length,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function round2(n: number) { return Math.round(n * 100) / 100; }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}