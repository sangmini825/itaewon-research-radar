"use client";

import { useEffect, useMemo, useState } from "react";

type Source = {
  id: string;
  source_name: string;
  status: string | null;
  last_checked: string | null;
  item_count: number;
};

type Item = {
  id: string;
  source_id: string;
  title: string | null;
  url: string | null;
  published_at: string | null;
  collected_at: string | null;
  author: string | null;
  raw_text: string | null;
  content_type: string | null;
  review_status: string | null;
  ai_summary: string | null;
  ai_importance: number | null;
  ai_topics: string[] | null;
};

type Feed = {
  generated_at: string;
  sources: Source[];
  items: Item[];
};

const FEED_URL =
  "https://dbcgtfiohkfsvxxnximj.supabase.co/functions/v1/itaewon-radar-feed?limit=200";

function formatDate(value: string | null, withTime = false) {
  if (!value) return "날짜 미상";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function sourceShortName(name: string) {
  if (name.includes("유가족")) return "유가족협의회";
  if (name.includes("시민대책")) return "시민대책회의";
  if (name.includes("행정안전부")) return "행정안전부";
  if (name.includes("열린데이터")) return "용산 열린데이터";
  if (name.includes("빅데이터")) return "용산 빅데이터";
  return name;
}

export default function Home() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => {
    fetch(FEED_URL)
      .then((response) => {
        if (!response.ok) throw new Error("레이더 데이터를 불러오지 못했습니다.");
        return response.json();
      })
      .then(setFeed)
      .catch((reason) => setError(reason.message));
  }, []);

  const sourceMap = useMemo(
    () => new Map((feed?.sources || []).map((source) => [source.id, source])),
    [feed],
  );

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (feed?.items || []).filter((item) => {
      const matchesSource = sourceFilter === "all" || item.source_id === sourceFilter;
      const haystack = [item.title, item.raw_text, item.author, ...(item.ai_topics || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesSource && (!keyword || haystack.includes(keyword));
    });
  }, [feed, query, sourceFilter]);

  const activeSources = feed?.sources.filter((source) => source.item_count > 0).length || 0;
  const latestItem = feed?.items[0];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="이태원 리서치 레이더 홈">
          <span className="brand-mark">IR</span>
          <span>ITAewON RESEARCH RADAR</span>
        </a>
        <div className="topbar-meta">
          <span className="live-dot" aria-hidden="true" />
          DAILY / 08:00 UPDATE
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker">INTERNAL RESEARCH INFRASTRUCTURE · 2026</div>
        <div className="hero-grid">
          <div>
            <h1>
              이태원의 변화를
              <br />
              놓치지 않는 기록.
            </h1>
            <p className="hero-copy">
              10·29 이후의 움직임과 제도 변화, 지역의 신호를 한곳에서 확인합니다.
              원자료를 보존하고 새 정보만 매일 수집하는 내부 리서치 레이더입니다.
            </p>
          </div>
          <div className="hero-stats" aria-label="수집 현황">
            <div><strong>{feed?.items.length ?? "—"}</strong><span>수집 자료</span></div>
            <div><strong>{activeSources || "—"}</strong><span>작동 출처</span></div>
            <div><strong>08:00</strong><span>다음 확인</span></div>
          </div>
        </div>
        <div className="latest-line">
          <span>LATEST SIGNAL</span>
          <strong>{latestItem?.title || "데이터를 확인하고 있습니다"}</strong>
          <time>{formatDate(latestItem?.published_at || null)}</time>
        </div>
      </section>

      <section className="workspace" aria-label="레이더 자료 탐색">
        <aside className="source-panel">
          <div className="section-label">SOURCES</div>
          <button
            className={sourceFilter === "all" ? "source-button active" : "source-button"}
            onClick={() => setSourceFilter("all")}
          >
            <span>전체 자료</span><b>{feed?.items.length || 0}</b>
          </button>
          {(feed?.sources || []).map((source) => (
            <button
              key={source.id}
              className={sourceFilter === source.id ? "source-button active" : "source-button"}
              onClick={() => setSourceFilter(source.id)}
            >
              <span>{sourceShortName(source.source_name)}</span><b>{source.item_count}</b>
            </button>
          ))}
          <div className="source-note">
            <span className="status-chip">자동 수집</span>
            <p>유가족협의회 · 시민대책회의 · 행정안전부</p>
          </div>
        </aside>

        <div className="feed-panel">
          <div className="feed-tools">
            <div>
              <div className="section-label">RAW ITEMS / INBOX</div>
              <h2>새로 들어온 자료</h2>
            </div>
            <label className="search-box">
              <span>SEARCH</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목, 본문, 인물 검색"
                aria-label="자료 검색"
              />
            </label>
          </div>

          {error && <div className="error-state">{error}</div>}
          {!feed && !error && <div className="loading-state">레이더 신호를 불러오는 중입니다.</div>}
          {feed && filteredItems.length === 0 && (
            <div className="empty-state">조건에 맞는 자료가 없습니다.</div>
          )}

          <div className="item-list">
            {filteredItems.map((item, index) => {
              const source = sourceMap.get(item.source_id);
              return (
                <article className="item-card" key={item.id}>
                  <div className="item-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="item-main">
                    <div className="item-meta">
                      <span>{source ? sourceShortName(source.source_name) : "출처 미상"}</span>
                      <time>{formatDate(item.published_at)}</time>
                      <span>{item.content_type === "website_snapshot" ? "사이트 변화" : "원문"}</span>
                    </div>
                    <h3>{item.title || "제목 없음"}</h3>
                    <p>{item.ai_summary || item.raw_text || "본문이 없습니다."}</p>
                    <div className="item-actions">
                      <button onClick={() => setSelected(item)}>내용 확인</button>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer">원문 열기 ↗</a>
                      )}
                    </div>
                  </div>
                  <div className="item-status">
                    <span>{item.review_status || "inbox"}</span>
                    {item.ai_importance && <b>중요도 {item.ai_importance}</b>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="source-health">
        <div>
          <div className="section-label">COLLECTION HEALTH</div>
          <h2>출처별 수집 상태</h2>
        </div>
        <div className="health-grid">
          {(feed?.sources || []).map((source) => (
            <div className="health-card" key={source.id}>
              <div className={source.item_count > 0 ? "health-light on" : "health-light"} />
              <strong>{sourceShortName(source.source_name)}</strong>
              <span>{source.item_count > 0 ? `${source.item_count}건 수집` : "연결 준비 중"}</span>
              <time>확인 {formatDate(source.last_checked, true)}</time>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <span>ITAewON RESEARCH RADAR</span>
        <span>기억 · 진상규명 · 도시 변화 · 기록</span>
        <span>{feed ? `데이터 갱신 ${formatDate(feed.generated_at, true)}` : "연결 중"}</span>
      </footer>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={() => setSelected(null)}>
          <aside className="drawer" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="닫기">닫기 ×</button>
            <div className="section-label">SOURCE DOCUMENT</div>
            <p className="drawer-source">{sourceShortName(sourceMap.get(selected.source_id)?.source_name || "출처 미상")}</p>
            <h2>{selected.title}</h2>
            <div className="drawer-meta">
              <span>{formatDate(selected.published_at)}</span>
              <span>{selected.author || "작성자 미상"}</span>
            </div>
            <div className="drawer-body">{selected.raw_text}</div>
            {selected.url && <a className="drawer-link" href={selected.url} target="_blank" rel="noreferrer">원문에서 확인하기 ↗</a>}
          </aside>
        </div>
      )}
    </main>
  );
}
