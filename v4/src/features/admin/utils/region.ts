// Parse a free-text Korean address into a short region label.
// The source data is entered by hospital staff, so prefixes are wildly
// inconsistent: "서울시 강남구 …", "강남구 …", "청담동 …", "선릉로 222", even
// typos like "감남구" or city-only strings like "부천시". We keep as much
// geographic signal as possible — 서울 always gets a 구; other metros/provinces
// resolve to just their label.

export interface Region {
  metro: string;
  district?: string;
}

// Longest-first so '전북특별자치도' beats '전라북도', etc.
const METRO_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^서울(?:특별시|시)?/, label: '서울' },
  { pattern: /^경기(?:도)?/, label: '경기' },
  { pattern: /^인천(?:광역시|시)?/, label: '인천' },
  { pattern: /^부산(?:광역시|시)?/, label: '부산' },
  { pattern: /^대구(?:광역시|시)?/, label: '대구' },
  { pattern: /^대전(?:광역시|시)?/, label: '대전' },
  { pattern: /^광주(?:광역시|시)?/, label: '광주' },
  { pattern: /^울산(?:광역시|시)?/, label: '울산' },
  { pattern: /^세종(?:특별자치시|시)?/, label: '세종' },
  { pattern: /^강원(?:특별자치도|도)?/, label: '강원' },
  { pattern: /^충청남도|^충남/, label: '충남' },
  { pattern: /^충청북도|^충북/, label: '충북' },
  { pattern: /^전라남도|^전남/, label: '전남' },
  { pattern: /^전북특별자치도|^전라북도|^전북/, label: '전북' },
  { pattern: /^경상남도|^경남/, label: '경남' },
  { pattern: /^경상북도|^경북/, label: '경북' },
  { pattern: /^제주(?:특별자치도|도)?/, label: '제주' },
];

// 서울 25개 자치구 — 중구만 제외 (부산/대구 등과 충돌).
// "서울 중구"는 METRO_PATTERNS 에서 먼저 처리되므로 문제없음.
const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
  '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구',
  '중랑구',
];

// 서울 동 → 구 매핑 (실데이터에서 나타나는 것들 + 인접 주요동).
// 애매한 신사동(은평/강남)은 "강남구 신사동"이 임상 맥락상 더 흔하므로 강남 기본.
const SEOUL_DONG_TO_GU: Record<string, string> = {
  // 강남
  청담동: '강남구', 삼성동: '강남구', 대치동: '강남구', 역삼동: '강남구',
  논현동: '강남구', 압구정동: '강남구', 도곡동: '강남구', 개포동: '강남구',
  일원동: '강남구', 세곡동: '강남구', 신사동: '강남구',
  // 서초
  반포동: '서초구', 서초동: '서초구', 잠원동: '서초구', 방배동: '서초구', 내곡동: '서초구',
  // 송파
  잠실동: '송파구', 가락동: '송파구', 문정동: '송파구', 방이동: '송파구',
  오금동: '송파구', 풍납동: '송파구', 석촌동: '송파구', 마천동: '송파구',
  // 강동
  상일동: '강동구', 명일동: '강동구', 고덕동: '강동구', 천호동: '강동구',
  암사동: '강동구', 둔촌동: '강동구',
  // 용산
  한남동: '용산구', 이태원동: '용산구', 이촌동: '용산구', 서빙고동: '용산구',
  후암동: '용산구', 보광동: '용산구',
  // 광진
  자양동: '광진구', 구의동: '광진구', 화양동: '광진구', 군자동: '광진구',
  // 양천
  목동: '양천구', 신월동: '양천구', 신정동: '양천구',
  // 구로
  항동: '구로구', 구로동: '구로구', 개봉동: '구로구', 고척동: '구로구', 오류동: '구로구',
  // 노원
  중계동: '노원구', 상계동: '노원구', 하계동: '노원구', 월계동: '노원구', 공릉동: '노원구',
  // 성동
  금호동: '성동구', 옥수동: '성동구', 성수동: '성동구', 왕십리동: '성동구',
  // 마포
  합정동: '마포구', 서교동: '마포구', 연남동: '마포구', 망원동: '마포구',
  성산동: '마포구', 상암동: '마포구', 공덕동: '마포구', 도화동: '마포구',
  // 은평
  응암동: '은평구', 녹번동: '은평구', 불광동: '은평구', 갈현동: '은평구', 진관동: '은평구',
  // 서대문
  연희동: '서대문구', 홍은동: '서대문구', 홍제동: '서대문구',
  // 영등포
  여의도동: '영등포구', 당산동: '영등포구', 양평동: '영등포구',
  문래동: '영등포구', 신길동: '영등포구', 대림동: '영등포구',
  // 동작
  사당동: '동작구', 흑석동: '동작구', 노량진동: '동작구', 상도동: '동작구',
  // 관악
  봉천동: '관악구', 신림동: '관악구',
  // 성북
  성북동: '성북구', 돈암동: '성북구', 안암동: '성북구', 정릉동: '성북구',
  길음동: '성북구', 장위동: '성북구',
  // 종로
  혜화동: '종로구', 가회동: '종로구', 삼청동: '종로구', 안국동: '종로구',
  구기동: '종로구', 평창동: '종로구', 부암동: '종로구',
  // 기타
  면목동: '중랑구', 상봉동: '중랑구',
  수유동: '강북구', 미아동: '강북구',
  쌍문동: '도봉구', 방학동: '도봉구', 창동: '도봉구',
  화곡동: '강서구', 등촌동: '강서구', 가양동: '강서구', 마곡동: '강서구',
  시흥동: '금천구', 독산동: '금천구', 가산동: '금천구',
  휘경동: '동대문구', 이문동: '동대문구', 회기동: '동대문구', 전농동: '동대문구',
  청량리동: '동대문구', 장안동: '동대문구', 답십리동: '동대문구',
};

