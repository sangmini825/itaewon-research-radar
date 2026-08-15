import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, max-age=60",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  try {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 100)));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const get = (path: string) => fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
    const [sourcesResponse, itemsResponse, watchResponse, looseResponse, eventsResponse, placesResponse, readingsResponse] = await Promise.all([
      get("sources?select=id,source_name,source_type,url,collection_url,status,last_checked,priority,method,check_interval&order=priority.asc,source_name.asc"),
      get(`raw_items?select=id,source_id,title,url,published_at,collected_at,author,raw_text,content_type,editorial_category,review_status,ai_scope,ai_topics,ai_summary,ai_importance,ai_what_changed,ai_follow_up&order=published_at.desc.nullslast,collected_at.desc&limit=${limit}`),
      get("watchlist?select=id,target_type,target_name,reason,priority,status,last_change_at&order=priority.asc,created_at.desc"),
      get("loose_ends?select=id,question,description,status,priority,related_topics&status=eq.open&order=priority.asc,created_at.desc"),
      get("events?select=id,title,event_date,status,scope,topics,summary,what_changed,importance,follow_up,verified&order=event_date.desc.nullslast,created_at.desc&limit=100"),
      get("places?select=id,name,address,place_type,latitude,longitude,status,description,short_summary,opening_hours,tags,url,instagram_url,verified&status=neq.hidden&order=name.asc"),
      get("reading_materials?select=id,title,material_type,creator,publisher,published_on,summary,url,access_note,pages,duration_minutes,tags,featured,verified,last_verified_at&status=eq.public&order=featured.desc,published_on.desc.nullslast,title.asc"),
    ]);
    const responses = [sourcesResponse, itemsResponse, watchResponse, looseResponse, eventsResponse, placesResponse, readingsResponse];
    if (responses.some((response) => !response.ok)) {
      throw new Error((await Promise.all(responses.map(async (response) => response.ok ? "" : await response.text()))).filter(Boolean).join(" | "));
    }
    const [sources, items, watchlist, loose_ends, events, places, readings] = await Promise.all(responses.map((response) => response.json()));
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.source_id, (counts.get(item.source_id) || 0) + 1);
    return new Response(JSON.stringify({
      generated_at: new Date().toISOString(),
      sources: sources.map((source: Record<string, unknown>) => ({ ...source, item_count: counts.get(String(source.id)) || 0 })),
      items, watchlist, loose_ends, events, places, readings,
    }), { headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
    });
  }
});
