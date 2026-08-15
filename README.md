# 이태원 리서치 레이더

10·29 이태원 참사 이후의 움직임, 제도 변화, 지역의 신호를 지속적으로 수집하고 검토하기 위한 공개 리서치 인프라입니다.

현재 사이트는 원문 수집함, 주제별 탐색, 워치리스트, 미해결 취재 질문, 브라우저 임시 편집 검토 기능을 제공합니다. 데이터는 Supabase에서 읽어오며 공개 화면은 읽기 전용입니다.

## 주요 수정 위치

- `app/page.tsx`: Supabase 공개 피드를 서버에서 불러오는 시작 화면
- `app/RadarClient.tsx`: 검색, 필터, 주제, 워치리스트, 취재 질문, 편집 검토 기능
- `app/globals.css`: 노션과 비슷한 간결한 화면 디자인
- `app/layout.tsx`: 사이트 제목과 공유 미리보기 설정
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

공개 사이트는 Supabase Edge Function `itaewon-radar-feed`가 선별한 읽기 전용 데이터만 사용합니다. `service_role` 키나 OpenAI API 키를 브라우저 코드에 넣으면 안 됩니다.

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

[이태원 리서치 레이더](https://itaewon-research-radar.kr9zrky69b.chatgpt.site)
