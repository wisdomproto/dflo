// Per-slide localized overrides for cases data.
//
// Patient names stay Korean by design (proper nouns + brand consistency).
// Everything else (category, initial/final memo, intake free-text, allergy lists)
// is translated by hand below for the 7 R2-published cases.
//
// Lookup key = `slide.id` (R2 case-* id). When admin adds a new case in Korean,
// add a matching entry here so non-KO visitors still see translated copy. If the
// id is missing, the cases-related components fall back to the Korean source.

export type CaseLocale = 'en' | 'th' | 'vi';
export type LocalizedString = Partial<Record<CaseLocale, string>>;
export type LocalizedStringArray = Partial<Record<CaseLocale, string[]>>;

export interface CaseI18nOverride {
  category?: LocalizedString;
  initialMemo?: LocalizedString;
  finalMemo?: LocalizedString;
  intakeInfo?: {
    desiredHeight?: LocalizedString;
    growthConcerns?: LocalizedString;
    birthNote?: LocalizedString;
    growthPattern?: LocalizedString;
    pubertyStage?: LocalizedString;
    pastConditions?: LocalizedString;
  };
  allergyData?: {
    danger?: LocalizedStringArray;
    caution?: LocalizedStringArray;
  };
}

// ============================================================================
// Shared category mapping (referenced by multiple slides)
// ============================================================================
const CAT_SLOW: LocalizedString = {
  en: 'Slow growth',
  th: 'เด็กโตช้า',
  vi: 'Trẻ chậm tăng trưởng',
};
const CAT_SHORT_PARENTS: LocalizedString = {
  en: 'Short parents',
  th: 'พ่อแม่ตัวเล็ก',
  vi: 'Bố mẹ thấp',
};
const CAT_PRECOCIOUS: LocalizedString = {
  en: 'Precocious puberty',
  th: 'ภาวะวัยรุ่นก่อนกำหนด',
  vi: 'Dậy thì sớm',
};

