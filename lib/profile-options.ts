export type KsicDivision = {
  section: string;
  sectionName: string;
  code: string;
  name: string;
};

const sections: Record<string, string> = {
  A: "농업, 임업 및 어업",
  B: "광업",
  C: "제조업",
  D: "전기, 가스, 증기 및 공기 조절 공급업",
  E: "수도, 하수 및 폐기물 처리, 원료 재생업",
  F: "건설업",
  G: "도매 및 소매업",
  H: "운수 및 창고업",
  I: "숙박 및 음식점업",
  J: "정보통신업",
  K: "금융 및 보험업",
  L: "부동산업",
  M: "전문, 과학 및 기술 서비스업",
  N: "사업시설 관리, 사업 지원 및 임대 서비스업",
  O: "공공 행정, 국방 및 사회보장 행정",
  P: "교육 서비스업",
  Q: "보건업 및 사회복지 서비스업",
  R: "예술, 스포츠 및 여가관련 서비스업",
  S: "협회 및 단체, 수리 및 기타 개인 서비스업",
  T: "가구 내 고용활동 및 자가 소비 생산활동",
  U: "국제 및 외국기관",
};

const divisions: Array<[string, string, string]> = [
  ["A", "01", "농업"], ["A", "02", "임업"], ["A", "03", "어업"],
  ["B", "05", "석탄, 원유 및 천연가스 광업"], ["B", "06", "금속 광업"], ["B", "07", "비금속광물 광업; 연료용 제외"], ["B", "08", "광업 지원 서비스업"],
  ["C", "10", "식료품 제조업"], ["C", "11", "음료 제조업"], ["C", "12", "담배 제조업"], ["C", "13", "섬유제품 제조업; 의복 제외"], ["C", "14", "의복, 의복 액세서리 및 모피제품 제조업"], ["C", "15", "가죽, 가방 및 신발 제조업"], ["C", "16", "목재 및 나무제품 제조업; 가구 제외"], ["C", "17", "펄프, 종이 및 종이제품 제조업"], ["C", "18", "인쇄 및 기록매체 복제업"], ["C", "19", "코크스, 연탄 및 석유정제품 제조업"], ["C", "20", "화학 물질 및 화학제품 제조업; 의약품 제외"], ["C", "21", "의료용 물질 및 의약품 제조업"], ["C", "22", "고무 및 플라스틱제품 제조업"], ["C", "23", "비금속 광물제품 제조업"], ["C", "24", "1차 금속 제조업"], ["C", "25", "금속 가공제품 제조업; 기계 및 가구 제외"], ["C", "26", "전자 부품, 컴퓨터, 영상, 음향 및 통신장비 제조업"], ["C", "27", "의료, 정밀, 광학 기기 및 시계 제조업"], ["C", "28", "전기장비 제조업"], ["C", "29", "기타 기계 및 장비 제조업"], ["C", "30", "자동차 및 트레일러 제조업"], ["C", "31", "기타 운송장비 제조업"], ["C", "32", "가구 제조업"], ["C", "33", "기타 제품 제조업"], ["C", "34", "산업용 기계 및 장비 수리업"],
  ["D", "35", "전기, 가스, 증기 및 공기 조절 공급업"],
  ["E", "36", "수도업"], ["E", "37", "하수, 폐수 및 분뇨 처리업"], ["E", "38", "폐기물 수집, 운반, 처리 및 원료 재생업"], ["E", "39", "환경 정화 및 복원업"],
  ["F", "41", "종합 건설업"], ["F", "42", "전문직별 공사업"],
  ["G", "45", "자동차 및 부품 판매업"], ["G", "46", "도매 및 상품 중개업"], ["G", "47", "소매업; 자동차 제외"],
  ["H", "49", "육상 운송 및 파이프라인 운송업"], ["H", "50", "수상 운송업"], ["H", "51", "항공 운송업"], ["H", "52", "창고 및 운송관련 서비스업"],
  ["I", "55", "숙박업"], ["I", "56", "음식점 및 주점업"],
  ["J", "58", "출판업"], ["J", "59", "영상·오디오 기록물 제작 및 배급업"], ["J", "60", "방송업"], ["J", "61", "우편 및 통신업"], ["J", "62", "컴퓨터 프로그래밍, 시스템 통합 및 관리업"], ["J", "63", "정보서비스업"],
  ["K", "64", "금융업"], ["K", "65", "보험 및 연금업"], ["K", "66", "금융 및 보험 관련 서비스업"],
  ["L", "68", "부동산업"],
  ["M", "70", "연구개발업"], ["M", "71", "전문 서비스업"], ["M", "72", "건축 기술, 엔지니어링 및 기타 과학기술 서비스업"], ["M", "73", "기타 전문, 과학 및 기술 서비스업"],
  ["N", "74", "사업시설 관리 및 조경 서비스업"], ["N", "75", "사업지원 서비스업"], ["N", "76", "임대업; 부동산 제외"],
  ["O", "84", "공공 행정, 국방 및 사회보장 행정"],
  ["P", "85", "교육 서비스업"],
  ["Q", "86", "보건업"], ["Q", "87", "사회복지 서비스업"],
  ["R", "90", "창작, 예술 및 여가관련 서비스업"], ["R", "91", "스포츠 및 오락관련 서비스업"],
  ["S", "94", "협회 및 단체"], ["S", "95", "개인 및 소비용품 수리업"], ["S", "96", "기타 개인 서비스업"],
  ["T", "97", "가구 내 고용활동"], ["T", "98", "자가 소비를 위한 가구의 재화 및 서비스 생산활동"],
  ["U", "99", "국제 및 외국기관"],
];

export const KSIC_DIVISIONS: KsicDivision[] = divisions.map(([section, code, name]) => ({
  section,
  sectionName: sections[section],
  code,
  name,
}));

export const REGION_OPTIONS = [
  { value: "서울", label: "서울특별시" },
  { value: "부산", label: "부산광역시" },
  { value: "대구", label: "대구광역시" },
  { value: "인천", label: "인천광역시" },
  { value: "광주", label: "광주광역시" },
  { value: "대전", label: "대전광역시" },
  { value: "울산", label: "울산광역시" },
  { value: "세종", label: "세종특별자치시" },
  { value: "경기", label: "경기도" },
  { value: "강원", label: "강원특별자치도" },
  { value: "충북", label: "충청북도" },
  { value: "충남", label: "충청남도" },
  { value: "전북", label: "전북특별자치도" },
  { value: "전남", label: "전라남도" },
  { value: "경북", label: "경상북도" },
  { value: "경남", label: "경상남도" },
  { value: "제주", label: "제주특별자치도" },
] as const;

export function findKsicDivision(code: string | null | undefined) {
  return KSIC_DIVISIONS.find((item) => item.code === code) ?? null;
}

export function isValidEstablishedAt(value: string | null) {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00+09:00`);
  return Number.isFinite(timestamp) && value >= "1900-01-01" && timestamp <= Date.now();
}

export function startupAge(establishedAt: string | null, now = new Date()) {
  if (!establishedAt) return { label: "예비창업", completedYears: null, elapsedMonths: null };
  const start = new Date(`${establishedAt}T00:00:00+09:00`);
  let completedYears = now.getFullYear() - start.getFullYear();
  const anniversaryPassed = now.getMonth() > start.getMonth()
    || (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate());
  if (!anniversaryPassed) completedYears -= 1;
  const elapsedMonths = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
  return {
    label: `${Math.max(0, completedYears) + 1}년차`,
    completedYears: Math.max(0, completedYears),
    elapsedMonths,
  };
}
