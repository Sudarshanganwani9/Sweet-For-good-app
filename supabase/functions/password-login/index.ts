import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AuthBody = {
  email?: string;
  password?: string;
  displayName?: string;
  accountType?: "user" | "admin";
  adminCode?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as AuthBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? email.split("@")[0] ?? "User").trim();
    const accountType = body.accountType === "admin" ? "admin" : "user";

    if (!email || !email.includes("@")) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);

    if (accountType === "admin") {
      const expectedCode = Deno.env.get("ADMIN_SIGNUP_CODE");
      if (!expectedCode) return json({ error: "Admin code is not configured." }, 500);
      if (!body.adminCode || String(body.adminCode) !== expectedCode) {
        return json({ error: "Invalid admin access code." }, 403);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let userId = await findUserIdByEmail(admin, email);

    if (!userId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (createError) {
        if (createError.status === 422 || createError.code === "email_exists" || /already.*registered|email.*exists/i.test(createError.message)) {
          userId = await findUserIdByEmail(admin, email, true);
        } else {
          throw createError;
        }
      } else {
        userId = created.user?.id;
      }
    }

    if (userId) {
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (updateError) throw updateError;
    }

    if (!userId) return json({ error: "Could not prepare account." }, 500);

    await admin.from("profiles").upsert(
      {
        user_id: userId,
        display_name: displayName || email.split("@")[0],
      },
      { onConflict: "user_id" },
    );

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "user" },
      { onConflict: "user_id,role" },
    );

    if (accountType === "admin") {
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    }

    return json({ success: true, accountType });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function findUserIdByEmail(admin: ReturnType<typeof createClient>, email: string, exhaustive = false) {
  const normalizedEmail = email.toLowerCase();
  const { data: filtered, error: filterError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100, filter: normalizedEmail });
  if (!filterError) {
    const exact = filtered.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (exact) return exact.id;
  }

  if (!exhaustive) return null;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const exact = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (exact) return exact.id;
    if (data.users.length < 100) break;
  }

  return null;
}
