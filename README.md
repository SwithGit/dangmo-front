# 당모 프론트엔드

당모의 Next.js 프론트엔드입니다. Vercel 배포를 기준으로 하며, `/api/*` 요청은 `BACKEND_ORIGIN`으로 프록시합니다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

백엔드는 기본적으로 `http://127.0.0.1:4000`에서 실행합니다.

## Vercel 설정

Vercel 환경 변수 `BACKEND_ORIGIN`에 EC2 백엔드 주소를 설정합니다.

```dotenv
BACKEND_ORIGIN=https://api.dangmo.kr
```

브라우저에서는 계속 `/api/...`를 호출하므로 프론트 코드에 백엔드 호스트를 노출하거나 CORS를 직접 다룰 필요가 없습니다.

결제창은 `@portone/browser-sdk`의 PortOne V2 API를 사용합니다. Store ID와 채널 키는 EC2 백엔드가 주문 생성 응답으로 전달하며, API Secret과 Webhook Secret은 프론트/Vercel에 두지 않습니다.

## 지도 탐색

`/app/map`에서 전국 지역 공고와 지역 인사이트를 탐색합니다. 경기도만 31개 시·군 상세 지도를 사용하고, 나머지 시·도는 지역 전체를 하나의 분석 단위로 사용합니다. 지도 정적 자산의 출처와 라이선스는 `public/maps/README.md`에 기록되어 있습니다. 지역 인사이트 비용과 캐시는 프론트에서 결정하지 않고 백엔드 응답을 표시합니다.

## GA4

`NEXT_PUBLIC_GA_MEASUREMENT_ID`가 설정된 배포에서만 GA4를 로드합니다. 로컬·프리뷰 배포에서는 비워 운영 트래픽과 섞이지 않게 합니다. 이메일, 사용자 ID, 공고 제목·ID, 검색 원문, 사업명, 문서 내용은 이벤트 파라미터로 보내지 않습니다.

운영 검증:

1. GA4 관리에서 운영 Web Stream 측정 ID를 확인합니다.
2. Vercel Production 환경에만 `NEXT_PUBLIC_GA_MEASUREMENT_ID`를 등록하고 재배포합니다.
3. DebugView/Realtime에서 `map_explore_view → region_selected → map_announcement_selected → region_insight_started → region_insight_completed → proposal_writing_started → document_draft_generated` 순서를 확인합니다.
4. 이벤트 파라미터에 개인정보나 자유 입력 문장이 없는지 확인합니다.

## 검색 노출 운영

`/app/*`는 noindex입니다. `/regions/*`는 백엔드가 `dataState=ready`, 실제 근거 5건 이상, 모집 중 지역 공고 또는 유효 현안을 확인한 지역만 indexable하며, 그 외 지역은 noindex 준비 화면으로 응답하고 sitemap에서 제외합니다.

1. Google Search Console에서 `dangmo.kr` 도메인 속성을 DNS로 인증합니다.
2. `https://dangmo.kr/sitemap.xml`을 제출하고 홈, `/business`, `/pricing`, `/regions`와 공개 지역 URL을 검사합니다.
3. 네이버 서치어드바이저에서 사이트 소유를 확인하고 같은 sitemap을 제출합니다.
4. 배포 후 `/robots.txt`, 각 페이지 self canonical, noindex 여부와 실제 자료 기준일을 확인합니다.
5. Core Web Vitals와 주간 검색어·노출·클릭을 점검하고, 자료가 만료된 지역이 sitemap에서 빠지는지 확인합니다.