// 서울 도로명 → 구. 실데이터에서 도로명만 적힌 경우를 매핑.
// 매칭 실패하면 "서울"만 반환(구 생략)하도록 폴백은 호출부에서 처리.
const SEOUL_ROAD_TO_GU: Array<[RegExp, string]> = [
  [/테헤란로|삼성로|역삼로|언주로|봉은사로|논현로|학동로|도산대로|영동대로|선릉로|개포로|압구정로|일원로|자곡로/, '강남구'],
  [/반포대로|신반포로|서초대로|서초중앙로|방배로|헌릉로|동광로|효령로|사평대로|잠원로/, '서초구'],
  [/송파대로|올림픽로|위례송파로|위례광장로|석촌호수로|가락로|백제고분로|천중로/, '송파구'],
  [/명일로|천호대로|성내로|암사로|양재대로/, '강동구'],
  [/한남대로|이태원로|이촌로|서빙고로|후암로|유엔빌리지길|한강대로/, '용산구'],
  [/아차산로|뚝섬로|자양로|광나루로|구의로/, '광진구'],
  [/목동동로|목동중앙로|오목로/, '양천구'],
  [/신도림로|구로중앙로|경인로|고척로|개봉로/, '구로구'],
  [/월계로|덕릉로|노원로|한글비석로|화랑로/, '노원구'],
  [/금호로|성수이로|행당로|왕십리로|금호산/, '성동구'],
  [/마포대로|양화로|월드컵로|독막로/, '마포구'],
  [/여의대로|당산로|영등포로/, '영등포구'],
  [/성북로|돈암로|정릉로|보문로/, '성북구'],
];

// 서울의 유명 랜드마크 아파트/건물 → 구
const SEOUL_LANDMARK_TO_GU: Array<[RegExp, string]> = [
  [/한남더힐|나인원한남/, '용산구'],
  [/타워팰리스|도곡렉슬|래미안블레스티지|아이파크삼성|은마아파트|디에이치아너힐즈/, '강남구'],
  [/반포자이|반포리체|아크로리버파크|래미안퍼스티지/, '서초구'],
  [/잠실엘스|리센츠|트리지움|시그니엘/, '송파구'],
];

// 경기 쪽 대표 도로 — 서울로 오인되지 않도록 선 매핑.
const GG_ROAD_HINTS = [/홍학로/]; // 시흥시 홍학로

