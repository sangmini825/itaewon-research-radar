insert into public.places
  (name, address, place_type, latitude, longitude, status, short_summary, opening_hours, tags, url, instagram_url, verified)
select seed.*
from (values
  ('페이스갤러리 서울', '서울특별시 용산구 이태원로 267', 'gallery', 37.5385678, 127.0014820, 'active', '국제 현대미술 갤러리의 서울 전시 공간입니다.', '화–토 11:00–18:00', array['전시','현대미술','한남동'], 'https://www.pacegallery.com/galleries/seoul/', null, true),
  ('파운드리 서울', '서울특별시 용산구 이태원로 223', 'gallery', 37.5355941, 126.9983132, 'active', '동시대 미술 전시와 출판 프로젝트를 선보이는 공간입니다.', '전시별 운영시간 확인', array['전시','현대미술','한남동'], 'https://foundryseoul.net/', null, true),
  ('현대카드 뮤직 라이브러리', '서울특별시 용산구 이태원로 246', 'performance', 37.5367478, 127.0007339, 'active', '바이닐과 음악 서적을 열람하고 공연을 만날 수 있는 음악 문화공간입니다.', '화–토 12:00–21:00 · 일·공휴일 12:00–18:00', array['음악','바이닐','라이브러리'], 'https://dive.hyundaicard.com/web/musiclibrary/spaceMain.hdc', null, true),
  ('케이크샵 서울', '서울특별시 용산구 이태원동 34-16', 'club', 37.5397720, 126.9980598, 'active', '전자음악을 중심으로 국내외 DJ 공연을 여는 이태원의 클럽입니다.', '공연 일정별 확인', array['클럽','전자음악','DJ'], 'https://www.cakeshopseoul.com/', 'https://www.instagram.com/cakeshopseoul/', true),
  ('파우스트 서울', '서울특별시 용산구 우사단로14길 일대', 'club', 37.5342683, 126.9967252, 'active', '테크노와 전자음악 공연을 중심으로 운영되는 클럽입니다.', '공연 일정별 확인', array['클럽','테크노','DJ'], null, 'https://www.instagram.com/faustseoul/', true),
  ('브라이 리퍼블릭', '서울특별시 용산구 이태원로14길 일대', 'restaurant', 37.5334857, 126.9908013, 'active', '남아프리카식 그릴과 요리를 선보이는 이태원 음식점입니다.', '공식 계정에서 확인', array['음식점','남아프리카','그릴'], null, 'https://www.instagram.com/braairepublic/', true),
  ('오리지널 팬케이크 하우스 이태원점', '서울특별시 용산구 이태원로 153', 'restaurant', 37.5346003, 126.9910497, 'active', '팬케이크와 브런치 메뉴를 제공하는 음식점입니다.', '공식 정보에서 확인', array['음식점','브런치','팬케이크'], 'https://www.originalpancakehouse.com/asia_locations.pdf', null, true),
  ('프로스트 펍 앤 그릴', '서울특별시 용산구 이태원로 179', 'bar', 37.5348135, 126.9937364, 'active', '펍 음식과 맥주, 칵테일을 함께 제공하는 이태원 바입니다.', '공식 사이트에서 확인', array['바','펍','칵테일'], 'https://www.prostseoul.com/', null, true)
) as seed(name,address,place_type,latitude,longitude,status,short_summary,opening_hours,tags,url,instagram_url,verified)
where not exists (select 1 from public.places where lower(places.name)=lower(seed.name));

update public.sources
set url = 'https://www.pacegallery.com/galleries/seoul/',
    collection_url = 'https://www.pacegallery.com/exhibitions/?location=seoul'
where source_name = '페이스갤러리 서울';