// Common allergy food names — translated once, reused via array build below.
// Keys = Korean source string; values = per-locale translation.
const FOOD: Record<string, LocalizedString> = {
  '우유':         { en: 'Milk', th: 'นม', vi: 'Sữa' },
  '카제인':       { en: 'Casein', th: 'เคซีน', vi: 'Casein' },
  '요그르트':     { en: 'Yogurt', th: 'โยเกิร์ต', vi: 'Sữa chua' },
  '치즈':         { en: 'Cheese', th: 'ชีส', vi: 'Phô mai' },
  '계란흰자':     { en: 'Egg white', th: 'ไข่ขาว', vi: 'Lòng trắng trứng' },
  '계란 흰자':    { en: 'Egg white', th: 'ไข่ขาว', vi: 'Lòng trắng trứng' },
  '계란 노른자':  { en: 'Egg yolk', th: 'ไข่แดง', vi: 'Lòng đỏ trứng' },
  '파인애플':     { en: 'Pineapple', th: 'สับปะรด', vi: 'Dứa' },
  '마늘':         { en: 'Garlic', th: 'กระเทียม', vi: 'Tỏi' },
  '대두콩':       { en: 'Soybean', th: 'ถั่วเหลือง', vi: 'Đậu nành' },
  '아몬드':       { en: 'Almond', th: 'อัลมอนด์', vi: 'Hạnh nhân' },
  '캐슈넛':       { en: 'Cashew', th: 'มะม่วงหิมพานต์', vi: 'Hạt điều' },
  '캐슈 너트':    { en: 'Cashew', th: 'มะม่วงหิมพานต์', vi: 'Hạt điều' },
  '염소우유':     { en: 'Goat milk', th: 'นมแพะ', vi: 'Sữa dê' },
  '양우유':       { en: 'Sheep milk', th: 'นมแกะ', vi: 'Sữa cừu' },
  '에스파게트':   { en: 'Spaghetti', th: 'สปาเกตตี', vi: 'Spaghetti' },
  '미역':         { en: 'Wakame seaweed', th: 'สาหร่ายวากาเมะ', vi: 'Rong biển wakame' },
  '잉어':         { en: 'Carp', th: 'ปลาคาร์ป', vi: 'Cá chép' },
  '대구':         { en: 'Cod', th: 'ปลาคอด', vi: 'Cá tuyết' },
  '먹도미류':     { en: 'Black bream', th: 'ปลาทรายแดงดำ', vi: 'Cá tráp đen' },
  '참돔':         { en: 'Red sea bream', th: 'ปลาทรายแดง', vi: 'Cá tráp đỏ' },
  '장어':         { en: 'Eel', th: 'ปลาไหล', vi: 'Lươn' },
  '해덕':         { en: 'Haddock', th: 'ปลาแฮดด็อก', vi: 'Cá tuyết chấm đen' },
  '퍼츠':         { en: 'Perch', th: 'ปลาเพิร์ช', vi: 'Cá pecca' },
  '강꼬치고기':   { en: 'Pike', th: 'ปลาไพค์', vi: 'Cá chó' },
  '연어':         { en: 'Salmon', th: 'ปลาแซลมอน', vi: 'Cá hồi' },
  '각시서대속 어류': { en: 'Sole', th: 'ปลาลิ้นหมา', vi: 'Cá bơn lưỡi' },
  '송어':         { en: 'Trout', th: 'ปลาเทราต์', vi: 'Cá hồi vân' },
  '잠치':         { en: 'Sandfish', th: 'ปลาหินทราย', vi: 'Cá cát' },
  '가자미류':     { en: 'Flounder', th: 'ปลาตาเดียว', vi: 'Cá bơn' },
  '오렌지':       { en: 'Orange', th: 'ส้ม', vi: 'Cam' },
  '자두':         { en: 'Plum', th: 'พลัม', vi: 'Mận' },
  '보리':         { en: 'Barley', th: 'ข้าวบาร์เลย์', vi: 'Lúa mạch' },
  '마카로니용 밀':{ en: 'Durum wheat', th: 'ข้าวสาลีดูรัม', vi: 'Lúa mì durum' },
  '글리아딘':     { en: 'Gliadin', th: 'กลีอะดิน', vi: 'Gliadin' },
  '엿기름':       { en: 'Malt', th: 'มอลต์', vi: 'Mạch nha' },
  '귀리':         { en: 'Oats', th: 'โอ๊ต', vi: 'Yến mạch' },
  '호밀가루':     { en: 'Rye flour', th: 'แป้งไรย์', vi: 'Bột lúa mạch đen' },
  '스펠트밀':     { en: 'Spelt', th: 'สเปลต์', vi: 'Lúa mì spelt' },
  '밀':           { en: 'Wheat', th: 'ข้าวสาลี', vi: 'Lúa mì' },
  '밀 겨':        { en: 'Wheat bran', th: 'รำข้าวสาลี', vi: 'Cám lúa mì' },
  '옥수수':       { en: 'Corn', th: 'ข้าวโพด', vi: 'Ngô' },
  '쌀':           { en: 'Rice', th: 'ข้าว', vi: 'Gạo' },
  '겨자 씨':      { en: 'Mustard seed', th: 'เมล็ดมัสตาร์ด', vi: 'Hạt mù tạt' },
  '소고기':       { en: 'Beef', th: 'เนื้อวัว', vi: 'Thịt bò' },
  '양고기':       { en: 'Lamb', th: 'เนื้อแกะ', vi: 'Thịt cừu' },
  '타조고기':     { en: 'Ostrich', th: 'เนื้อนกกระจอกเทศ', vi: 'Thịt đà điểu' },
  '광고기':       { en: 'Pollock', th: 'ปลาพอลล็อก', vi: 'Cá pollock' },
  '토끼':         { en: 'Rabbit', th: 'กระต่าย', vi: 'Thỏ' },
  '사슴고기':     { en: 'Venison', th: 'เนื้อกวาง', vi: 'Thịt nai' },
  '멧돼지':       { en: 'Wild boar', th: 'หมูป่า', vi: 'Lợn rừng' },
  '브라질호두':   { en: 'Brazil nut', th: 'บราซิลนัท', vi: 'Hạt Brazil' },
  '헤이즐넛':     { en: 'Hazelnut', th: 'เฮเซลนัท', vi: 'Quả phỉ' },
  '땅콩':         { en: 'Peanut', th: 'ถั่วลิสง', vi: 'Đậu phộng' },
  '피스타치오':   { en: 'Pistachio', th: 'พิสตาชิโอ', vi: 'Hạt dẻ cười' },
  '알파락트알부민':{ en: 'Alpha-lactalbumin', th: 'อัลฟา-แลคตาลบูมิน', vi: 'Alpha-lactalbumin' },
  '농어':         { en: 'Sea bass', th: 'ปลากะพง', vi: 'Cá vược' },
  '고등어':       { en: 'Mackerel', th: 'ปลาแมคเคอเรล', vi: 'Cá thu' },
  '아귀':         { en: 'Monkfish', th: 'ปลามังก์ฟิช', vi: 'Cá lưỡi rồng' },
  '고동':         { en: 'Conch', th: 'หอยสังข์', vi: 'Ốc xà cừ' },
  '석류':         { en: 'Pomegranate', th: 'ทับทิม', vi: 'Lựu' },
  '아마란스':     { en: 'Amaranth', th: 'อะมารันท์', vi: 'Rau dền' },
  '말고기':       { en: 'Horse meat', th: 'เนื้อม้า', vi: 'Thịt ngựa' },
  '호두':         { en: 'Walnut', th: 'วอลนัท', vi: 'Quả óc chó' },
  '무우':         { en: 'Radish', th: 'หัวไชเท้า', vi: 'Củ cải trắng' },
  '버섯':         { en: 'Mushroom', th: 'เห็ด', vi: 'Nấm' },
};

function buildFoodList(items: string[], lang: CaseLocale): string[] {
  return items.map((k) => FOOD[k]?.[lang] ?? k);
}

function localizeAllergy(items: string[]): LocalizedStringArray {
  return {
    en: buildFoodList(items, 'en'),
    th: buildFoodList(items, 'th'),
    vi: buildFoodList(items, 'vi'),
  };
}

