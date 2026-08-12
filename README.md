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
