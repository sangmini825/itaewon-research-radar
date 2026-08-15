import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Item = {
  title: string;
  url: string;
  published_at: string | null;
  author: string;
  raw_text: string;
  content_type: string;
  review_status: string;
};

const siteHeaders = {
  "user-agent": "ITAEWON-Radar/0.4 (+internal research collector)",
  "accept-language": "ko-KR,ko;q=0.9",
};
const entities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·",
};

function decodeHtml(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}
function cleanText(value = "") {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function attrContent(html: string, attribute: string, key: string) {
  const escaped = key.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanText(match[1]);
  }
  return "";
}
async function getHtml(url: string) {
  const response = await fetch(url, { headers: siteHeaders, redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}
async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const telegramCache = new Map<string, Item>();
const newsCache = new Map<string, Item>();
const leeumCache = new Map<string, Item>();

const collectors = [
  {
    sourceName: "리움미술관",
    async discover(limit: number) {
      const params = new URLSearchParams({ limit: "20", found: "LM", page: "1", tab: "all", view: "list", keyword: "" });
      params.append("state[]", "1");
      params.append("state[]", "2");
      const payload = JSON.parse(await getHtml(`https://www.leeumhoam.org/leeum/exhibition/list?${params}`));
      const urls: string[] = [];
      for (const entry of payload.list || []) {
        if (!entry?.exhibitionSeq || entry.endDate === "9999-12-31") continue;
        const url = `https://www.leeumhoam.org/leeum/exhibition/${entry.exhibitionSeq}`;
        const end = entry.endDate === "1900-01-01" ? "종료일 미정" : entry.endDate;
        leeumCache.set(url, {
          title: entry.title,
          url,
          published_at: entry.startDate ? `${entry.startDate}T00:00:00+09:00` : null,
          author: "리움미술관",
          raw_text: `장소: ${entry.location || "리움미술관"}\n전시 기간: ${entry.startDate || "미정"} – ${end}\n이태원로55길에 위치한 리움미술관의 공식 전시 일정입니다.`,
          content_type: "culture_event",
          review_status: "inbox",
        });
        urls.push(url);
      }
      return urls.slice(0, limit);
    },
    async fetchItem(url: string): Promise<Item> {
      const item = leeumCache.get(url);
      if (!item) throw new Error(`리움 전시 항목을 찾지 못했습니다: ${url}`);
      return item;
    },
  },
  {
    sourceName: "10·29 이태원참사 유가족협의회",
    async discover(limit: number) {
      const base = "https://1029itaewonfamily.org/press-release/";
      const html = await getHtml(base);
      const ids = [...html.matchAll(/bmode=view(?:&|&amp;)idx=(\d+)/g)].map((m) => m[1]);
      return [...new Set(ids)].slice(0, limit).map((id) => `${base}?bmode=view&idx=${id}`);
    },
    async fetchItem(url: string): Promise<Item> {
      const html = await getHtml(url);
      const rawTitle = attrContent(html, "property", "og:title") || attrContent(html, "name", "twitter:title");
      const title = rawTitle.replace(/\s*:\s*10\.29 이태원 참사 유가족협의회\s*$/, "").trim();
      const body = attrContent(html, "property", "og:description") || attrContent(html, "name", "description");
      if (!title || !body) throw new Error(`필수 내용을 추출하지 못했습니다: ${url}`);
      return {
        title: cleanText(title),
        url,
        published_at: attrContent(html, "property", "article:published_time") || null,
        author: attrContent(html, "property", "og:article:author") || "관리자",
        raw_text: cleanText(body),
        content_type: "press_release",
        review_status: "inbox",
      };
    },
  },
  {
    sourceName: "행정안전부",
    async discover(limit: number) {
      const params = new URLSearchParams({
        bbsId: "BBSMSTR_000000000008",
        searchCnd: "0",
        searchWrd: "이태원",
      });
      const html = await getHtml(`https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardList.do?${params}`);
      const ids = [...html.matchAll(/nttId=(\d+)/g)].map((m) => m[1]).filter((id) => id !== "115186");
      return [...new Set(ids)].slice(0, limit).map(
        (id) => `https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000008&nttId=${id}`,
      );
    },
    async fetchItem(url: string): Promise<Item> {
      const html = await getHtml(url);
      const title = cleanText(html.match(/name=["']nttSj["'][^>]+value=["']([^"']+)/i)?.[1] || "");
      const date = html.match(/등록일<\/span>\s*:\s*([0-9]{4}\.[0-9]{2}\.[0-9]{2})\./i)?.[1];
      const body = cleanText(html.match(/<div id=["']desc_pc["'][^>]*>([\s\S]*?)<div id=["']desc_mo["']/i)?.[1] || "");
      if (!title || !body) throw new Error(`행정안전부 본문 추출 실패: ${url}`);
      return {
        title,
        url,
        published_at: date ? `${date.replaceAll(".", "-")}T00:00:00+09:00` : null,
        author: "행정안전부",
        raw_text: body.slice(0, 100000),
        content_type: "press_release",
        review_status: "inbox",
      };
    },
  },
  {
    sourceName: "10·29 이태원참사 시민대책회의",
    async discover(limit: number) {
      const html = await getHtml("https://t.me/s/itaewondisaster");
      const blocks = [...html.matchAll(/<div class="tgme_widget_message_wrap[\s\S]*?data-post="itaewondisaster\/(\d+)"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g)];
      const items: string[] = [];
      for (const block of blocks.reverse()) {
        const id = block[1];
        const text = cleanText(block[0].match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/)?.[1] || "");
        if (!text) continue;
        const datetime = block[0].match(/datetime="([^"]+)"/)?.[1] || null;
        const url = `https://t.me/itaewondisaster/${id}`;
        telegramCache.set(url, { title: text.split("\n")[0].slice(0, 100), url, published_at: datetime, author: "10·29 이태원참사 시민대책회의", raw_text: text.slice(0, 100000), content_type: "telegram_post", review_status: "inbox" });
        items.push(url);
      }
      return items.slice(0, limit);
    },
    async fetchItem(url: string): Promise<Item> {
      const item = telegramCache.get(url);
      if (!item) throw new Error(`텔레그램 게시물을 찾지 못했습니다: ${url}`);
      return item;
    },
  },
  {
    sourceName: "주요 기사",
    async discover(limit: number) {
      const rssUrl = "https://news.google.com/rss/search?q=%EC%9D%B4%ED%83%9C%EC%9B%90%20OR%20%2210%C2%B729%22&hl=ko&gl=KR&ceid=KR:ko";
      const xml = await getHtml(rssUrl);
      const allowed = /연합뉴스|KBS|MBC|SBS|JTBC|한겨레|경향신문|한국일보|중앙일보|동아일보|조선일보|서울신문|YTN|뉴스1|뉴시스/;
      const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      const urls: string[] = [];
      for (const entry of entries) {
        const body = entry[1];
        const fullTitle = cleanText(body.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
        const source = cleanText(body.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
        if (!fullTitle || !allowed.test(source)) continue;
        const url = decodeHtml(body.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
        if (!url) continue;
        const suffix = ` - ${source}`;
        const title = fullTitle.endsWith(suffix) ? fullTitle.slice(0, -suffix.length).trim() : fullTitle;
        const dateText = cleanText(body.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
        newsCache.set(url, { title, url, published_at: dateText ? new Date(dateText).toISOString() : null, author: source, raw_text: `${source}에서 제공한 기사입니다. 제목과 원문을 확인해 주세요.`, content_type: "news_article", review_status: "inbox" });
        urls.push(url);
      }
      return urls.slice(0, limit);
    },
    async fetchItem(url: string): Promise<Item> {
      const item = newsCache.get(url);
      if (!item) throw new Error(`기사 항목을 찾지 못했습니다: ${url}`);
      return item;
    },
  },
  {
    sourceName: "문화·예술 소식",
    async discover(limit: number) {
      const rssUrl = "https://news.google.com/rss/search?q=%EC%9D%B4%ED%83%9C%EC%9B%90%20(%EC%A0%84%EC%8B%9C%20OR%20%EA%B3%B5%EC%97%B0%20OR%20%EC%B6%95%EC%A0%9C%20OR%20%EB%AC%B8%ED%99%94%20OR%20%EA%B0%A4%EB%9F%AC%EB%A6%AC%20OR%20%EB%AF%B8%EC%88%A0%EA%B4%80)&hl=ko&gl=KR&ceid=KR:ko";
      const xml = await getHtml(rssUrl);
      const allowed = /서울문화포털|서울시|용산구|서울문화재단|연합뉴스|KBS|MBC|SBS|JTBC|한겨레|경향신문|한국일보|서울신문|YTN|뉴스1|뉴시스|아트조선|문화일보/;
      const cultureWords = /전시|공연|축제|문화|예술|갤러리|미술관|박물관|콘서트|페스티벌|팝업/;
      const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      const urls: string[] = [];
      for (const entry of entries) {
        const body = entry[1];
        const fullTitle = cleanText(body.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
        const source = cleanText(body.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
        if (!fullTitle.includes("이태원") || !allowed.test(source)) continue;
        const url = decodeHtml(body.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
        if (!url) continue;
        const suffix = ` - ${source}`;
        const title = fullTitle.endsWith(suffix) ? fullTitle.slice(0, -suffix.length).trim() : fullTitle;
        if (!cultureWords.test(title) || /이태원 클라쓰|참사|유가족|특조위|안전관리/.test(title)) continue;
        const dateText = cleanText(body.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
        newsCache.set(url, { title, url, published_at: dateText ? new Date(dateText).toISOString() : null, author: source, raw_text: `${source}에서 제공한 문화·예술 소식입니다. 일정과 장소는 원문에서 확인해 주세요.`, content_type: "culture_event", review_status: "inbox" });
        urls.push(url);
      }
      return urls.slice(0, limit);
    },
    async fetchItem(url: string): Promise<Item> {
      const item = newsCache.get(url);
      if (!item) throw new Error(`문화·예술 항목을 찾지 못했습니다: ${url}`);
      return item;
    },
  },
];

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    let maxItems = 20;
    try {
      const body = await request.json();
      maxItems = Math.max(1, Math.min(50, Number(body?.max_items || 20)));
    } catch {}

    const reports = [];
    for (const collector of collectors) {
      try {
        const sourceResponse = await fetch(
          `${supabaseUrl}/rest/v1/sources?select=id&source_name=eq.${encodeURIComponent(collector.sourceName)}&limit=1`,
          { headers: apiHeaders },
        );
        if (!sourceResponse.ok) throw new Error(await sourceResponse.text());
        const sources = await sourceResponse.json();
        if (!sources[0]?.id) throw new Error("sources에 출처가 없습니다.");

        const urls = await collector.discover(maxItems);
        const existingResponse = await fetch(
          `${supabaseUrl}/rest/v1/raw_items?select=url&source_id=eq.${sources[0].id}`,
          { headers: apiHeaders },
        );
        if (!existingResponse.ok) throw new Error(await existingResponse.text());
        const existing = new Set((await existingResponse.json()).map((row: { url: string }) => row.url));
        const unseen = urls.filter((url) => !existing.has(url));
        const settled = await Promise.allSettled(unseen.map((url) => collector.fetchItem(url)));
        const items = settled
          .filter((result): result is PromiseFulfilledResult<Item> => result.status === "fulfilled")
          .map((result) => ({ ...result.value, source_id: sources[0].id }));
        const failed = settled.filter((result) => result.status === "rejected");

        if (items.length) {
          const insertResponse = await fetch(`${supabaseUrl}/rest/v1/raw_items?on_conflict=url`, {
            method: "POST",
            headers: {
              ...apiHeaders,
              "content-type": "application/json",
              Prefer: "resolution=ignore-duplicates,return=minimal",
            },
            body: JSON.stringify(items),
          });
          if (!insertResponse.ok) throw new Error(await insertResponse.text());
        }
        await fetch(`${supabaseUrl}/rest/v1/sources?id=eq.${sources[0].id}`, {
          method: "PATCH",
          headers: { ...apiHeaders, "content-type": "application/json" },
          body: JSON.stringify({ last_checked: new Date().toISOString() }),
        });
        reports.push({
          source: collector.sourceName,
          discovered: urls.length,
          already_saved: urls.length - unseen.length,
          inserted: items.length,
          failed: failed.length,
          failures: failed.slice(0, 3).map((result) => result.status === "rejected" ? String(result.reason) : ""),
        });
      } catch (error) {
        reports.push({ source: collector.sourceName, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return Response.json({ reports });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});

