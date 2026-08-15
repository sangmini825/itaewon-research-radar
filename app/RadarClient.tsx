"use client";

import { useEffect, useMemo, useState } from "react";
import PlaceMap from "./PlaceMap";

type Source = { id:string; source_name:string; source_type:string|null; url:string|null; collection_url:string|null; status:string|null; last_checked:string|null; method:string|null; check_interval:string|null; item_count:number };
type Item = { id:string; source_id:string; title:string|null; url:string|null; published_at:string|null; collected_at:string|null; author:string|null; raw_text:string|null; content_type:string|null; editorial_category:string|null; review_status:string|null; ai_scope:string|null; ai_summary:string|null; ai_importance:number|null; ai_topics:string[]|null; ai_what_changed:string|null; ai_follow_up:string[]|null };
type WatchItem = { id:string; target_type:string|null; target_name:string; reason:string|null; priority:number|null; status:string|null; last_change_at:string|null };
type LooseEnd = { id:string; question:string; description:string|null; status:string|null; priority:number|null; related_topics:string[]|null };
type Event = { id:string; title:string; event_date:string|null; status:string|null; scope:string|null; topics:string[]|null; summary:string|null; what_changed:string|null; importance:number|null; follow_up:string[]|null; verified:boolean|null };
export type Place = { id:string; name:string; address:string|null; place_type:string|null; latitude:number|null; longitude:number|null; status:string|null; description:string|null; short_summary:string|null; opening_hours:string|null; tags:string[]|null; url:string|null; instagram_url:string|null; verified:boolean|null };
export type Feed = { generated_at:string; sources:Source[]; items:Item[]; watchlist:WatchItem[]; loose_ends:LooseEnd[]; events:Event[]; places:Place[] };

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
function editorialCategory(item:Item) {
  if(item.editorial_category)return item.editorial_category;
  if(item.content_type==="culture_event")return "culture";
  if(item.content_type==="news_article")return "news";
  if(item.content_type==="press_release")return "official";
  const text=`${item.title||""} ${item.raw_text||""}`;
  if(/논\s*평|성명|입장문|입장\b/.test(text))return "statement";
  if(/일시\s*:|장소\s*:|기자회견|문화제|간담회|참여를/.test(text))return "event";
  return "record";
}
function itemKind(item:Item){return ({news:"기사",statement:"성명·논평",official:"공식 자료",event:"행사·일정",culture:"문화·예술",record:"기록·소식"} as Record<string,string>)[editorialCategory(item)]||"공개 자료";}
function sourceGroup(source:Source){const type=source.source_type||"";if(/언론/.test(type))return "media";if(/시민사회/.test(type))return "civic";if(/문화|갤러리|공연장/.test(type))return "culture";return "public";}
function collectionLabel(source:Source) {
  if (source.source_name.includes("문화·예술")) return "소식 모음 ↗";
  if (source.collection_url?.includes("t.me")) return "배포 채널 ↗";
  return "수집 목록 ↗";
}
function titleKey(value:string|null) {
  return (value||"").toLowerCase().replace(/\[[^\]]+\]|[^0-9a-z가-힣]/g,"").replace(/^논평/,"");
}
function titleTokens(value:string|null) {
  const stop=new Set(["이태원","참사","관련","대한","서울","용산구","유가족","공개","뉴스"]);
  return new Set((value||"").toLowerCase().replace(/[^0-9a-z가-힣]+/g," ").split(" ").filter(token=>token.length>1&&!stop.has(token)));
}
function sameStory(a:Item,b:Item) {
  const aKey=titleKey(a.title),bKey=titleKey(b.title);
  if(aKey.length>=12&&aKey===bKey)return true;
  if(!a.published_at||!b.published_at)return false;
  if(Math.abs(+new Date(a.published_at)-+new Date(b.published_at))>2*86400000)return false;
  const at=titleTokens(a.title),bt=titleTokens(b.title);
  const common=[...at].filter(token=>bt.has(token)).length;
  return common>=3&&common/Math.max(1,Math.min(at.size,bt.size))>=.6;
}
function clusterItems(items:Item[]) {
  const representatives:Item[]=[];
  const groups=new Map<string,Item[]>();
  for(const item of items){const representative=representatives.find(candidate=>sameStory(candidate,item));if(representative){const next=[...(groups.get(representative.id)||[representative]),item];for(const member of next)groups.set(member.id,next);}else{representatives.push(item);groups.set(item.id,[item]);}}
  return {items:representatives,groups};
}
function eventRange(item:Item) {
  if(item.content_type!=="culture_event"||!item.raw_text?.includes("기간:"))return null;
  const dates=[...item.raw_text.matchAll(/(20\d{2})-(\d{2})-(\d{2})/g)].map(match=>new Date(`${match[0]}T00:00:00+09:00`));
  return dates.length?{start:dates[0],end:dates[1]||null}:null;
}
function eventStatus(item:Item) {
  const range=eventRange(item);if(!range)return null;
  const today=new Date();today.setHours(0,0,0,0);
  if(range.start>today)return "upcoming";
  if(range.end&&range.end<today)return "ended";
  return "ongoing";
}
function eventStatusLabel(item:Item){const status=eventStatus(item);return status==="upcoming"?"예정":status==="ongoing"?"진행 중":status==="ended"?"종료":null;
}

