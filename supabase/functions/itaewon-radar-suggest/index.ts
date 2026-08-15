import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" } });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  try {
    const payload = await request.json();
    if (payload?.website) return json({ ok: true });
    const url = String(payload?.url || "").trim().slice(0, 500);
    const note = String(payload?.note || "").trim().slice(0, 500);
    const sourceType = ["instagram", "magazine", "venue", "other"].includes(payload?.source_type) ? payload.source_type : "other";
    let parsed: URL;
    try { parsed = new URL(url); } catch { return json({ error: "올바른 URL을 입력해 주세요." }, 400); }
    if (!["http:", "https:"].includes(parsed.protocol)) return json({ error: "http 또는 https 주소만 받을 수 있습니다." }, 400);

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(forwarded));
    const submitterHash = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const since = encodeURIComponent(new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const recent = await fetch(`${supabaseUrl}/rest/v1/source_suggestions?select=id&submitter_hash=eq.${submitterHash}&created_at=gte.${since}&limit=5`, { headers });
    if (!recent.ok) throw new Error(await recent.text());
    if ((await recent.json()).length >= 5) return json({ error: "한 시간 뒤 다시 제보해 주세요." }, 429);

    const inserted = await fetch(`${supabaseUrl}/rest/v1/source_suggestions?on_conflict=url`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ url: parsed.toString(), note, source_type: sourceType, submitter_hash: submitterHash }),
    });
    if (!inserted.ok) throw new Error(await inserted.text());
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "제보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  }
});
