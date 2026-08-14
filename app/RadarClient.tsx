"use client";

import { useMemo, useState } from "react";

type Source = { id:string; source_name:string; status:string|null; last_checked:string|null; item_count:number };
type Item = { id:string; source_id:string; title:string|null; url:string|null; published_at:string|null; collected_at:string|null; author:string|null; raw_text:string|null; content_type:string|null; review_status:string|null; ai_scope:string|null; ai_summary:string|null; ai_importance:number|null; ai_topics:string[]|null; ai_what_changed:string|null; ai_follow_up:string[]|null };
type WatchItem = { id:string; target_type:string|null; target_name:string; reason:string|null; priority:number|null; status:string|null; last_change_at:string|null };
type LooseEnd = { id:string; question:string; description:string|null; status:string|null; priority:number|null; related_topics:string[]|null };
type Event = { id:string; title:string; event_date:string|null; status:string|null; scope:string|null; topics:string[]|null; summary:string|null; what_changed:string|null; importance:number|null; follow_up:string[]|null; verified:boolean|null };

export type Feed = { generated_at:string; sources:Source[]; items:Item[]; watchlist:WatchItem[]; loose_ends:LooseEnd[]; events:Event[] };
type View = "radar" | "topics" | "watchlist" | "questions";

const fallbackTopics = (item: Item) => {
  if (item.ai_topics?.length) return item.ai_topics;
  const text = `${item.title} ${item.raw_text}`;
  const topics:string[] = [];
  if (/특조위|진상규명|수사|청문회|책임/.test(text)) topics.push("진상규명");
  if (/피해자|유가족|트라우마|치유|지원/.test(text)) topics.push("피해자 권리");
  if (/2차 가해|허위|모욕|실형|구속/.test(text)) topics.push("2차 가해");
  if (/추모|기억식|별들의 집|사이렌/.test(text)) topics.push("기억·추모");
  if (/상인|상권|지역사회/.test(text)) topics.push("지역·상인");
  if (/법|시행령|정부|행정안전부/.test(text)) topics.push("제도·행정");
  return topics.length ? topics : ["분류 대기"];
};

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
  const [view,setView]=useState<View>("radar");
  const [query,setQuery]=useState("");
  const [sourceFilter,setSourceFilter]=useState("all");
  const [topicFilter,setTopicFilter]=useState("all");
  const [selected,setSelected]=useState<Item|null>(null);
  const sourceMap=useMemo(()=>new Map((feed?.sources||[]).map(s=>[s.id,s])),[feed]);
  const allTopics=useMemo(()=>Array.from(new Set((feed?.items||[]).flatMap(fallbackTopics))).sort(),[feed]);
  const filtered=useMemo(()=>{
    const keyword=query.trim().toLowerCase();
    return (feed?.items||[]).filter(item=>{
      const topics=fallbackTopics(item);
      const haystack=[item.title,item.raw_text,item.author,...topics].filter(Boolean).join(" ").toLowerCase();
      return (sourceFilter==="all"||item.source_id===sourceFilter)&&(topicFilter==="all"||topics.includes(topicFilter))&&(!keyword||haystack.includes(keyword));
    });
  },[feed,query,sourceFilter,topicFilter]);
  const activeSources=feed?.sources.filter(s=>s.item_count>0).length||0;
  const latest=feed?.items[0];
  const pending=feed?.items.filter(i=>(i.review_status||"inbox")==="inbox").length||0;

  return <main>
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark">IR</span><span>이태원 리서치 레이더</span></a>
      <nav className="main-nav" aria-label="주요 메뉴">
        {([['radar','레이더'],['topics','주제'],['watchlist','워치리스트'],['questions','취재 질문']] as [View,string][]).map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}
      </nav>
      <div className="topbar-meta"><span className="live-dot"/>매일 08:00 갱신</div>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow">ITAewON / RESEARCH INFRASTRUCTURE</div>
      <h1>이태원의 변화를<br/>놓치지 않기 위해.</h1>
      <p className="hero-copy">10·29 이후의 움직임, 제도 변화와 지역의 신호를 원자료에서 취재 질문까지 연결합니다.</p>
      <div className="hero-stats"><div><strong>{feed?.items.length??'—'}</strong><span>수집 자료</span></div><div><strong>{pending}</strong><span>검토 대기</span></div><div><strong>{activeSources||'—'}</strong><span>작동 출처</span></div><div><strong>{allTopics.length}</strong><span>관찰 주제</span></div></div>
      <div className="latest-line"><span>LATEST</span><strong>{latest?.title||"데이터를 확인하고 있습니다"}</strong><time>{formatDate(latest?.published_at||null)}</time></div>
    </section>

    {view==='radar'&&<section className="workspace">
      <aside className="source-panel">
        <div className="section-label">출처</div>
        <button className={sourceFilter==='all'?'source-button active':'source-button'} onClick={()=>setSourceFilter('all')}><span>전체 자료</span><b>{feed?.items.length||0}</b></button>
        {(feed?.sources||[]).map(s=><button key={s.id} className={sourceFilter===s.id?'source-button active':'source-button'} onClick={()=>setSourceFilter(s.id)}><span>{shortSource(s.source_name)}</span><b>{s.item_count}</b></button>)}
        <div className="section-label second">주제</div>
        <button className={topicFilter==='all'?'source-button active':'source-button'} onClick={()=>setTopicFilter('all')}><span>모든 주제</span></button>
        {allTopics.map(t=><button key={t} className={topicFilter===t?'source-button active':'source-button'} onClick={()=>setTopicFilter(t)}><span>{t}</span></button>)}
      </aside>
      <div className="feed-panel">
        <div className="feed-tools"><div><div className="section-label">RAW ITEMS / INBOX</div><h2>새로 들어온 자료 <small>{filtered.length}</small></h2></div><label className="search-box"><span>검색</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="제목, 본문, 주제"/></label></div>
        {error&&<div className="error-state">{error}</div>}{feed&&filtered.length===0&&<div className="empty-state">조건에 맞는 자료가 없습니다.</div>}
        <div className="item-list">{filtered.map((item,index)=><article className="item-card" key={item.id}>
          <div className="item-index">{String(index+1).padStart(2,'0')}</div><div className="item-main"><div className="item-meta"><span>{shortSource(sourceMap.get(item.source_id)?.source_name||'출처 미상')}</span><time>{formatDate(item.published_at)}</time><span>{item.content_type==='website_snapshot'?'사이트 변화':'원문'}</span></div><h3>{item.title||'제목 없음'}</h3><p>{item.ai_summary||item.raw_text||'본문이 없습니다.'}</p><div className="topic-row">{fallbackTopics(item).map(t=><span key={t}>{t}</span>)}</div><div className="item-actions"><button onClick={()=>setSelected(item)}>리서치 카드 열기</button>{item.url&&<a href={item.url} target="_blank" rel="noreferrer">원문 확인 ↗</a>}</div></div><div className="item-status"><span>{item.review_status==='accepted'?'채택':item.review_status==='hold'?'보류':'검토 전'}</span>{item.ai_importance&&<b>중요도 {item.ai_importance}</b>}</div>
        </article>)}</div>
      </div>
    </section>}

    {view==='topics'&&<section className="page-section"><div className="section-head"><div><div className="section-label">TOPIC INDEX</div><h2>관찰 주제</h2></div><p>현재 수집된 원문을 주제별로 묶었습니다. AI 분류 전에는 제목과 본문 키워드로 임시 분류합니다.</p></div><div className="topic-grid">{allTopics.map(topic=>{const items=(feed?.items||[]).filter(i=>fallbackTopics(i).includes(topic));return <button key={topic} onClick={()=>{setTopicFilter(topic);setView('radar')}}><span>{String(items.length).padStart(2,'0')}</span><strong>{topic}</strong><p>{items[0]?.title}</p></button>})}</div></section>}

    {view==='watchlist'&&<section className="page-section"><div className="section-head"><div><div className="section-label">STATE CHANGE</div><h2>워치리스트</h2></div><p>한 번의 기사보다 상태가 바뀌는 순간을 추적합니다.</p></div><div className="watch-list">{(feed?.watchlist||[]).map(w=><article key={w.id}><div><span className="priority">P{w.priority||3}</span><span>{w.target_type||'issue'}</span></div><h3>{w.target_name}</h3><p>{w.reason||'변화 여부를 정기 확인합니다.'}</p><time>{w.last_change_at?`마지막 변화 ${formatDate(w.last_change_at)}`:'기준 상태 등록'}</time></article>)}{!feed?.watchlist?.length&&<div className="blank-slate"><strong>첫 워치리스트를 준비하고 있습니다.</strong><p>특조위 조사, 피해자 지원, 2차 가해 판결처럼 상태 변화가 중요한 항목이 이곳에 쌓입니다.</p></div>}</div></section>}

    {view==='questions'&&<section className="page-section"><div className="section-head"><div><div className="section-label">LOOSE ENDS</div><h2>아직 답하지 못한 질문</h2></div><p>보도 이후에도 남는 질문을 보존해 다음 취재의 출발점으로 삼습니다.</p></div><div className="question-list">{(feed?.loose_ends||[]).map((q,i)=><article key={q.id}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{q.question}</h3><p>{q.description}</p><div className="topic-row">{(q.related_topics||[]).map(t=><span key={t}>{t}</span>)}</div></div><b>P{q.priority||3}</b></article>)}{!feed?.loose_ends?.length&&<div className="blank-slate"><strong>아직 등록된 질문이 없습니다.</strong><p>자료의 ‘후속 확인’ 항목이 편집 검토를 거치면 이곳에 모입니다.</p></div>}</div></section>}

    <section className="source-health"><div className="section-head"><div><div className="section-label">COLLECTION HEALTH</div><h2>출처별 수집 상태</h2></div><p>자동 수집 3개 · 연결 준비 2개</p></div><div className="health-grid">{(feed?.sources||[]).map(s=><div className="health-card" key={s.id}><div className={s.item_count>0?'health-light on':'health-light'}/><strong>{shortSource(s.source_name)}</strong><span>{s.item_count>0?`${s.item_count}건 수집`:'연결 준비 중'}</span><time>확인 {formatDate(s.last_checked,true)}</time></div>)}</div></section>
    <footer><span>ITAewON RESEARCH RADAR</span><span>공개 열람 · 원문 출처 표시</span><span>{feed?`데이터 갱신 ${formatDate(feed.generated_at,true)}`:'연결 중'}</span></footer>

    {selected&&<div className="drawer-backdrop" onMouseDown={()=>setSelected(null)}><aside className="drawer" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true"><button className="drawer-close" onClick={()=>setSelected(null)}>닫기 ×</button><div className="section-label">RESEARCH CARD</div><p className="drawer-source">{shortSource(sourceMap.get(selected.source_id)?.source_name||'출처 미상')}</p><h2>{selected.title}</h2><div className="drawer-meta"><span>{formatDate(selected.published_at)}</span><span>{selected.author||'작성자 미상'}</span><span>{selected.ai_scope||'DIRECT'}</span></div><section className="drawer-block"><h3>요약</h3><p>{selected.ai_summary||'자동 요약 전입니다. 아래 원문 발췌를 먼저 확인해 주세요.'}</p></section><section className="drawer-block"><h3>무엇이 달라졌나</h3><p>{selected.ai_what_changed||'이전 상태와 비교하는 분석이 아직 필요합니다.'}</p></section><section className="drawer-block"><h3>후속 확인</h3>{selected.ai_follow_up?.length?<ul>{selected.ai_follow_up.map(q=><li key={q}>{q}</li>)}</ul>:<p>편집 검토 후 취재 질문을 등록합니다.</p>}</section><details><summary>원문 발췌 보기</summary><div className="drawer-body">{selected.raw_text}</div></details>{selected.url&&<a className="drawer-link" href={selected.url} target="_blank" rel="noreferrer">원문에서 확인하기 ↗</a>}</aside></div>}
  </main>;
}