export default function RadarClient({feed,error=""}:{feed:Feed|null;error?:string}) {
  const [query,setQuery]=useState("");
  const [sourceFilter,setSourceFilter]=useState("all");
  const [kindFilter,setKindFilter]=useState("all");
  const [sourceOpen,setSourceOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [pagination,setPagination]=useState({count:PAGE_SIZE,key:""});
  const [selected,setSelected]=useState<Item|null>(null);
  const [readItems,setReadItems]=useState<Set<string>>(new Set());
  const [favoriteSources,setFavoriteSources]=useState<Set<string>>(new Set());
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [scheduleFilter,setScheduleFilter]=useState("all");
  const [suggestOpen,setSuggestOpen]=useState(false);
  const [suggestUrl,setSuggestUrl]=useState("");
  const [suggestNote,setSuggestNote]=useState("");
  const [suggestType,setSuggestType]=useState("instagram");
  const [suggestState,setSuggestState]=useState("");
  useEffect(()=>{const frame=requestAnimationFrame(()=>{try{setReadItems(new Set(JSON.parse(localStorage.getItem("itaewon-read")||"[]")));setFavoriteSources(new Set(JSON.parse(localStorage.getItem("itaewon-favorites")||"[]")))}catch{}});return()=>cancelAnimationFrame(frame)},[]);
  useEffect(()=>{document.body.classList.toggle("drawer-open",Boolean(selected));return()=>document.body.classList.remove("drawer-open")},[selected]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setSelected(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[]);
  const sourceMap=useMemo(()=>new Map((feed?.sources||[]).map(s=>[s.id,s])),[feed]);
  const filtered=useMemo(()=>{
    const keyword=query.trim().toLowerCase();
    const matched=(feed?.items||[]).filter(item=>{
      const haystack=[item.title,item.raw_text,item.author,item.ai_summary].filter(Boolean).join(" ").toLowerCase();
      const status=eventStatus(item);
      return (sourceFilter==="all"||item.source_id===sourceFilter)&&(kindFilter==="all"||editorialCategory(item)===kindFilter)&&(scheduleFilter==="all"||status===scheduleFilter)&&(!favoritesOnly||favoriteSources.has(item.source_id))&&(!keyword||haystack.includes(keyword));
    });
    return sourceFilter==="all"?clusterItems(matched).items:matched;
  },[feed,query,sourceFilter,kindFilter,scheduleFilter,favoritesOnly,favoriteSources]);
  const filterKey=`${query}|${sourceFilter}|${kindFilter}|${scheduleFilter}|${favoritesOnly}`;
  const visibleCount=pagination.key===filterKey?pagination.count:PAGE_SIZE;
  const visible=filtered.slice(0,visibleCount);
  const activeSources=feed?.sources.filter(s=>s.item_count>0).length||0;
  const allClusters=useMemo(()=>clusterItems(feed?.items||[]),[feed]);
  const duplicateCount=(feed?.items.length||0)-allClusters.items.length;
  const selectedSource=(feed?.sources||[]).find(s=>s.id===sourceFilter);
  const duplicateGroups=allClusters.groups;
  const openItem=(item:Item)=>{setSelected(item);setReadItems(current=>{const next=new Set(current).add(item.id);localStorage.setItem("itaewon-read",JSON.stringify([...next]));return next;});};
  const toggleFavorite=(id:string)=>setFavoriteSources(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);localStorage.setItem("itaewon-favorites",JSON.stringify([...next]));return next;});
  const kindCounts=useMemo(()=>Object.fromEntries(["news","statement","official","event","culture","record"].map(category=>[category,(feed?.items||[]).filter(item=>editorialCategory(item)===category).length])),[feed]);
  const sourceGroups=useMemo(()=>[{id:"public",label:"공공·조사기관"},{id:"civic",label:"시민사회"},{id:"media",label:"언론"},{id:"culture",label:"문화·공간"}].map(group=>({...group,sources:(feed?.sources||[]).filter(source=>sourceGroup(source)===group.id)})),[feed]);
  const submitSuggestion=async(e:React.FormEvent)=>{e.preventDefault();setSuggestState("저장 중…");try{const response=await fetch("https://dbcgtfiohkfsvxxnximj.supabase.co/functions/v1/itaewon-radar-suggest",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:suggestUrl,note:suggestNote,source_type:suggestType,website:""})});const result=await response.json();if(!response.ok)throw new Error(result.error||"저장 실패");setSuggestState("검토 목록에 저장했습니다.");setSuggestUrl("");setSuggestNote("");}catch(reason){setSuggestState(reason instanceof Error?reason.message:"저장하지 못했습니다.");}};

  return <main>
    <header className="topbar">
      <a className="brand" href="#top">공개 자료</a>
      <nav><a className="toplink" href="#places">공간</a><a className="toplink" href="#sources">출처</a></nav>
    </header>

    <section className="hero" id="top">
      <p className="eyebrow">ITAEWON · PUBLIC SOURCES</p>
      <h1>이태원 관련 자료</h1>
      <p className="hero-copy">기록과 행정 자료에 문화·예술, 지역의 현재를 더해 한곳에서 확인합니다.</p>
      <div className="summary-line"><span>자료 <b>{feed?.items.length??"—"}</b></span><span>연결 출처 <b>{activeSources||"—"}</b></span><span>매일 08:00 갱신</span></div>
    </section>

    <section className="archive" aria-label="수집 자료">
      <div className="archive-tools">
        <div><p className="eyebrow">ARCHIVE</p><h2>자료</h2></div>
        <div className="tool-buttons">
          <button className={sourceOpen||sourceFilter!=="all"?"active":""} onClick={()=>setSourceOpen(v=>!v)}>출처 <span>{selectedSource?shortSource(selectedSource.source_name):"전체"}</span></button>
          <button className={searchOpen||query?"active":""} onClick={()=>setSearchOpen(v=>!v)}>검색 <span>{query?"적용됨":""}</span></button>
          <button aria-pressed={favoritesOnly} className={favoritesOnly?"active":""} onClick={()=>setFavoritesOnly(v=>!v)}>저장 <span>{favoriteSources.size||""}</span></button>
        </div>
      </div>
      {sourceOpen&&<div className="source-picker" aria-label="출처 선택"><button className={sourceFilter==="all"?"active":""} onClick={()=>{setSourceFilter("all");setSourceOpen(false)}}>모든 출처 <span>{feed?.items.length||0}</span></button>{(feed?.sources||[]).map(s=><button key={s.id} className={sourceFilter===s.id?"active":""} onClick={()=>{setSourceFilter(s.id);setSourceOpen(false)}}>{shortSource(s.source_name)} <span>{s.item_count}</span></button>)}</div>}
      {searchOpen&&<div className="search-panel"><input autoFocus aria-label="자료 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="제목과 내용 검색" />{query&&<button onClick={()=>setQuery("")}>지우기</button>}</div>}
      <div className="kind-filters" aria-label="자료 유형">
        {[{id:"all",label:"전체",count:feed?.items.length||0},{id:"news",label:"기사",count:kindCounts.news},{id:"statement",label:"성명·논평",count:kindCounts.statement},{id:"official",label:"공식 자료",count:kindCounts.official},{id:"event",label:"행사·일정",count:kindCounts.event},{id:"culture",label:"문화·예술",count:kindCounts.culture},{id:"record",label:"기록·소식",count:kindCounts.record}].map(kind=><button key={kind.id} className={kindFilter===kind.id?"active":""} onClick={()=>{setKindFilter(kind.id);if(kind.id!=="culture")setScheduleFilter("all")}}>{kind.label}<span>{kind.count}</span></button>)}
      </div>
      {kindFilter==="culture"&&<p className="channel-note">전시·공연·축제 소식입니다. 일정과 장소는 원문에서 최종 확인해 주세요.</p>}
      {kindFilter==="culture"&&<div className="schedule-filters" aria-label="행사 상태">{[{id:"all",label:"모든 일정"},{id:"ongoing",label:"진행 중"},{id:"upcoming",label:"예정"},{id:"ended",label:"종료"}].map(option=><button key={option.id} className={scheduleFilter===option.id?"active":""} onClick={()=>setScheduleFilter(option.id)}>{option.label}</button>)}</div>}
      {favoritesOnly&&<p className="channel-note">별표로 저장한 출처의 자료만 보고 있습니다.</p>}
      <p className="result-count">{filtered.length}개 중 {Math.min(visibleCount,filtered.length)}개 표시{sourceFilter==="all"&&kindFilter==="all"&&duplicateCount>0&&<span> · 중복 {duplicateCount}건 묶음</span>}</p>
      {error&&<div className="error-state">{error}</div>}
      {feed&&filtered.length===0&&<div className="empty-state">{favoritesOnly&&favoriteSources.size===0?"출처 아래의 별표를 눌러 자주 보는 출처를 저장해 주세요.":"조건에 맞는 자료가 없습니다."}</div>}
      <div className="item-list">{visible.map((item,index)=>{const related=duplicateGroups.get(item.id)||[];const schedule=eventStatusLabel(item);return <article className={readItems.has(item.id)?"item-card read":"item-card"} style={{"--item-index":Math.min(index,8)} as React.CSSProperties} key={item.id}>
        <button className="item-open" onClick={()=>openItem(item)}>
          <div className="item-meta"><span className="kind">{itemKind(item)}</span>{schedule&&<span className={`schedule ${eventStatus(item)}`}>{schedule}</span>}<span>{shortSource(sourceMap.get(item.source_id)?.source_name||"출처 미상")}</span><time>{formatDate(item.published_at)}</time></div>
          <h3>{item.title||"제목 없음"}</h3>
          <p>{item.ai_summary||item.raw_text||"본문이 없습니다."}</p>
          {related.length>1&&<span className="duplicate-label">{related.length}개 출처에서 확인</span>}
        </button>
        {item.url&&<a className="source-link" href={item.url} target="_blank" rel="noreferrer" aria-label="원문 열기">↗</a>}
      </article>})}</div>
      {visibleCount<filtered.length&&<button className="more-button" onClick={()=>setPagination({count:visibleCount+PAGE_SIZE,key:filterKey})}>더 보기 <span>{filtered.length-visibleCount}</span></button>}
    </section>

    <section className="suggestions" aria-label="자료 제보">
      <div><p className="eyebrow">SUGGEST</p><h2>자료 제보</h2><p>인스타그램·매거진·업장 링크를 남기면 공식 원문과 중복을 확인합니다.</p></div>
      <div>{!suggestOpen?<button className="suggest-toggle" onClick={()=>setSuggestOpen(true)}>링크 제보하기</button>:<form className="suggest-form" onSubmit={submitSuggestion}><label>자료 유형<select value={suggestType} onChange={e=>setSuggestType(e.target.value)}><option value="instagram">인스타그램</option><option value="magazine">매거진</option><option value="venue">업장·기관</option><option value="other">기타</option></select></label><label>링크<input type="url" required value={suggestUrl} onChange={e=>setSuggestUrl(e.target.value)} placeholder="https://" /></label><label>메모<textarea value={suggestNote} onChange={e=>setSuggestNote(e.target.value)} placeholder="이태원과의 관련성이나 확인할 내용을 적어 주세요." /></label><input className="honeypot" tabIndex={-1} aria-hidden="true" name="website" /><div className="suggest-actions"><button type="submit">검토 목록에 저장</button><button type="button" onClick={()=>setSuggestOpen(false)}>닫기</button></div>{suggestState&&<p className="suggest-state" role="status">{suggestState}</p>}</form>}</div>
    </section>

    <PlaceMap places={feed?.places||[]} />

    <section className="sources" id="sources">
      <div><p className="eyebrow">SOURCES</p><h2>출처</h2></div>
      <div className="source-groups">{sourceGroups.map((group,index)=><details key={group.id} open={index===0}><summary><strong>{group.label}</strong><span>{group.sources.length}개 출처 · {group.sources.reduce((sum,source)=>sum+source.item_count,0)}건</span></summary><div className="source-list">{group.sources.map(s=><div key={s.id}><button className={favoriteSources.has(s.id)?"favorite on":"favorite"} onClick={()=>toggleFavorite(s.id)} aria-label={`${shortSource(s.source_name)} 즐겨찾기`}>★</button><div className="source-name"><strong>{shortSource(s.source_name)}</strong><small>{s.source_type||"공개 출처"}</small><span>{s.collection_url&&s.collection_url!==s.url?<><a href={s.collection_url} target="_blank" rel="noreferrer">{collectionLabel(s)}</a>{s.url&&<a href={s.url} target="_blank" rel="noreferrer">기관 사이트 ↗</a>}</>:s.url&&<a href={s.url} target="_blank" rel="noreferrer">사이트 ↗</a>}</span></div><span className={`source-health ${s.status}`}>{s.status==="monitoring"?"관찰 중":s.last_checked?"수집 정상":"연결 준비"}<small>{s.item_count}건</small></span><time>{s.last_checked?formatDate(s.last_checked):"확인 전"}</time></div>)}</div></details>)}</div>
    </section>

    <footer><span>공개 원문을 기준으로 정리합니다.</span><span>{feed?`갱신 ${formatDate(feed.generated_at,true)}`:"연결 중"}</span></footer>
    <a className="corner-title" href="#top">ITAEWON</a>

    {selected&&<div className="drawer-backdrop" onMouseDown={()=>setSelected(null)}><aside className="drawer" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="자료 상세"><div className="drawer-top"><span>{itemKind(selected)}</span><button className="drawer-close" onClick={()=>setSelected(null)}>닫기 ×</button></div><article className="reader"><p className="eyebrow">{shortSource(sourceMap.get(selected.source_id)?.source_name||"출처 미상")}</p><h2>{selected.title}</h2><div className="fact-grid"><div><span>{selected.content_type==="culture_event"?"일정 기준":"게시일"}</span><strong>{formatDate(selected.published_at)}</strong></div><div><span>유형</span><strong>{eventStatusLabel(selected)||itemKind(selected)}</strong></div><div><span>출처</span><strong>{shortSource(sourceMap.get(selected.source_id)?.source_name||"출처 미상")}</strong></div></div>{selected.ai_summary&&<section className="reader-summary"><h3>요약</h3><p>{selected.ai_summary}</p></section>}{(duplicateGroups.get(selected.id)||[]).length>1&&<div className="related-sources"><strong>같은 소식을 확인한 출처</strong>{(duplicateGroups.get(selected.id)||[]).map(item=><a key={item.id} href={item.url||"#"} target="_blank" rel="noreferrer">{shortSource(sourceMap.get(item.source_id)?.source_name||"출처") } ↗</a>)}</div>}<section><h3>{selected.ai_summary?"원문 발췌":"내용"}</h3><div className="drawer-body">{(selected.raw_text||selected.ai_summary||"본문이 없습니다.").split(/\n{2,}|(?<=[.!?。])\s+(?=[가-힣A-Z0-9])|\n(?=[📍▪️•\-])/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph.trim()}</p>)}</div></section>{selected.url&&<a className="drawer-link" href={selected.url} target="_blank" rel="noreferrer">원문에서 계속 읽기 ↗</a>}</article></aside></div>}
  </main>;
}
