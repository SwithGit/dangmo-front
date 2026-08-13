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

`/app/map`에서 서울특별시와 경기도의 지역별 공고, 전국 공통 공고, 지역 인사이트를 탐색합니다. 지도 정적 자산의 출처와 라이선스는 `public/maps/README.md`에 기록되어 있습니다. 지역 인사이트 비용과 캐시는 프론트에서 결정하지 않고 백엔드 응답을 표시합니다.