// 구 이름 축약형 → 서울 구
const SEOUL_GU_SHORT_TO_GU: Record<string, string> = {
  강남: '강남구', 서초: '서초구', 송파: '송파구', 강동: '강동구',
  용산: '용산구', 마포: '마포구', 성동: '성동구', 광진: '광진구',
  양천: '양천구', 노원: '노원구', 구로: '구로구', 은평: '은평구',
  종로: '종로구', 성북: '성북구', 동작: '동작구', 관악: '관악구',
  서대문: '서대문구', 동대문: '동대문구', 중랑: '중랑구',
  강북: '강북구', 강서: '강서구', 도봉: '도봉구', 금천: '금천구',
  영등포: '영등포구',
};

const GG_CITIES = [
  '수원시','성남시','안양시','부천시','광명시','평택시','의정부시','시흥시','군포시','하남시',
  '오산시','양주시','구리시','안성시','포천시','의왕시','여주시','동두천시','과천시',
  '파주시','김포시','이천시','안산시','용인시','남양주시','고양시','화성시',
  '가평군','양평군','연천군',
];
// '광주시' 는 경기 광주 vs 광주광역시 충돌이 있어 별도 처리
// (METRO_PATTERNS 의 '광주(광역시|시)?' 가 먼저 매치되면 광역시로 취급됨)
// → 경기 광주는 "경기도 광주시"로 올 때만 경기로 잡힘

// 시 접미사 없이 등장하는 짧은 형태
const GG_CITY_SHORTS = [
  '수원','성남','안양','부천','광명','평택','의정부','시흥','군포','하남','오산','양주','구리',
  '안성','포천','의왕','여주','동두천','과천','파주','김포','이천','안산','용인','남양주','고양','화성',
  '가평','양평','연천',
];

// 경기 내 시 밑의 구 (서울 구 이름과 겹치지 않음)
const GG_DISTRICTS = [
  '영통구','팔달구','장안구','권선구',          // 수원
  '분당구','수정구','중원구',                    // 성남
  '기흥구','처인구','수지구',                    // 용인
  '일산동구','일산서구','덕양구',                // 고양
  '만안구','동안구',                             // 안양
  '단원구','상록구',                             // 안산
];

const CHUNGNAM_CITIES = ['천안','공주','보령','아산','서산','논산','계룡','당진','금산','부여','서천','청양','홍성','예산','태안'];
const CHUNGBUK_CITIES = ['청주','충주','제천','보은','옥천','영동','진천','괴산','음성','단양','증평'];
const JEONBUK_CITIES = ['전주','군산','익산','정읍','남원','김제','완주','진안','무주','장수','임실','순창','고창','부안'];
const JEONNAM_CITIES = ['목포','여수','순천','나주','담양','곡성','구례','고흥','보성','화순','장흥','강진','해남','영암','무안','함평','영광','장성','완도','진도','신안'];
const GYEONGBUK_CITIES = ['포항','경주','김천','안동','구미','영주','영천','상주','문경','경산','군위','의성','청송','영양','영덕','청도','고령','성주','칠곡','예천','봉화','울진','울릉'];
const GYEONGNAM_CITIES = ['창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','남해','하동','산청','함양','거창','합천'];
const GANGWON_CITIES = ['춘천','원주','강릉','동해','태백','속초','삼척','홍천','횡성','영월','평창','정선','철원','화천','양구','인제','양양'];

const PROVINCE_BY_CITY: Array<[string[], string]> = [
  [CHUNGNAM_CITIES, '충남'],
  [CHUNGBUK_CITIES, '충북'],
  [JEONBUK_CITIES, '전북'],
  [JEONNAM_CITIES, '전남'],
  [GYEONGBUK_CITIES, '경북'],
  [GYEONGNAM_CITIES, '경남'],
  [GANGWON_CITIES, '강원'],
];

// 오타 교정 (첫 토큰 기준)
const TYPO_MAP: Record<string, string> = {
  감남구: '강남구',
};

const OVERSEAS_RE = /(미국|해외|overseas|usa|일본|중국|캐나다|호주|영국|필리핀|베트남|싱가포르|독일|프랑스|태국)/i;

