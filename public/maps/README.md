# 지도 경계 데이터 출처와 라이선스

`지도 탐색`의 정적 GeoJSON은 다음 자료를 웹 렌더링용으로 단순화한 파생 자산이다.

- 원자료: 통계청 통계지리정보서비스(SGIS) 행정동 경계
- 가공·시계열 자료: [vuski/admdongkor](https://github.com/vuski/admdongkor), `ver20260701`
- 적용 버전: `admdongkor-20260701-simplified`
- 원자료 이용조건: 공공누리 제1유형(출처표시)
- 가공 데이터 이용조건: Creative Commons Attribution 4.0(CC BY 4.0)
- 가공 방법: 행정동 폴리곤을 행정구역 코드 기준으로 시·도/시·군·구에 묶고, 브라우저 표시용 Douglas–Peucker 단순화를 적용했다. 경계 판단이나 측량 용도로 사용할 수 없다.

포함 파일:

- `korea-overview.geojson`: 전국 시·도 윤곽
- `seoul-municipalities.geojson`: 서울 25개 자치구
- `gyeonggi-municipalities.geojson`: 경기 31개 시·군. 일반구가 있는 도시는 상위 시 코드로 묶었다.

화면과 재배포물에는 “통계청 SGIS 기반, admdongkor 가공” 출처를 유지해야 한다. 행정구역 변경 시 `geometryVersion`과 백엔드 지역 seed를 함께 갱신한다.

