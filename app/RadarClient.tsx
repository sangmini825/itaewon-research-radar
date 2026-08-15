"use client";

import { useEffect, useMemo, useState } from "react";

type Source = { id:string; source_name:string; url:string|null; collection_url:string|null; status:string|null; last_checked:string|null; item_count:number };
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
  if (name.includes("서울 열린데이터")) return "서울 열린데이터";
  if (name.includes("유가족")) return "유가족협의회";
  if (name.includes("시민대책")) return "시민대책회의";
  if (name.includes("행정안전부")) return "행정안전부";
  if (name.includes("열린데이터")) return "용산 열린데이터";
  if (name.includes("빅데이터")) return "용산 빅데이터";
  return name;
}
function itemKind(item:Item) {
  if (item.content_type==="news_article") return "기사";
  if (item.content_type==="telegram_post") return "배포 자료";
  if (item.content_type==="press_release") return "보도자료";
  return "공개 자료";
}
function titleKey(value:string|null) {
  return (value||"").toLowerCase().replace(/\[[^\]]+\]|[^0-9a-z가-힣]/g,"").replace(/^논평/,"");
}
function dedupeItems(items:Item[]) {
  const seen=new Set<string>();
  return items.filter(item=>{
    const key=titleKey(item.title);
    if(key.length<12||!seen.has(key)){if(key.length>=12)seen.add(key);return true;}
    return false;
  });
}

