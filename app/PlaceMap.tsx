"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Place } from "./RadarClient";

const TYPES = [
  ["all", "전체"], ["bar", "바"], ["restaurant", "음식점"], ["club", "클럽"],
  ["gallery", "전시장"], ["museum", "미술관"], ["performance", "공연장"],
] as const;

const TYPE_LABEL:Record<string,string> = {
  bar:"바", restaurant:"음식점", club:"클럽", gallery:"전시장", museum:"미술관",
  performance:"공연장", shop:"상점", cafe:"카페", other:"기타",
};

export default function PlaceMap({places}:{places:Place[]}) {
  const mapNode=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<import("maplibre-gl").Map|null>(null);
  const markersRef=useRef<import("maplibre-gl").Marker[]>([]);
  const [filter,setFilter]=useState("all");
  const [selected,setSelected]=useState<Place|null>(null);
  const visible=useMemo(()=>places.filter(place=>filter==="all"||place.place_type===filter),[places,filter]);

  useEffect(()=>{
    if(!mapNode.current||mapRef.current)return;
    let cancelled=false;
    import("maplibre-gl").then(({default:maplibregl})=>{
      if(cancelled||!mapNode.current)return;
      const map=new maplibregl.Map({
        container:mapNode.current,
        style:"https://tiles.openfreemap.org/styles/positron",
        center:[126.9946,37.5345], zoom:14.2,
        attributionControl:false,
      });
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
      map.addControl(new maplibregl.AttributionControl({compact:true}));
      mapRef.current=map;
    });
    return()=>{cancelled=true;markersRef.current.forEach(marker=>marker.remove());mapRef.current?.remove();mapRef.current=null;};
  },[]);

  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    let disposed=false;
    const draw=async()=>{
      const {default:maplibregl}=await import("maplibre-gl");
      if(disposed)return;
      markersRef.current.forEach(marker=>marker.remove());
      markersRef.current=visible.filter(place=>place.latitude!=null&&place.longitude!=null).map(place=>{
        const button=document.createElement("button");
        button.className=`map-marker type-${place.place_type||"other"}`;
        button.type="button";button.title=place.name;button.setAttribute("aria-label",`${place.name} 지도 표시`);
        button.addEventListener("click",()=>setSelected(place));
        return new maplibregl.Marker({element:button}).setLngLat([Number(place.longitude),Number(place.latitude)]).addTo(map);
      });
    };
    if(map.loaded())void draw();else map.once("load",draw);
    return()=>{disposed=true;};
  },[visible]);

  const choose=(place:Place)=>{
    setSelected(place);
    if(place.latitude!=null&&place.longitude!=null)mapRef.current?.flyTo({center:[Number(place.longitude),Number(place.latitude)],zoom:16,duration:650});
  };

  return <section className="places" id="places" aria-label="이태원 공간 지도">
    <div className="places-head"><div><p className="eyebrow">PLACES</p><h2>공간</h2><p>업종별로 이태원의 공간을 살펴봅니다. 확인된 정보부터 순차적으로 공개합니다.</p></div><span>{visible.length}곳</span></div>
    <div className="place-filters" aria-label="공간 유형">{TYPES.map(([id,label])=><button key={id} className={filter===id?"active":""} onClick={()=>{setFilter(id);setSelected(null)}}>{label}<span>{id==="all"?places.length:places.filter(place=>place.place_type===id).length}</span></button>)}</div>
    <div className="map-shell">
      <div className="map-canvas" ref={mapNode} aria-label="이태원 공간 지도" />
      <div className="place-panel">
        {selected?<article className="place-detail"><button onClick={()=>setSelected(null)} aria-label="공간 정보 닫기">×</button><span>{TYPE_LABEL[selected.place_type||"other"]||"공간"}{selected.verified&&" · 확인됨"}</span><h3>{selected.name}</h3>{selected.short_summary&&<p>{selected.short_summary}</p>}<dl><div><dt>주소</dt><dd>{selected.address||"확인 중"}</dd></div>{selected.opening_hours&&<div><dt>운영</dt><dd>{selected.opening_hours}</dd></div>}</dl>{selected.tags?.length?<div className="place-tags">{selected.tags.map(tag=><span key={tag}>{tag}</span>)}</div>:null}{selected.url&&<a href={selected.url} target="_blank" rel="noreferrer">공식 정보 보기 ↗</a>}</article>:visible.length?<div className="place-list">{visible.map(place=><button key={place.id} onClick={()=>choose(place)}><span>{TYPE_LABEL[place.place_type||"other"]||"공간"}</span><strong>{place.name}</strong><small>{place.short_summary||place.address||"정보 확인 중"}</small></button>)}</div>:<div className="place-empty"><strong>공간 정보를 준비하고 있습니다.</strong><p>Supabase의 places 표에 정보를 추가하면 이곳에 바로 표시됩니다.</p></div>}
      </div>
    </div>
  </section>;
}
