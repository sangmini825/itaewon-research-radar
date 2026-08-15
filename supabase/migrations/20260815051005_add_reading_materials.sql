create table if not exists public.reading_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  material_type text not null check (material_type in ('book','oral','forum','report','research')),
  creator text,
  publisher text,
  published_on date,
  summary text,
  url text not null unique,
  access_note text,
  pages integer check (pages is null or pages > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  tags text[] not null default '{}',
  status text not null default 'public' check (status in ('draft','public','hidden')),
  featured boolean not null default false,
  verified boolean not null default false,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reading_materials enable row level security;
revoke all on table public.reading_materials from anon, authenticated;
grant select, insert, update, delete on table public.reading_materials to service_role;

create index if not exists reading_materials_status_date_idx
  on public.reading_materials(status, published_on desc nulls last);

insert into public.reading_materials
  (title, material_type, creator, publisher, published_on, summary, url, access_note, pages, tags, featured, verified, last_verified_at)
values
  ('우리 지금 이태원이야', 'book', '10·29 이태원 참사 작가기록단', '창비', '2023-10-20', '생존자와 유가족, 희생자의 친구, 이태원 주민과 노동자의 목소리를 담은 인터뷰 기록입니다.', 'https://www.changbi.com/BookDetail?bookid=4276', '출판사 도서 소개', 248, array['구술','생존자','유가족','지역'], true, true, now()),
  ('제가 참사 생존자인가요', 'book', '김초롱', '아몬드', '2023-10-29', '참사 생존자가 당일의 시간과 이후 319일의 회복 과정을 직접 기록한 책입니다.', 'https://www.yes24.com/product/goods/122879432', '도서 정보·구매', null, array['생존자','회복','증언'], true, true, now()),
  ('참사는 골목에 머물지 않는다', 'book', '10·29 이태원 참사 작가기록단', '창비', '2024-10-29', '참사 이후 2년 동안 유가족들이 진상규명과 기억을 위해 지나온 시간을 구술로 기록했습니다.', 'https://www.changbi.com/bookList?page=10', '출판사 도서 목록', 404, array['구술','유가족','기록'], true, true, now()),
  ('이태원으로 연결합니다', 'book', '10·29 이태원 참사 시민기록단', '플레이아데스', '2024-10-01', '참사 이후 지역과 시민의 연결, 연대 활동을 현장에서 기록한 책입니다.', 'https://m.yes24.com/goods/detail/134646416', '도서 정보·구매', null, array['지역','연대','시민기록'], false, true, now()),
  ('10·29 참사, 기억과 기록', 'oral', 'MBC 라디오 김종배의 시선집중 제작팀', 'MBC', '2023-01-01', '유가족과 당사자의 목소리를 꾸준히 전한 라디오 인터뷰 연속 기획입니다.', 'https://www.pdjournal.com/news/articleView.html?idxno=75468', '프로젝트 소개', null, array['라디오','인터뷰','유가족'], true, true, now()),
  ('10.29 이태원참사 100일, 2차 가해자는 누구인가', 'forum', '민주언론시민연합 외', '민주언론시민연합', '2023-02-03', '참사 보도와 온라인 공간에서 발생한 2차 가해의 양상과 책임을 살핀 토론회 자료집입니다.', 'https://www.ccdm.or.kr/forum/317398', '자료집 PDF 제공', null, array['2차가해','언론','토론회'], false, true, now()),
  ('10.29 이태원 참사 2주기를 마주하는 질문들', 'forum', '재난피해자권리센터 우리함께 외', '재난피해자권리센터 우리함께', '2024-10-25', '신진 연구자들이 재난 피해자 권리와 연구방법, 기록의 쟁점을 함께 다룬 포럼 자료입니다.', 'https://dl.nanet.go.kr/detail/PAMP10000000078046', '국회도서관 소장정보', null, array['피해자권리','연구방법','포럼'], false, true, now()),
  ('용산 이태원 참사 진상규명과 재발방지를 위한 국정조사 결과보고서', 'report', '국회 국정조사 특별위원회', '대한민국 국회', '2023-01-01', '국정조사의 구성과 조사 내용, 기관별 대응, 재발 방지 의견을 수록한 공식 결과보고서입니다.', 'https://dl.nanet.go.kr/detail/NONB12024000007808', '원문 PDF·국회도서관', 909, array['국정조사','공식보고서','진상규명'], true, true, now()),
  ('10·29 이태원 참사, 인권으로 다시 쓰고 존엄으로 기억하다', 'report', '10·29 이태원 참사 시민대책회의 외', null, '2023-01-01', '참사 피해자의 권리 침해와 지원 실태를 인권의 관점에서 정리한 조사보고서입니다.', 'https://politicalmamas.kr/post/3098/', '원문 PDF 제공', null, array['인권','피해자권리','실태조사'], false, true, now()),
  ('재난 이후를 거닐기', 'research', '김지오', '연세대학교 대학원', '2025-01-01', '10·29 이태원 참사 생존자의 일상 속 회복 과정을 심층 인터뷰와 참여관찰로 살핀 연구입니다.', 'https://www.riss.kr/search/Search.do?colName=bib_t&isDetailSearch=Y&queryText=znSubject%2C%EC%9D%B4%ED%83%9C%EC%9B%90+%EC%B0%B8%EC%82%AC&searchGubun=true', 'RISS 학위논문 검색', null, array['생존자','회복','질적연구'], false, true, now())
on conflict (url) do update set
  title = excluded.title,
  material_type = excluded.material_type,
  creator = excluded.creator,
  publisher = excluded.publisher,
  published_on = excluded.published_on,
  summary = excluded.summary,
  access_note = excluded.access_note,
  pages = excluded.pages,
  tags = excluded.tags,
  featured = excluded.featured,
  verified = excluded.verified,
  last_verified_at = excluded.last_verified_at,
  updated_at = now();
