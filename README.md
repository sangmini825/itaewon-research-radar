# 이태원 리서치 레이더

이태원의 기록, 제도 변화, 문화·예술과 지역의 현재를 지속적으로 수집하는 공개 자료 사이트입니다.

현재 사이트는 검색, 자료 유형·출처 필터, 문화 일정 상태, 중복 묶음, 읽음 상태, 출처 즐겨찾기, 공개 링크 제보와 공간 지도를 제공합니다. 데이터는 Supabase에서 읽어오며 공개 화면은 로그인 없이 사용할 수 있습니다.

## 주요 수정 위치

- `app/page.tsx`: Supabase 공개 피드를 서버에서 불러오는 시작 화면
- `app/RadarClient.tsx`: 검색, 일정 필터, 중복 묶음, 즐겨찾기와 링크 제보 화면
- `app/PlaceMap.tsx`: 업종 필터, 지도 마커와 공간 요약 카드
- `app/loading.tsx`: 화면을 불러오는 동안 표시하는 전환 화면
- `app/globals.css`: 노션과 비슷한 간결한 화면 디자인
- `app/layout.tsx`: 사이트 제목과 공유 미리보기 설정
- `supabase/functions/itaewon-radar-collect/index.ts`: 출처별 자동 수집기
- `supabase/functions/itaewon-radar-feed/index.ts`: 공개 화면에 전달할 읽기 전용 피드
- `supabase/functions/itaewon-radar-suggest/index.ts`: 링크 제보 접수와 기본 스팸 제한
- `tests/rendered-html.test.mjs`: 실제 데이터가 서버에서 표시되는지 확인하는 테스트

## 실행하기

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

최종 빌드와 테스트:

```bash
npm test
```

## 데이터 구조

Supabase에는 다음 표가 준비되어 있습니다.

- `sources`: 수집 출처
- `raw_items`: 수집된 원문과 AI 분석 필드
- `events`: 여러 원문을 묶은 사건 단위
- `people`, `organizations`, `places`, `issues`, `relationships`: 개체와 관계
- `watchlist`: 상태 변화 추적 대상
- `loose_ends`: 아직 답하지 못한 취재 질문
- `editor_feedback`, `editor_rules`: 편집 판단과 규칙
- `source_suggestions`: 공개 화면에서 접수된 검토 대기 링크

공개 사이트는 Supabase Edge Function `itaewon-radar-feed`가 선별한 읽기 전용 데이터만 사용합니다. `service_role` 키나 OpenAI API 키를 브라우저 코드에 넣으면 안 됩니다.

## 출처 확장 원칙

새 정보는 `공식 기관 웹페이지 → 업장 공식 웹·예약 페이지 → 공개 SNS 계정 → 매거진·언론` 순서로 확인합니다. SNS나 매거진에서 발견한 정보도 가능한 경우 일정과 장소를 기관 원문과 대조합니다. 인스타그램에만 있는 정보는 관찰 출처로 등록하되 자동 공개보다 검토 대기를 우선합니다.

현재 리움미술관의 현재·예정 전시는 공식 일정 API에서 직접 수집합니다. 블루스퀘어, 현대카드 DIVE·언더스테이지, 페이스갤러리 서울은 관찰 출처로 등록되어 있으며 직접 수집 규칙을 확인하는 단계입니다. 다른 업장이나 기관도 `collectors` 배열에 `discover`와 `fetchItem`을 추가하면 매일 수집 작업에 포함할 수 있습니다.

자동 수집은 매일 08:00(한국 시간)에 실행됩니다. 출처 목록의 `수집 정상`, `관찰 중`, `연결 준비` 표시와 마지막 확인 시각으로 현재 연결 상태를 확인할 수 있습니다.

## 공간 지도 수정

Supabase의 `places` 표에서 공간을 직접 추가하거나 수정할 수 있습니다. `name`, `place_type`, `latitude`, `longitude`를 입력하면 지도에 표시되고, `short_summary`, `address`, `opening_hours`, `tags`, `url`을 입력하면 요약 카드에 함께 나타납니다. 공개하지 않을 공간은 `status`를 `hidden`으로 지정합니다.

## 환경설정

로컬 비밀 값은 `.env.local`에 저장하며 Git에 포함되지 않습니다.

```text
OPENAI_API_KEY=...
```

실제 키 값은 GitHub에 올리지 말고 배포 서비스와 Supabase의 비밀 설정 기능을 이용하세요.

## 현재 남은 작업

- OpenAI 프로젝트 결제 활성화 후 기존 자료 자동 요약·분류
- 신규 자료 수집 직후 AI 분석 자동 실행
- 로그인 기반 편집자 전용 저장 기능
- 이벤트 묶음과 인물·기관·장소 관계 탐색
- 주간 브리핑 및 월간 변화 기록

## 공개 사이트

[ITAEWON RADAR](https://itaewon-research-radar.sangmini825.workers.dev/)