export function regionFromAddress(address: string | null | undefined): Region | null {
  if (!address) return null;
  let raw = String(address).trim();
  if (!raw) return null;

  // 해외 거주 표시
  if (OVERSEAS_RE.test(raw)) return { metro: '해외' };

  // 첫 토큰 오타 교정
  for (const [bad, good] of Object.entries(TYPO_MAP)) {
    if (raw.startsWith(bad)) {
      raw = good + raw.slice(bad.length);
      break;
    }
  }

  // 1) 표준 광역/도 접두어
  for (const { pattern, label } of METRO_PATTERNS) {
    const m = raw.match(pattern);
    if (!m) continue;
    const rest = raw.slice(m[0].length).trim();
    if (label === '서울') {
      const dm = rest.match(/(\S+?구)(?:\s|$|,)/);
      const gu = dm?.[1];
      if (gu && SEOUL_DISTRICTS.includes(gu)) return { metro: '서울', district: gu };
      return { metro: '서울' };
    }
    return { metro: label };
  }

  // 2) 서울 구로 시작
  for (const gu of SEOUL_DISTRICTS) {
    if (raw.startsWith(gu)) return { metro: '서울', district: gu };
  }

  // 3) 서울 동으로 시작
  for (const [dong, gu] of Object.entries(SEOUL_DONG_TO_GU)) {
    if (raw.startsWith(dong)) return { metro: '서울', district: gu };
  }

  // 4) 경기 시로 시작 (시/군 접미사 포함 혹은 미포함)
  for (const c of GG_CITIES) if (raw.startsWith(c)) return { metro: '경기' };
  for (const c of GG_CITY_SHORTS) {
    // 뒤에 공백이나 시 경계가 있어야 함 ("수원" 으로 시작하는 다른 동네 방지 — 현재 없음)
    if (raw === c || raw.startsWith(c + ' ') || raw.startsWith(c + '시')) return { metro: '경기' };
  }

  // 5) 경기 내 구로 시작 (영통구 등)
  for (const d of GG_DISTRICTS) if (raw.startsWith(d)) return { metro: '경기' };

  // 6) 각 도 주요 시/군으로 시작
  for (const [cities, label] of PROVINCE_BY_CITY) {
    for (const c of cities) {
      if (
        raw.startsWith(c + '시') ||
        raw.startsWith(c + '군') ||
        raw.startsWith(c + ' ')
      ) {
        return { metro: label };
      }
    }
  }

  // 7) 서울 구 축약형 (마포, 강남, 서초, ...)
  for (const [short, gu] of Object.entries(SEOUL_GU_SHORT_TO_GU)) {
    if (raw === short || raw.startsWith(short + ' ') || raw.startsWith(short + ',')) {
      return { metro: '서울', district: gu };
    }
  }

  // 8) 경기 도로 힌트 (서울 도로 매핑보다 우선)
  for (const re of GG_ROAD_HINTS) if (re.test(raw)) return { metro: '경기' };

  // 9) 서울 도로명 → 구 매핑
  for (const [re, gu] of SEOUL_ROAD_TO_GU) {
    if (re.test(raw)) return { metro: '서울', district: gu };
  }

  // 10) 서울 랜드마크 매핑
  for (const [re, gu] of SEOUL_LANDMARK_TO_GU) {
    if (re.test(raw)) return { metro: '서울', district: gu };
  }

  // 11) 문자열 어디든 서울 구가 포함
  for (const gu of SEOUL_DISTRICTS) {
    if (raw.includes(gu)) return { metro: '서울', district: gu };
  }

  // 12) 문자열 어디든 경기 시/구 포함
  for (const c of GG_CITIES) if (raw.includes(c)) return { metro: '경기' };
  for (const d of GG_DISTRICTS) if (raw.includes(d)) return { metro: '경기' };

  // 13) 각 도 시/군 포함
  for (const [cities, label] of PROVINCE_BY_CITY) {
    for (const c of cities) {
      if (raw.includes(c + '시') || raw.includes(c + '군')) return { metro: label };
    }
  }

  return null;
}

export function regionLabel(r: Region | null | undefined): string {
  if (!r) return '-';
  return r.district ? `서울 ${r.district}` : r.metro;
}

export function regionSortKey(r: Region | null | undefined): string {
  if (!r) return '￿';
  return r.district ? `${r.metro} ${r.district}` : r.metro;
}
