"use client";

import { useEffect, useMemo, useState } from "react";

type Source = { id:string; source_name:string; url:string|null; status:string|null; last_checked:string|null; item_count:number };
type Item = { id:string; source_id:string; title:string|null; url:string|null; published_at:string|null; collected_at:string|null; author:string|null; raw_text:string|null; content_type:string|null; review_status:string|null; ai_scope:string|null; ai_summary:string|null; ai_importance:number|null; ai_topics:string[]|null; ai_what_changed:string|null; ai_follow_up:string[]|null };
type WatchItem = { id:string; target_type:string|null; target_name:string; reason:string|null; priority:number|null; status:string|null; last_change_at:string|null };
type LooseEnd = { id:string; question:string; description:string|null; status:string|null; priority:number|null; related_topics:string[]|null };
type Event = { id:string; title:string; event_date:string|null; status:string|null; scope:string|null; topics:string[]|null; summary:string|null; what_changed:string|null; importance:number|null; follow_up:string[]|null; verified:boolean|null };
export type Feed = { generated_at:string; sources:Source[]; items:Item[]; watchlist:WatchItem[]; loose_ends:LooseEnd[]; events:Event[] };

const PAGE_SIZE = 8;

function formatDate(value:string|null, withTime=false) {
  if (!value) return "날짜 미상";
  return new Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit", ...(withTime?{hour:"2-digit",minute:"2-digit"}:{}) }).format(new Date(value));
}
function shortSource(name:string) {
  if (name.includes("유가족")) return "유가족협의회";
  if (name.includes("시민대책")) return "시민대책회의";
  if (name.includes("행정안전부")) return "행정안전부";
  if (name.includes("열린데이터")) return "용산 열린데이터";
  if (name.includes("빅데이터")) return "용산 빅데이터";
  return name;
}

export default function RadarClient({feed,error=""}:{feed:Feed|null;error?:string}) {
  const [query,setQuery]=useState("");
  const [sourceFilter,setSourceFilter]=useState("all");
  const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
  const [selected,setSelected]=useState<Item|null>(null);
  const sourceMap=useMemo(()=>new Map((feed?.sources||[]).map(s=>[s.id,s])),[feed]);
  const filtered=useMemo(()=>{
    const keyword=query.trim().toLowerCase();
    return (feed?.items||[]).filter(item=>{
      const haystack=[item.title,item.raw_text,item.author,item.ai_summary].filter(Boolean).join(" ").toLowerCase();
      return (sourceFilter==="all"||item.source_id===sourceFilter)&&(!keyword||haystack.includes(keyword));
    });
  },[feed,query,sourceFilter]);
  useEffect(()=>setVisibleCount(PAGE_SIZE),[query,sourceFilter]);
  const visible=filtered.slice(0,visibleCount);
  const activeSources=feed?.sources.filter(s=>s.item_count>0).length||0;

  return <main>
    <header className="topbar">
      <a className="brand" href="#top">ITAEWON</a>
      <a className="toplink" href="#sources">출처</a>
    </header>

    <section className="hero" id="top">
      <p className="eyebrow">RESEARCH ARCHIVE</p>
      <h1>ITAEWON RADAR</h1>
      <p className="hero-copy">10·29 이후의 기록과 이태원의 변화를 원문 중심으로 모읍니다.</p>
      <div className="summary-line"><span>자료 <b>{feed?.items.length??"—"}</b></span><span>연결 출처 <b>{activeSources||"—"}</b></span><span>매일 08:00 갱신</span></div>
    </section>

    <section className="archive" aria-label="수집 자료">
      <div className="archive-tools">
        <div><p className="eyebrow">ARCHIVE</p><h2>자료</h2></div>
        <div className="filters">
          <select aria-label="출처 선택" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}>
            <option value="all">모든 출처</option>
            {(feed?.sources||[]).map(s=><option key={s.id} value={s.id}>{shortSource(s.source_name)} · {s.item_count}</option>)}
          </select>
          <input aria-label="자료 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="검색" />
        </div>
      </div>
      <p className="result-count">{filtered.length}개 중 {Math.min(visibleCount,filtered.length)}개 표시</p>
      {error&&<div className="error-state">{error}</div>}
      {feed&&filtered.length===0&&<div className="empty-state">조건에 맞는 자료가 없습니다.</div>}
      <div className="item-list">{visible.map(item=><article className="item-card" key={item.id}>
        <button className="item-open" onClick={()=>setSelected(item)}>
          <div className="item-meta"><span>{shortSource(sourceMap.get(item.source_id)?.source_name||"출처 미상")}</span><time>{formatDate(item.published_at)}</time></div>
          <h3>{item.title||"제목 없음"}</h3>
          <p>{item.ai_summary||item.raw_text||"본문이 없습니다."}</p>
        </button>
        {item.url&&<a className="source-link" href={item.url} target="_blank" rel="noreferrer" aria-label="원문 열기">↗</a>}
      </article>)}</div>
      {visibleCount<filtered.length&&<button className="more-button" onClick={()=>setVisibleCount(n=>n+PAGE_SIZE)}>더 보기 <span>{filtered.length-visibleCount}</span></button>}
    </section>

    <section className="sources" id="sources">
      <div><p className="eyebrow">SOURCES</p><h2>출처</h2></div>
      <div className="source-list">{(feed?.sources||[]).map(s=><div key={s.id}><span className={s.item_count>0?"status on":"status"}/>{s.url?<a href={s.url} target="_blank" rel="noreferrer">{shortSource(s.source_name)} ↗</a>:<strong>{shortSource(s.source_name)}</strong>}<span>{s.item_count>0?`${s.item_count}건`:`연결 준비`}</span><time>{formatDate(s.last_checked)}</time></div>)}</div>
    </section>

    <footer><span>ITAEWON RADAR</span><span>{feed?`갱신 ${formatDate(feed.generated_at,true)}`:"연결 중"}</span></footer>

    {selected&&<div className="drawer-backdrop" onMouseDown={()=>setSelected(null)}><aside className="drawer" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true"><button className="drawer-close" onClick={()=>setSelected(null)}>닫기 ×</button><p className="eyebrow">{shortSource(sourceMap.get(selected.source_id)?.source_name||"출처 미상")}</p><h2>{selected.title}</h2><div className="drawer-meta"><span>{formatDate(selected.published_at)}</span><span>{selected.author||"작성자 미상"}</span></div><section><h3>내용</h3><p className="drawer-body">{selected.ai_summary||selected.raw_text||"본문이 없습니다."}</p></section>{selected.url&&<a className="drawer-link" href={selected.url} target="_blank" rel="noreferrer">원문 확인 ↗</a>}</aside></div>}
  </main>;
}