// ============================================================================
// Per-case overrides (key = slide.id from R2)
// ============================================================================
export const CASES_I18N: Record<string, CaseI18nOverride> = {
  // ---------------- 제임스 (case-8fp1vfmj) — Slow growth, lives in Japan ----------------
  'case-8fp1vfmj': {
    category: CAT_SLOW,
    initialMemo: {
      en: "Father 173 cm, mother 168 cm. Genetic target height 175 cm, but the predicted adult height at the first visit was only 167 cm. A unique case — the family lives in Japan and visits Korea every school break for treatment.",
      th: "พ่อ 173 ซม. แม่ 168 ซม. ส่วนสูงเป้าหมายตามพันธุกรรม 175 ซม. แต่ส่วนสูงผู้ใหญ่ที่คาดการณ์ตอนพบครั้งแรกอยู่เพียง 167 ซม. เป็นเคสพิเศษ — ครอบครัวอาศัยอยู่ที่ญี่ปุ่นและเดินทางมาเกาหลีทุกปิดเทอมเพื่อรับการรักษา",
      vi: "Bố 173 cm, mẹ 168 cm. Chiều cao đích di truyền 175 cm, nhưng chiều cao trưởng thành dự đoán lần đầu chỉ 167 cm. Một ca đặc biệt — gia đình sống ở Nhật và đến Hàn mỗi kỳ nghỉ để điều trị.",
    },
    finalMemo: {
      en: "An international case treated during every school break! Starting from a predicted 167 cm, height is now 175.6 cm — already past the 175 cm genetic target.\n\nThe highlight is bone-age suppression. At chronological age 16 the bone age is 13 years 10 months — pulled back by more than 2 years. That means the growth plates are still wide open and 178–180 cm is realistically reachable.\n\nThe family used auxiliary therapy abroad and committed to a 3–4 year long-term plan. Their willingness to keep flying back and forth between Japan and Korea was remarkable.\n\nSleep stayed the toughest item: bedtime past midnight kept recurring, but diet and exercise were managed well.\n\n\"In Japan they kept telling us 'it's just genetics, nothing can be done,' but treatment in Korea really changed things.\" — Mother\n\nA case that proved cross-border growth treatment works.",
      th: "เคสนานาชาติที่เดินทางมารักษาทุกปิดเทอม! เริ่มจากส่วนสูงคาดการณ์ 167 ซม. ปัจจุบันสูง 175.6 ซม. เกินเป้าหมายพันธุกรรม 175 ซม. แล้ว\n\nไฮไลต์คือการชะลออายุกระดูก อายุจริง 16 ปี แต่อายุกระดูกอยู่ที่ 13 ปี 10 เดือน ห่างไปกว่า 2 ปี แปลว่าแผ่นกระดูกอ่อนยังเปิดกว้าง ส่วนสูงสุดท้าย 178–180 ซม. เป็นไปได้จริง\n\nครอบครัวใช้การรักษาเสริมจากต่างประเทศและวางแผนระยะยาว 3–4 ปี ความตั้งใจที่บินกลับไปกลับมาเกาหลี-ญี่ปุ่นน่าชื่นชมมาก\n\nการนอนยังเป็นโจทย์จนถึงสุดท้าย — เข้านอนหลังเที่ยงคืนเกิดขึ้นซ้ำ ๆ แต่อาหารและการออกกำลังกายดูแลได้ดี\n\n\"ที่ญี่ปุ่นบอกแค่ว่า 'พันธุกรรม ทำอะไรไม่ได้' แต่พอมารักษาที่เกาหลีเปลี่ยนไปจริง ๆ\" — คุณแม่\n\nเคสที่พิสูจน์ว่าการรักษาการเจริญเติบโตข้ามพรมแดนเป็นไปได้",
      vi: "Một ca quốc tế điều trị mỗi kỳ nghỉ! Bắt đầu với chiều cao dự đoán 167 cm, hiện đã đạt 175.6 cm — vượt mục tiêu di truyền 175 cm.\n\nĐiểm nổi bật là việc kìm tuổi xương. Ở tuổi thực 16, tuổi xương chỉ 13 tuổi 10 tháng — chậm hơn 2 năm. Điều đó nghĩa là sụn tăng trưởng vẫn còn mở rộng và có thể đạt 178–180 cm.\n\nGia đình kết hợp điều trị bổ trợ ở nước ngoài và cam kết kế hoạch dài hạn 3–4 năm. Sự kiên trì đi lại Nhật-Hàn của họ thật đáng nể.\n\nGiấc ngủ vẫn là thử thách: ngủ sau nửa đêm lặp lại nhiều lần, nhưng dinh dưỡng và vận động được quản lý tốt.\n\n\"Ở Nhật họ chỉ bảo 'do gen thôi, không làm gì được' — nhưng sang Hàn điều trị thì thực sự khác.\" — Mẹ\n\nMột ca chứng minh điều trị tăng trưởng xuyên biên giới hoàn toàn khả thi.",
    },
    intakeInfo: {
      desiredHeight: { en: 'Over 180 cm', th: 'มากกว่า 180 ซม.', vi: 'Trên 180 cm' },
      growthConcerns: {
        en: 'Lives in Japan, visits Korea every school break for treatment',
        th: 'อาศัยที่ญี่ปุ่น มาเกาหลีรักษาทุกปิดเทอม',
        vi: 'Sống ở Nhật, đến Hàn mỗi kỳ nghỉ để điều trị',
      },
    },
  },

  // ---------------- 은우 (case-zjg7a85h) — Short parents, baseball player ----------------
  'case-zjg7a85h': {
    category: CAT_SHORT_PARENTS,
    initialMemo: {
      en: "Father 168 cm, mother 158 cm — genetic target around 170 cm. The child dreams of being a baseball player, so height was urgent. He started treatment with a yearly growth velocity of just 3 cm.",
      th: "พ่อ 168 ซม. แม่ 158 ซม. — ส่วนสูงเป้าหมายตามพันธุกรรมประมาณ 170 ซม. เด็กฝันอยากเป็นนักเบสบอล ส่วนสูงจึงเป็นเรื่องเร่งด่วน เริ่มรักษาตอนที่อัตราการโตต่อปีเหลือเพียง 3 ซม.",
      vi: "Bố 168 cm, mẹ 158 cm — mục tiêu di truyền khoảng 170 cm. Cậu bé mơ làm vận động viên bóng chày, nên chiều cao là điều cấp thiết. Bắt đầu điều trị khi tốc độ tăng trưởng chỉ 3 cm/năm.",
    },
    finalMemo: {
      en: "Father 168 cm, mother 158 cm — a child whose genetic ceiling was around 170 cm has now passed 175.6 cm. He's already taller than his dad and the growth plates are still open!\n\nGrowth velocity at the first visit was only 3 cm/year, but it jumped to 5.5 cm in the first 6 months of treatment. After we layered on puberty-management medication, bone-age reversal kicked in. With 175.6 cm at bone age 14 yrs 3 mo, a final 182 cm or more is well within reach.\n\nFitness was already strong (athlete's habits), but the \"sleep late, sleep long\" pattern was the bottleneck. Pulling bedtime earlier was the core of treatment, and his parents kept moving it forward step by step.\n\n\"I used to feel guilty for being short and giving him short genes — now he's much taller than me and so happy about it.\" — Mother\n\nGenetics isn't everything. Active treatment + lifestyle care can break the genetic ceiling.",
      th: "พ่อ 168 ซม. แม่ 158 ซม. — เด็กที่เพดานพันธุกรรมประมาณ 170 ซม. ตอนนี้สูงเกิน 175.6 ซม. แล้ว สูงกว่าพ่อ และแผ่นกระดูกอ่อนยังเหลืออยู่!\n\nอัตราการโตตอนพบครั้งแรกเหลือแค่ 3 ซม./ปี แต่หลังเริ่มรักษา 6 เดือนแรกโตขึ้น 5.5 ซม. หลังจากเพิ่มยาจัดการวัยรุ่นก็เกิดการย้อนอายุกระดูก ตอนนี้ที่อายุกระดูก 14 ปี 3 เดือน สูง 175.6 ซม. ส่วนสูงสุดท้าย 182 ซม. ขึ้นไปสามารถคาดหวังได้\n\nร่างกายแข็งแรงอยู่แล้ว (เป็นนักกีฬา) แต่ติดที่ \"นอนดึก นอนยาว\" การปรับเวลานอนให้เร็วขึ้นคือหัวใจของการรักษา และคุณพ่อคุณแม่ค่อย ๆ ขยับเวลานอนได้ทีละนิด\n\n\"เคยรู้สึกผิดที่ตัวเล็กและถ่ายทอดยีนที่เตี้ย ตอนนี้ลูกสูงกว่าพ่อมากและดีใจมาก\" — คุณแม่\n\nพันธุกรรมไม่ใช่ทุกอย่าง การรักษาเชิงรุกกับการดูแลวิถีชีวิตทำให้ก้าวข้ามขีดจำกัดทางพันธุกรรมได้",
      vi: "Bố 168 cm, mẹ 158 cm — một bé có giới hạn di truyền khoảng 170 cm nay đã vượt 175.6 cm. Cậu đã cao hơn bố và sụn tăng trưởng vẫn còn mở!\n\nTốc độ tăng trưởng lúc đầu chỉ 3 cm/năm, nhưng đã tăng vọt 5.5 cm trong 6 tháng đầu điều trị. Sau khi bổ sung thuốc quản lý dậy thì, tuổi xương cũng đảo ngược. Ở tuổi xương 14 năm 3 tháng với 175.6 cm, có thể kỳ vọng chiều cao cuối từ 182 cm trở lên.\n\nThể lực vốn tốt (vận động viên), nhưng \"ngủ muộn, ngủ dài\" là điểm nghẽn. Đẩy giờ đi ngủ sớm hơn là cốt lõi của điều trị, và bố mẹ kiên trì xê dịch từng chút một.\n\n\"Tôi từng day dứt vì thấp và truyền gen thấp cho con — giờ con cao hơn bố nhiều và rất vui.\" — Mẹ\n\nDi truyền không phải là tất cả. Điều trị tích cực và chăm sóc lối sống có thể vượt giới hạn di truyền.",
    },
    intakeInfo: {
      desiredHeight: { en: '185 cm', th: '185 ซม.', vi: '185 cm' },
      growthConcerns: {
        en: 'Training as a baseball player; worried because parents are short',
        th: 'กำลังฝึกเป็นนักเบสบอล กังวลเพราะพ่อแม่ตัวเล็ก',
        vi: 'Đang tập làm cầu thủ bóng chày; lo lắng vì bố mẹ thấp',
      },
    },
  },

  // ---------------- 오빠 (case-6jk8vtuo) — Short parents, USA-based brother ----------------
  'case-6jk8vtuo': {
    category: CAT_SHORT_PARENTS,
    initialMemo: {
      en: "Father 167 cm, mother 160 cm. Living in the US, the family flew to Korea specifically for growth treatment. Genetic target around 170 cm. Bone age was already more than a year ahead, so suppression was urgent.",
      th: "พ่อ 167 ซม. แม่ 160 ซม. ครอบครัวอาศัยที่อเมริกาและบินมาเกาหลีเพื่อการรักษาเฉพาะ ส่วนสูงเป้าหมายตามพันธุกรรมประมาณ 170 ซม. อายุกระดูกล้ำหน้าเกิน 1 ปี การชะลอจึงเป็นเรื่องเร่งด่วน",
      vi: "Bố 167 cm, mẹ 160 cm. Sống ở Mỹ, gia đình bay sang Hàn riêng để điều trị tăng trưởng. Mục tiêu di truyền khoảng 170 cm. Tuổi xương đã sớm hơn hơn 1 năm nên việc kìm hãm là cấp bách.",
    },
    finalMemo: {
      en: "Flew from the US for growth treatment. Father 167 cm, mother 160 cm — and he's now at 174.3 cm, already 7 cm taller than dad!\n\nWe layered three approaches: puberty management + auxiliary therapy + growth-stimulating treatment. Bone-age suppression was outstanding — chronological 13 yrs 9 mo with bone age 13 yrs 4 mo, a 5-month delay that's a real win.\n\nDose was stepped up gradually from 5.5, and the AI-predicted height climbed steadily from 172.3 → 182.9 cm. With 172.8 cm at bone age 13 yrs 4 mo, the growth plates are still wide open and the 183 cm goal is very promising.\n\n\"In the US they told us nothing could be done. So glad we came all the way to Korea.\" — Father\n\nA result built on cross-border trust.",
      th: "บินจากอเมริกามารักษาการเจริญเติบโต พ่อ 167 ซม. แม่ 160 ซม. แต่ตอนนี้สูง 174.3 ซม. สูงกว่าพ่อแล้ว 7 ซม.!\n\nวางการรักษา 3 ชั้น: จัดการวัยรุ่น + การรักษาเสริม + กระตุ้นการเจริญเติบโต การชะลออายุกระดูกได้ผลดีมาก อายุจริง 13 ปี 9 เดือน อายุกระดูก 13 ปี 4 เดือน ห่างไป 5 เดือน ถือเป็นผลลัพธ์ที่ดีมาก\n\nค่อย ๆ ปรับโดสจาก 5.5 และส่วนสูงคาดการณ์โดย AI ก็เพิ่มจาก 172.3 → 182.9 ซม. ที่อายุกระดูก 13 ปี 4 เดือนสูง 172.8 ซม. แผ่นกระดูกอ่อนยังเหลือมาก เป้าหมาย 183 ซม. มีโอกาสสูง\n\n\"ที่อเมริกาบอกว่าไม่มีทาง ดีจริงที่ตัดสินใจมาเกาหลี\" — คุณพ่อ\n\nผลลัพธ์จากความไว้วางใจที่ข้ามพรมแดน",
      vi: "Bay từ Mỹ về Hàn để điều trị tăng trưởng. Bố 167 cm, mẹ 160 cm — giờ cao 174.3 cm, đã hơn bố 7 cm!\n\nKết hợp 3 hướng: quản lý dậy thì + điều trị bổ trợ + kích thích tăng trưởng. Kìm tuổi xương rất tốt — tuổi thực 13 năm 9 tháng, tuổi xương 13 năm 4 tháng, chậm 5 tháng là kết quả ấn tượng.\n\nLiều dùng tăng dần từ 5.5, chiều cao AI dự đoán cũng tăng đều từ 172.3 → 182.9 cm. Ở tuổi xương 13 năm 4 tháng với 172.8 cm, sụn tăng trưởng còn rộng và mục tiêu 183 cm rất hứa hẹn.\n\n\"Ở Mỹ họ bảo không có cách nào. Mừng vì đã quyết định bay sang Hàn.\" — Bố\n\nKết quả của niềm tin xuyên biên giới.",
    },
    intakeInfo: {
      desiredHeight: { en: '183 cm', th: '183 ซม.', vi: '183 cm' },
      growthConcerns: {
        en: 'Lives in the US, started treatment after visiting Korea',
        th: 'อาศัยที่อเมริกา เริ่มรักษาหลังมาเยือนเกาหลี',
        vi: 'Sống ở Mỹ, bắt đầu điều trị sau khi sang Hàn',
      },
    },
  },

  // ---------------- 동생 (case-ublb7r61) — Precocious puberty, sister ----------------
  'case-ublb7r61': {
    category: CAT_PRECOCIOUS,
    initialMemo: {
      en: "A sibling case — she came to Korea from the US together with her older brother Jihun. Mother 160 cm, genetic target 157 cm. At age 8 her bone age was already 10 yrs 6 mo, more than 2 years ahead, so early treatment was needed.",
      th: "เคสพี่น้อง — เธอมาเกาหลีจากอเมริกาพร้อมพี่ชายจีฮุน คุณแม่ 160 ซม. ส่วนสูงเป้าหมายพันธุกรรม 157 ซม. ที่อายุ 8 ปี อายุกระดูกอยู่ที่ 10 ปี 6 เดือน ล้ำหน้าไปกว่า 2 ปี จำเป็นต้องรักษาแต่เนิ่น ๆ",
      vi: "Một ca anh em ruột — cô bé sang Hàn từ Mỹ cùng anh trai Jihun. Mẹ 160 cm, mục tiêu di truyền 157 cm. Ở tuổi 8, tuổi xương đã 10 năm 6 tháng, sớm hơn hơn 2 năm — cần điều trị sớm.",
    },
    finalMemo: {
      en: "A success story of treating siblings together! Together with her older brother Jihun she came over from the US for every visit.\n\nFrom an AI-predicted 153.8 cm at the first visit, the prediction is now 165.3 cm — almost at the 165 cm goal!\n\nWe used puberty-management therapy to suppress bone age for about 2 years, while growth-stimulating treatment was stepped up from 4.0. Sleep was well managed and vegetable intake increased steadily, so treatment response was excellent.\n\nIn about 2 and a half years she grew from 133.7 to 155.7 cm — a remarkable 22 cm. With 155.7 cm at bone age 11 yrs 9 mo, the growth plates are still wide open and 165 cm or more is very achievable.\n\n\"My daughter is growing as well as my son — I think both siblings will reach their goals!\" — Mother\n\nA dual success of two siblings beating their genetic limit.",
      th: "ความสำเร็จของการรักษาพี่น้องด้วยกัน! เธอกับพี่ชายจีฮุนมาจากอเมริกาทุกครั้งที่นัด\n\nจากส่วนสูงคาดการณ์ AI 153.8 ซม. ตอนพบครั้งแรก ตอนนี้คาดการณ์ขึ้นมาที่ 165.3 ซม. ใกล้บรรลุเป้าหมาย 165 ซม. แล้ว!\n\nใช้การรักษาจัดการวัยรุ่นชะลออายุกระดูกประมาณ 2 ปี ขณะเดียวกันเพิ่มการรักษากระตุ้นการเจริญเติบโตจาก 4.0 ขึ้นไป การนอนจัดการได้ดีและรับประทานผักเพิ่มขึ้นเรื่อย ๆ การตอบสนองต่อการรักษาดีมาก\n\nประมาณ 2 ปีครึ่งโตจาก 133.7 เป็น 155.7 ซม. — ถึง 22 ซม. ที่อายุกระดูก 11 ปี 9 เดือนสูง 155.7 ซม. แผ่นกระดูกอ่อนยังเหลืออยู่มาก ส่วนสูงสุดท้าย 165 ซม. ขึ้นไปเป็นไปได้สูง\n\n\"ลูกสาวก็โตได้ดีเหมือนลูกชาย พี่น้องทั้งคู่น่าจะถึงเป้าหมายได้!\" — คุณแม่\n\nสองพี่น้องชนะขีดจำกัดทางพันธุกรรมไปด้วยกัน",
      vi: "Câu chuyện thành công khi điều trị anh em cùng nhau! Cô bé sang Hàn cùng anh trai Jihun từ Mỹ mỗi lần khám.\n\nTừ chiều cao AI dự đoán 153.8 cm lần đầu, dự đoán hiện đã lên 165.3 cm — sát mục tiêu 165 cm!\n\nLiệu pháp quản lý dậy thì kìm tuổi xương khoảng 2 năm, đồng thời điều trị kích thích tăng trưởng được tăng dần từ 4.0. Giấc ngủ được quản lý tốt và ăn rau tăng đều, đáp ứng điều trị rất tốt.\n\nKhoảng 2 năm rưỡi cô bé cao từ 133.7 lên 155.7 cm — tăng tới 22 cm. Ở tuổi xương 11 năm 9 tháng với 155.7 cm, sụn tăng trưởng vẫn còn rộng và đạt 165 cm trở lên là rất khả thi.\n\n\"Con gái cũng phát triển tốt như con trai — chắc cả hai sẽ đạt được mục tiêu!\" — Mẹ\n\nHai anh em cùng vượt giới hạn di truyền.",
    },
    intakeInfo: {
      desiredHeight: { en: '165 cm', th: '165 ซม.', vi: '165 cm' },
      growthConcerns: {
        en: 'Visited Korea for treatment with her brother; suspected precocious puberty',
        th: 'มาเกาหลีรักษาพร้อมพี่ชาย สงสัยภาวะวัยรุ่นก่อนกำหนด',
        vi: 'Đến Hàn điều trị cùng anh trai; nghi dậy thì sớm',
      },
    },
  },

  // ---------------- 성재 (case-3200315i) — Severe precocious puberty + obesity ----------------
  'case-3200315i': {
    category: CAT_PRECOCIOUS,
    initialMemo: {
      en: "At the first visit his real age was 9 yrs 2 mo but his bone age was a staggering 13 yrs 6 mo — over 4 years ahead, a severe precocious-puberty case. Weight 63 kg, also obese. Bone-age suppression was urgent.",
      th: "ตอนพบครั้งแรกอายุจริง 9 ปี 2 เดือน แต่อายุกระดูกอยู่ที่ 13 ปี 6 เดือน — ล้ำหน้าไปกว่า 4 ปี เป็นภาวะวัยรุ่นก่อนกำหนดที่รุนแรง น้ำหนัก 63 กก. ภาวะอ้วนด้วย การชะลออายุกระดูกเร่งด่วน",
      vi: "Ở lần khám đầu, tuổi thực 9 năm 2 tháng nhưng tuổi xương lên tới 13 năm 6 tháng — sớm hơn hơn 4 năm, một ca dậy thì sớm nặng. Cân nặng 63 kg, cũng béo phì. Kìm tuổi xương là cấp bách.",
    },
    finalMemo: {
      en: "The most dramatic change of all our cases. From 147.8 cm at the first visit to 177.4 cm now — about 30 cm of growth!\n\nWith bone age more than 4 years ahead it would have been easy to give up as \"too late,\" but puberty-management medication successfully suppressed bone-age progression. In particular, the 2024 check showing bone age 13 yrs 8 mo — only 11 months apart from real age — is a striking result.\n\nObesity was the biggest challenge. Weight even passed 100 kg at one point, but he kept going with diet care and exercise. Sleep care was a 4-year battle with the smartphone too, but his parents' persistence eventually paid off.\n\n\"They told us 160 cm would be hard because of precocious puberty, but he's already past 177 cm. So glad we didn't give up.\" — Father\n\nFor precocious puberty, early detection and steady treatment are everything.",
      th: "การเปลี่ยนแปลงที่ดราม่าที่สุดในบรรดาเคสทั้งหมด จาก 147.8 ซม. ตอนพบครั้งแรก ตอนนี้ 177.4 ซม. — โตขึ้นประมาณ 30 ซม.!\n\nอายุกระดูกล้ำหน้ากว่า 4 ปี เคยเสี่ยงจะถูกบอกว่า \"สายเกินไป\" แต่การรักษาด้วยยาจัดการวัยรุ่นชะลออายุกระดูกได้สำเร็จ การตรวจปี 2024 พบว่าอายุกระดูก 13 ปี 8 เดือน — ต่างจากอายุจริงเพียง 11 เดือน เป็นผลที่น่าทึ่ง\n\nการจัดการน้ำหนักเป็นโจทย์ใหญ่สุด เคยน้ำหนักเกิน 100 กก. แต่ไม่ยอมแพ้ ดูแลอาหารและออกกำลังกายควบคู่กัน การนอนเป็นสงครามกับมือถือ 4 ปีเต็ม แต่ความอดทนของพ่อแม่ก็ออกผลสุดท้าย\n\n\"หมอเคยบอกว่าเพราะวัยรุ่นก่อนกำหนด 160 ซม. ก็ยากแล้ว แต่ตอนนี้เกิน 177 ซม. ดีจริงที่ไม่ยอมแพ้\" — คุณพ่อ\n\nวัยรุ่นก่อนกำหนด หัวใจอยู่ที่การพบเร็วและรักษาอย่างต่อเนื่อง",
      vi: "Sự thay đổi ngoạn mục nhất trong tất cả các ca. Từ 147.8 cm lần đầu lên 177.4 cm bây giờ — tăng khoảng 30 cm!\n\nVới tuổi xương sớm hơn 4 năm, có thể dễ dàng bỏ cuộc với suy nghĩ \"đã muộn,\" nhưng thuốc quản lý dậy thì kìm tiến triển tuổi xương rất hiệu quả. Đặc biệt, kiểm tra năm 2024 cho thấy tuổi xương 13 năm 8 tháng — chỉ chênh tuổi thực 11 tháng — là kết quả ấn tượng.\n\nQuản lý béo phì là thử thách lớn nhất. Cân nặng từng vượt 100 kg, nhưng cậu vẫn kiên trì kết hợp ăn kiêng và vận động. Giấc ngủ là cuộc chiến với điện thoại suốt 4 năm, nhưng sự bền bỉ của bố mẹ cuối cùng đã có quả.\n\n\"Bác sĩ từng bảo do dậy thì sớm nên 160 cm cũng khó, vậy mà giờ đã hơn 177 cm. Mừng vì không bỏ cuộc.\" — Bố\n\nDậy thì sớm — phát hiện sớm và điều trị bền bỉ là cốt lõi.",
    },
    intakeInfo: {
      desiredHeight: { en: '182 cm', th: '182 ซม.', vi: '182 cm' },
      growthConcerns: {
        en: 'Precocious puberty + obesity, bone age more than 4 years ahead',
        th: 'วัยรุ่นก่อนกำหนด + อ้วน อายุกระดูกล้ำหน้ากว่า 4 ปี',
        vi: 'Dậy thì sớm + béo phì, tuổi xương sớm hơn 4 năm',
      },
    },
  },

  // ---------------- 도훈 (case-w3xx22gw) — Precocious puberty, twin ----------------
  'case-w3xx22gw': {
    category: CAT_PRECOCIOUS,
    initialMemo: {
      en: "At the first visit his bone age was 1 year 3 months ahead of his real age. At that pace growth could have stopped at 173 cm. We started bone-age suppression treatment before the growth plates closed too early.",
      th: "ตอนพบครั้งแรกอายุกระดูกล้ำหน้าอายุจริง 1 ปี 3 เดือน หากปล่อยไว้การเจริญเติบโตอาจหยุดที่ 173 ซม. จึงเริ่มการรักษาชะลออายุกระดูกก่อนที่แผ่นกระดูกอ่อนจะปิดเร็ว",
      vi: "Ở lần khám đầu, tuổi xương sớm hơn tuổi thực 1 năm 3 tháng. Nếu cứ vậy thì tăng trưởng có thể dừng ở 173 cm. Chúng tôi bắt đầu kìm tuổi xương trước khi sụn tăng trưởng đóng sớm.",
    },
    finalMemo: {
      en: "From an initial predicted height of 175.3 cm, he's now grown to 186 cm. Over 10 cm beyond the original target!\n\nPuberty-management therapy successfully suppressed bone-age progression while height kept climbing steadily. In the January 2024 check his bone age was actually younger than his real age — that confirmed treatment was working as intended.\n\nWe also identified personal food sensitivities through allergy testing and ran a tailored meal plan, which played a major role in lifting treatment outcomes.\n\n\"As a twin I expected the genetics would work against him, but seeing him reach 186 cm feels like a dream.\" — Mother\n\nThe result of consistent sleep care, nutrition, and well-timed puberty-management treatment.",
      th: "จากส่วนสูงคาดการณ์เริ่มต้น 175.3 ซม. ตอนนี้สูงถึง 186 ซม. เกินเป้าหมายเดิมไปมากกว่า 10 ซม.!\n\nการรักษาจัดการวัยรุ่นชะลอการดำเนินของอายุกระดูกได้สำเร็จ ขณะที่ส่วนสูงยังโตขึ้นเรื่อย ๆ การตรวจเดือนมกราคม 2024 พบว่าอายุกระดูกอ่อนกว่าอายุจริง ยืนยันว่าการรักษาได้ผลตามที่ตั้งใจ\n\nนอกจากนี้ยังตรวจภูมิแพ้อาหารหาความไวเฉพาะตัว และจัดเมนูเฉพาะบุคคล ซึ่งช่วยยกระดับผลการรักษาอย่างมาก\n\n\"คิดว่าเป็นฝาแฝดอาจเสียเปรียบทางพันธุกรรม แต่เห็นลูกสูง 186 ซม. รู้สึกเหมือนฝัน\" — คุณแม่\n\nผลลัพธ์ของการดูแลการนอน โภชนาการอย่างสม่ำเสมอ และการรักษาจัดการวัยรุ่นในเวลาที่เหมาะสม",
      vi: "Từ chiều cao dự đoán ban đầu 175.3 cm, hiện đã đạt 186 cm. Vượt mục tiêu ban đầu hơn 10 cm!\n\nLiệu pháp quản lý dậy thì kìm tiến triển tuổi xương thành công, trong khi chiều cao vẫn tăng đều. Kiểm tra tháng 1/2024 cho thấy tuổi xương còn trẻ hơn tuổi thực — xác nhận điều trị đang đi đúng hướng.\n\nNgoài ra, kiểm tra dị ứng giúp xác định thực phẩm nhạy cảm theo cá nhân và áp dụng thực đơn riêng, đóng vai trò quan trọng nâng kết quả điều trị.\n\n\"Vì là sinh đôi nên tôi nghĩ di truyền sẽ bất lợi, nhưng thấy con cao 186 cm thật như một giấc mơ.\" — Mẹ\n\nKết quả của giấc ngủ đều, dinh dưỡng và điều trị quản lý dậy thì đúng thời điểm.",
    },
    intakeInfo: {
      desiredHeight: { en: 'Over 180 cm', th: 'มากกว่า 180 ซม.', vi: 'Trên 180 cm' },
      growthConcerns: {
        en: 'Twin son, signs of precocious puberty',
        th: 'ฝาแฝดชาย พบสัญญาณวัยรุ่นก่อนกำหนด',
        vi: 'Con trai sinh đôi, dấu hiệu dậy thì sớm',
      },
    },
    allergyData: {
      caution: localizeAllergy(['우유','카제인','요그르트','치즈','계란흰자','파인애플','마늘','대두콩','아몬드','캐슈넛']),
    },
  },

  // ---------------- 민준 (case-jdajz037) — Idol trainee, no category ----------------
  'case-jdajz037': {
    initialMemo: {
      en: "Father 174 cm, mother 160 cm. Genetic target around 174 cm. He's a trainee at an entertainment agency, so height matters a lot. Bone age was 1 year ahead at the first check, so a quick response was needed.",
      th: "พ่อ 174 ซม. แม่ 160 ซม. ส่วนสูงเป้าหมายตามพันธุกรรมประมาณ 174 ซม. เป็นเด็กฝึกของค่ายบันเทิง จึงให้ความสำคัญกับส่วนสูง อายุกระดูกล้ำหน้า 1 ปีตอนตรวจครั้งแรก จึงต้องตอบสนองอย่างรวดเร็ว",
      vi: "Bố 174 cm, mẹ 160 cm. Mục tiêu di truyền khoảng 174 cm. Cậu là thực tập sinh của công ty giải trí nên rất quan tâm chiều cao. Tuổi xương sớm hơn 1 năm ở lần khám đầu — cần phản ứng nhanh.",
    },
    finalMemo: {
      en: "From 145.3 cm at the first visit with a predicted 178 cm, he's now broken through 180 cm!\n\nOver about 4 and a half years of treatment he grew a total of 34.7 cm. The first 6 months alone added 6.7 cm — a fast initial response — and from there he kept up 7–8 cm per year.\n\nA trainee's irregular schedule was a worry, but securing sleep time alongside nutrition care maximized growth-hormone secretion. In particular, allergy testing pinpointed sensitive foods, and switching to a tailored avoidance diet was a major boost to growth velocity recovery.\n\n\"Now that I'm over 180 cm, my confidence in auditions is completely different!\" — Patient\n\nA case that broke past the genetic limit and got one step closer to the dream.",
      th: "จาก 145.3 ซม. ตอนพบครั้งแรกที่คาดการณ์ 178 ซม. ตอนนี้ทะลุ 180 ซม. แล้ว!\n\nตลอดประมาณ 4 ปีครึ่งของการรักษาโตทั้งหมด 34.7 ซม. แค่ 6 เดือนแรกโตขึ้น 6.7 ซม. — ตอบสนองเร็ว — และยังรักษาอัตราการโต 7–8 ซม./ปีต่อเนื่อง\n\nวิถีชีวิตเด็กฝึกที่ไม่เป็นเวลาเป็นกังวล แต่การรักษาเวลานอนพร้อมการดูแลโภชนาการช่วยเพิ่มการหลั่งฮอร์โมนเจริญเติบโตสูงสุด การตรวจภูมิแพ้พบอาหารที่แพ้และเปลี่ยนเมนูเลี่ยงเฉพาะตัวช่วยฟื้นอัตราการโตอย่างมาก\n\n\"พอสูงเกิน 180 ความมั่นใจในออดิชั่นต่างไปเลย!\" — ผู้ป่วย\n\nเคสที่ก้าวข้ามขีดจำกัดทางพันธุกรรมและเข้าใกล้ความฝันอีกก้าวหนึ่ง",
      vi: "Từ 145.3 cm ở lần khám đầu với dự đoán 178 cm, giờ đã vượt 180 cm!\n\nQua khoảng 4 năm rưỡi điều trị cậu cao thêm tổng cộng 34.7 cm. Riêng 6 tháng đầu đã tăng 6.7 cm — đáp ứng nhanh — và sau đó duy trì 7–8 cm mỗi năm.\n\nLịch sinh hoạt thất thường của thực tập sinh là điều đáng lo, nhưng đảm bảo giờ ngủ kết hợp dinh dưỡng đã tối đa hóa tiết hormone tăng trưởng. Đặc biệt, kiểm tra dị ứng giúp xác định thực phẩm nhạy cảm và chuyển sang thực đơn tránh riêng, đóng góp lớn vào việc phục hồi tốc độ tăng trưởng.\n\n\"Khi cao hơn 180 cm, sự tự tin trong các buổi audition khác hẳn!\" — Bệnh nhân\n\nMột ca vượt giới hạn di truyền và tiến thêm một bước gần với ước mơ.",
    },
    intakeInfo: {
      desiredHeight: { en: 'Over 180 cm', th: 'มากกว่า 180 ซม.', vi: 'Trên 180 cm' },
      growthConcerns: {
        en: 'K-pop trainee; growth velocity has slowed recently',
        th: 'เด็กฝึกของค่าย K-pop ช่วงหลังอัตราการโตชะลอ',
        vi: 'Thực tập sinh K-pop; tốc độ tăng trưởng gần đây chậm lại',
      },
    },
    allergyData: {
      danger: localizeAllergy(['카제인','우유','계란 흰자','계란 노른자','염소우유','양우유','에스파게트','미역','잉어','대구','먹도미류','참돔','장어','해덕','퍼츠','강꼬치고기','연어','각시서대속 어류','송어','잠치','가자미류','오렌지','자두','보리','마카로니용 밀','글리아딘','엿기름','귀리','호밀가루','스펠트밀','밀','밀 겨','옥수수','쌀','겨자 씨','소고기','양고기','타조고기','광고기','토끼','사슴고기','멧돼지','아몬드','브라질호두','캐슈 너트','헤이즐넛','땅콩','피스타치오']),
      caution: localizeAllergy(['알파락트알부민','농어','고등어','아귀','가자미류','고동','석류','아마란스','말고기','호두','무우','버섯']),
    },
  },
};