export default function RadarClient({feed,error=""}:{feed:Feed|null;error?:string}) {
  const [query,setQuery]=useState("");
  const [sourceFilter,setSourceFilter]=useState("all");
  const [kindFilter,setKindFilter]=useState("all");
  const [sourceOpen,setSourceOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
  const [selected,setSelected]=useState<Item|null>(null);
  const [readItems,setReadItems]=useState<Set<string>>(new Set());
  const [favoriteSources,setFavoriteSources]=useState<Set<string>>(new Set());
  useEffect(()=>{try{setReadItems(new Set(JSON.parse(localStorage.getItem("itaewon-read")||"[]")));setFavoriteSources(new Set(JSON.parse(localStorage.getItem("itaewon-favorites")||"[]")))}catch{}},[]);
  const sourceMap=useMemo(()=>new Map((feed?.sources||[]).map(s=>[s.id,s])),[feed]);
  const filtered=useMemo(()=>{
    const keyword=query.trim().toLowerCase();
    const matched=(feed?.items||[]).filter(item=>{
      const haystack=[item.title,item.raw_text,item.author,item.ai_summary].filter(Boolean).join(" ").toLowerCase();
      return (sourceFilter==="all"||item.source_id===sourceFilter)&&(kindFilter==="all"||item.content_type===kindFilter)&&(!keyword||haystack.includes(keyword));
    });
    return sourceFilter==="all"&&kindFilter==="all"?dedupeItems(matched):matched;
  },[feed,query,sourceFilter,kindFilter]);
  useEffect(()=>setVisibleCount(PAGE_SIZE),[query,sourceFilter,kindFilter]);
  const visible=filtered.slice(0,visibleCount);
  const activeSources=feed?.sources.filter(s=>s.item_count>0).length||0;
  const duplicateCount=(feed?.items.length||0)-dedupeItems(feed?.items||[]).length;
  const selectedSource=(feed?.sources||[]).find(s=>s.id===sourceFilter);
  const duplicateGroups=useMemo(()=>{const groups=new Map<string,Item[]>();for(const item of feed?.items||[]){const key=titleKey(item.title);if(key.length<12)continue;groups.set(key,[...(groups.get(key)||[]),item]);}return groups;},[feed]);
  const openItem=(item:Item)=>{setSelected(item);setReadItems(current=>{const next=new Set(current).add(item.id);localStorage.setItem("itaewon-read",JSON.stringify([...next]));return next;});};
  const toggleFavorite=(id:string)=>setFavoriteSources(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);localStorage.setItem("itaewon-favorites",JSON.stringify([...next]));return next;});
  const kindCounts=useMemo(()=>({
    telegram_post:(feed?.items||[]).filter(i=>i.content_type==="telegram_post").length,
    news_article:(feed?.items||[]).filter(i=>i.content_type==="news_article").length,
    press_release:(feed?.items||[]).filter(i=>i.content_type==="press_release").length,
  }),[feed]);

  return <main>
    <header className="topbar">
      <a className="brand" href="#top">공개 자료</a>
      <a className="toplink" href="#sources">출처</a>
    </header>

    <section className="hero" id="top">
      <p className="eyebrow">ITAEWON · PUBLIC SOURCES</p>
      <h1>이태원 관련 자료</h1>
      <p className="hero-copy">공개된 배포 자료, 행정 자료와 주요 기사를 한곳에서 확인합니다.</p>
      <div className="summary-line"><span>자료 <b>{feed?.items.length??"—"}</b></span><span>연결 출처 <b>{activeSources||"—"}</b></span><span>매일 08:00 갱신</span></div>
    </section>

    <section className="archive" aria-label="수집 자료">
      <div className="archive-tools">
        <div><p className="eyebrow">ARCHIVE</p><h2>자료</h2></div>
        <div className="tool-buttons">
          <button className={sourceOpen||sourceFilter!=="all"?"active":""} onClick={()=>setSourceOpen(v=>!v)}>출처 <span>{selectedSource?shortSource(selectedSource.source_name):"전체"}</span></button>
          <button className={searchOpen||query?"active":""} onClick={()=>setSearchOpen(v=>!v)}>검색 <span>{query?"적용됨":""}</span></button>
        </div>
      </div>
      {sourceOpen&&<div className="source-picker" aria-label="출처 선택"><button className={sourceFilter==="all"?"active":""} onClick={()=>{setSourceFilter("all");setSourceOpen(false)}}>모든 출처 <span>{feed?.items.length||0}</span></button>{(feed?.sources||[]).map(s=><button key={s.id} className={sourceFilter===s.id?"active":""} onClick={()=>{setSourceFilter(s.id);setSourceOpen(false)}}>{shortSource(s.source_name)} <span>{s.item_count}</span></button>)}</div>}
      {searchOpen&&<div className="search-panel"><input autoFocus aria-label="자료 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="제목과 내용 검색" />{query&&<button onClick={()=>setQuery("")}>지우기</button>}</div>}
      <div className="kind-filters" aria-label="자료 유형">
        {[{id:"all",label:"전체",count:feed?.items.length||0},{id:"telegram_post",label:"텔레그램",count:kindCounts.telegram_post},{id:"news_article",label:"기사",count:kindCounts.news_article},{id:"press_release",label:"보도자료",count:kindCounts.press_release}].map(kind=><button key={kind.id} className={kindFilter===kind.id?"active":""} onClick={()=>setKindFilter(kind.id)}>{kind.label}<span>{kind.count}</span></button>)}
      </div>
      {kindFilter==="telegram_post"&&<p className="channel-note">시민대책회의 공식 공개 텔레그램 채널에서 수집한 게시물입니다.</p>}
      <p className="result-count">{filtered.length}개 중 {Math.min(visibleCount,filtered.length)}개 표시{sourceFilter==="all"&&kindFilter==="all"&&duplicateCount>0&&<span> · 중복 {duplicateCount}건 묶음</span>}</p>
      {error&&<div className="error-state">{error}</div>}
      {feed&&filtered.length===0&&<div className="empty-state">조건에 맞는 자료가 없습니다.</div>}
      <div className="item-list">{visible.map(item=>{const related=duplicateGroups.get(titleKey(item.title))||[];return <article className={readItems.has(item.id)?"item-card read":"item-card"} key={item.id}>
        <button className="item-open" onClick={()=>openItem(item)}>
          <div className="item-meta"><span className="kind">{itemKind(item)}</span><span>{shortSource(sourceMap.get(item.source_id)?.source_name||"출처 미상")}</span><time>{formatDate(item.published_at)}</time></div>
          <h3>{item.title||"제목 없음"}</h3>
          <p>{item.ai_summary||item.raw_text||"본문이 없습니다."}</p>
          {related.length>1&&<span className="duplicate-label">{related.length}개 출처에서 확인</span>}
        </button>
        {item.url&&<a className="source-link" href={item.url} target="_blank" rel="noreferrer" aria-label="원문 열기">↗</a>}
      </article>})}</div>
      {visibleCount<filtered.length&&<button className="more-button" onClick={()=>setVisibleCount(n=>n+PAGE_SIZE)}>더 보기 <span>{filtered.length-visibleCount}</span></button>}
    </section>

    <section className="sources" id="sources">
      <div><p className="eyebrow">SOURCES</p><h2>출처</h2></div>
      <div className="source-list">{(feed?.sources||[]).map(s=><div key={s.id}><button className={favoriteSources.has(s.id)?"favorite on":"favorite"} onClick={()=>toggleFavorite(s.id)} aria-label={`${shortSource(s.source_name)} 즐겨찾기`}>★</button><div className="source-name"><strong>{shortSource(s.source_name)}</strong><span>{s.collection_url&&s.collection_url!==s.url?<><a href={s.collection_url} target="_blank" rel="noreferrer">배포 채널 ↗</a>{s.url&&<a href={s.url} target="_blank" rel="noreferrer">기관 사이트 ↗</a>}</>:s.url&&<a href={s.url} target="_blank" rel="noreferrer">사이트 ↗</a>}</span></div><span>{s.item_count>0?`${s.item_count}건`:`연결 준비`}</span><time>{formatDate(s.last_checked)}</time></div>)}</div>
    </section>

    <footer><span>공개 원문을 기준으로 정리합니다.</span><span>{feed?`갱신 ${formatDate(feed.generated_at,true)}`:"연결 중"}</span></footer>
    <a className="corner-title" href="#top">ITAEWON</a>

    {selected&&<div className="drawer-backdrop" onMouseDown={()=>setSelected(null)}><aside className="drawer" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true"><div className="drawer-top"><span>{itemKind(selected)}</span><button className="drawer-close" onClick={()=>setSelected(null)}>닫기 ×</button></div><article className="reader"><p className="eyebrow">{shortSource(sourceMap.get(selected.source_id)?.source_name||"출처 미상")}</p><h2>{selected.title}</h2><div className="fact-grid"><div><span>게시일</span><strong>{formatDate(selected.published_at)}</strong></div><div><span>유형</span><strong>{itemKind(selected)}</strong></div><div><span>출처</span><strong>{shortSource(sourceMap.get(selected.source_id)?.source_name||"출처 미상")}</strong></div></div>{(duplicateGroups.get(titleKey(selected.title))||[]).length>1&&<div className="related-sources"><strong>같은 자료를 확인한 출처</strong>{(duplicateGroups.get(titleKey(selected.title))||[]).map(item=><a key={item.id} href={item.url||"#"} target="_blank" rel="noreferrer">{shortSource(sourceMap.get(item.source_id)?.source_name||"출처") } ↗</a>)}</div>}<section><h3>내용</h3><div className="drawer-body">{(selected.ai_summary||selected.raw_text||"본문이 없습니다.").split(/\n{2,}|\n(?=[📍▪️•\-])/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph.trim()}</p>)}</div></section>{selected.url&&<a className="drawer-link" href={selected.url} target="_blank" rel="noreferrer">원문에서 계속 읽기 ↗</a>}</article></aside></div>}
  </main>;
}
