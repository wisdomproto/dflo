// Per-slide localized overrides for cases data.
//
// Patient names stay Korean by design (proper nouns + brand consistency).
// Everything else (category, initial/final memo, intake free-text, allergy lists)
// is translated by hand below for the 7 R2-published cases.
//
// Lookup key = `slide.id` (R2 case-* id). When admin adds a new case in Korean,
// add a matching entry here so non-KO visitors still see translated copy. If the
// id is missing, the cases-related components fall back to the Korean source.

export type CaseLocale = 'en' | 'th' | 'vi' | 'zh-hant' | 'zh-hans' | 'ar';
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
  'zh-hant': '生長緩慢',
  'zh-hans': '生长缓慢',
  ar: 'نمو بطيء',
};
const CAT_SHORT_PARENTS: LocalizedString = {
  en: 'Short parents',
  th: 'พ่อแม่ตัวเล็ก',
  vi: 'Bố mẹ thấp',
  'zh-hant': '父母個子矮',
  'zh-hans': '父母个子矮',
  ar: 'والدان قصيرا القامة',
};
const CAT_PRECOCIOUS: LocalizedString = {
  en: 'Precocious puberty',
  th: 'ภาวะวัยรุ่นก่อนกำหนด',
  vi: 'Dậy thì sớm',
  'zh-hant': '性早熟',
  'zh-hans': '性早熟',
  ar: 'البلوغ المبكر',
};

// Common allergy food names — translated once, reused via array build below.
// Keys = Korean source string; values = per-locale translation.
const FOOD: Record<string, LocalizedString> = {
  '우유':         { en: 'Milk', th: 'นม', vi: 'Sữa', 'zh-hant': '牛奶', 'zh-hans': '牛奶', ar: 'حليب' },
  '카제인':       { en: 'Casein', th: 'เคซีน', vi: 'Casein', 'zh-hant': '酪蛋白', 'zh-hans': '酪蛋白', ar: 'كازين' },
  '요그르트':     { en: 'Yogurt', th: 'โยเกิร์ต', vi: 'Sữa chua', 'zh-hant': '優格', 'zh-hans': '酸奶', ar: 'زبادي' },
  '치즈':         { en: 'Cheese', th: 'ชีส', vi: 'Phô mai', 'zh-hant': '起司', 'zh-hans': '奶酪', ar: 'جبن' },
  '계란흰자':     { en: 'Egg white', th: 'ไข่ขาว', vi: 'Lòng trắng trứng', 'zh-hant': '蛋白', 'zh-hans': '蛋清', ar: 'بياض البيض' },
  '계란 흰자':    { en: 'Egg white', th: 'ไข่ขาว', vi: 'Lòng trắng trứng', 'zh-hant': '蛋白', 'zh-hans': '蛋清', ar: 'بياض البيض' },
  '계란 노른자':  { en: 'Egg yolk', th: 'ไข่แดง', vi: 'Lòng đỏ trứng', 'zh-hant': '蛋黃', 'zh-hans': '蛋黄', ar: 'صفار البيض' },
  '파인애플':     { en: 'Pineapple', th: 'สับปะรด', vi: 'Dứa', 'zh-hant': '鳳梨', 'zh-hans': '菠萝', ar: 'أناناس' },
  '마늘':         { en: 'Garlic', th: 'กระเทียม', vi: 'Tỏi', 'zh-hant': '大蒜', 'zh-hans': '大蒜', ar: 'ثوم' },
  '대두콩':       { en: 'Soybean', th: 'ถั่วเหลือง', vi: 'Đậu nành', 'zh-hant': '大豆', 'zh-hans': '大豆', ar: 'فول الصويا' },
  '아몬드':       { en: 'Almond', th: 'อัลมอนด์', vi: 'Hạnh nhân', 'zh-hant': '杏仁', 'zh-hans': '杏仁', ar: 'لوز' },
  '캐슈넛':       { en: 'Cashew', th: 'มะม่วงหิมพานต์', vi: 'Hạt điều', 'zh-hant': '腰果', 'zh-hans': '腰果', ar: 'كاجو' },
  '캐슈 너트':    { en: 'Cashew', th: 'มะม่วงหิมพานต์', vi: 'Hạt điều', 'zh-hant': '腰果', 'zh-hans': '腰果', ar: 'كاجو' },
  '염소우유':     { en: 'Goat milk', th: 'นมแพะ', vi: 'Sữa dê', 'zh-hant': '山羊奶', 'zh-hans': '山羊奶', ar: 'حليب الماعز' },
  '양우유':       { en: 'Sheep milk', th: 'นมแกะ', vi: 'Sữa cừu', 'zh-hant': '綿羊奶', 'zh-hans': '绵羊奶', ar: 'حليب الغنم' },
  '에스파게트':   { en: 'Spaghetti', th: 'สปาเกตตี', vi: 'Spaghetti', 'zh-hant': '義大利麵', 'zh-hans': '意大利面', ar: 'سباغيتي' },
  '미역':         { en: 'Wakame seaweed', th: 'สาหร่ายวากาเมะ', vi: 'Rong biển wakame', 'zh-hant': '裙帶菜', 'zh-hans': '裙带菜', ar: 'أعشاب واكامي البحرية' },
  '잉어':         { en: 'Carp', th: 'ปลาคาร์ป', vi: 'Cá chép', 'zh-hant': '鯉魚', 'zh-hans': '鲤鱼', ar: 'سمك الشبوط' },
  '대구':         { en: 'Cod', th: 'ปลาคอด', vi: 'Cá tuyết', 'zh-hant': '鱈魚', 'zh-hans': '鳕鱼', ar: 'سمك القد' },
  '먹도미류':     { en: 'Black bream', th: 'ปลาทรายแดงดำ', vi: 'Cá tráp đen', 'zh-hant': '黑鯛', 'zh-hans': '黑鲷', ar: 'سمك الدنيس الأسود' },
  '참돔':         { en: 'Red sea bream', th: 'ปลาทรายแดง', vi: 'Cá tráp đỏ', 'zh-hant': '真鯛', 'zh-hans': '真鲷', ar: 'سمك الدنيس الأحمر' },
  '장어':         { en: 'Eel', th: 'ปลาไหล', vi: 'Lươn', 'zh-hant': '鰻魚', 'zh-hans': '鳗鱼', ar: 'ثعبان السمك' },
  '해덕':         { en: 'Haddock', th: 'ปลาแฮดด็อก', vi: 'Cá tuyết chấm đen', 'zh-hant': '黑線鱈', 'zh-hans': '黑线鳕', ar: 'سمك الحدوق' },
  '퍼츠':         { en: 'Perch', th: 'ปลาเพิร์ช', vi: 'Cá pecca', 'zh-hant': '河鱸', 'zh-hans': '河鲈', ar: 'سمك الفرخ' },
  '강꼬치고기':   { en: 'Pike', th: 'ปลาไพค์', vi: 'Cá chó', 'zh-hant': '梭子魚', 'zh-hans': '梭子鱼', ar: 'سمك الكراكي' },
  '연어':         { en: 'Salmon', th: 'ปลาแซลมอน', vi: 'Cá hồi', 'zh-hant': '鮭魚', 'zh-hans': '三文鱼', ar: 'سلمون' },
  '각시서대속 어류': { en: 'Sole', th: 'ปลาลิ้นหมา', vi: 'Cá bơn lưỡi', 'zh-hant': '鰨魚', 'zh-hans': '鳎鱼', ar: 'سمك موسى' },
  '송어':         { en: 'Trout', th: 'ปลาเทราต์', vi: 'Cá hồi vân', 'zh-hant': '鱒魚', 'zh-hans': '鳟鱼', ar: 'سمك السلمون المرقط' },
  '잠치':         { en: 'Sandfish', th: 'ปลาหินทราย', vi: 'Cá cát', 'zh-hant': '沙魚', 'zh-hans': '沙鱼', ar: 'سمك الرمل' },
  '가자미류':     { en: 'Flounder', th: 'ปลาตาเดียว', vi: 'Cá bơn', 'zh-hant': '比目魚', 'zh-hans': '比目鱼', ar: 'سمك موسى المفلطح' },
  '오렌지':       { en: 'Orange', th: 'ส้ม', vi: 'Cam', 'zh-hant': '柳橙', 'zh-hans': '橙子', ar: 'برتقال' },
  '자두':         { en: 'Plum', th: 'พลัม', vi: 'Mận', 'zh-hant': '李子', 'zh-hans': '李子', ar: 'برقوق' },
  '보리':         { en: 'Barley', th: 'ข้าวบาร์เลย์', vi: 'Lúa mạch', 'zh-hant': '大麥', 'zh-hans': '大麦', ar: 'شعير' },
  '마카로니용 밀':{ en: 'Durum wheat', th: 'ข้าวสาลีดูรัม', vi: 'Lúa mì durum', 'zh-hant': '杜蘭小麥', 'zh-hans': '杜兰小麦', ar: 'قمح دوروم' },
  '글리아딘':     { en: 'Gliadin', th: 'กลีอะดิน', vi: 'Gliadin', 'zh-hant': '麥膠蛋白', 'zh-hans': '麦胶蛋白', ar: 'غليادين' },
  '엿기름':       { en: 'Malt', th: 'มอลต์', vi: 'Mạch nha', 'zh-hant': '麥芽', 'zh-hans': '麦芽', ar: 'شعير الملت' },
  '귀리':         { en: 'Oats', th: 'โอ๊ต', vi: 'Yến mạch', 'zh-hant': '燕麥', 'zh-hans': '燕麦', ar: 'شوفان' },
  '호밀가루':     { en: 'Rye flour', th: 'แป้งไรย์', vi: 'Bột lúa mạch đen', 'zh-hant': '黑麥麵粉', 'zh-hans': '黑麦面粉', ar: 'دقيق الجاودار' },
  '스펠트밀':     { en: 'Spelt', th: 'สเปลต์', vi: 'Lúa mì spelt', 'zh-hant': '斯佩爾特小麥', 'zh-hans': '斯佩尔特小麦', ar: 'قمح السبلت' },
  '밀':           { en: 'Wheat', th: 'ข้าวสาลี', vi: 'Lúa mì', 'zh-hant': '小麥', 'zh-hans': '小麦', ar: 'قمح' },
  '밀 겨':        { en: 'Wheat bran', th: 'รำข้าวสาลี', vi: 'Cám lúa mì', 'zh-hant': '麥麩', 'zh-hans': '麦麸', ar: 'نخالة القمح' },
  '옥수수':       { en: 'Corn', th: 'ข้าวโพด', vi: 'Ngô', 'zh-hant': '玉米', 'zh-hans': '玉米', ar: 'ذرة' },
  '쌀':           { en: 'Rice', th: 'ข้าว', vi: 'Gạo', 'zh-hant': '稻米', 'zh-hans': '大米', ar: 'أرز' },
  '겨자 씨':      { en: 'Mustard seed', th: 'เมล็ดมัสตาร์ด', vi: 'Hạt mù tạt', 'zh-hant': '芥末籽', 'zh-hans': '芥末籽', ar: 'بذور الخردل' },
  '소고기':       { en: 'Beef', th: 'เนื้อวัว', vi: 'Thịt bò', 'zh-hant': '牛肉', 'zh-hans': '牛肉', ar: 'لحم بقري' },
  '양고기':       { en: 'Lamb', th: 'เนื้อแกะ', vi: 'Thịt cừu', 'zh-hant': '羊肉', 'zh-hans': '羊肉', ar: 'لحم ضأن' },
  '타조고기':     { en: 'Ostrich', th: 'เนื้อนกกระจอกเทศ', vi: 'Thịt đà điểu', 'zh-hant': '鴕鳥肉', 'zh-hans': '鸵鸟肉', ar: 'لحم النعام' },
  '광고기':       { en: 'Pollock', th: 'ปลาพอลล็อก', vi: 'Cá pollock', 'zh-hant': '明太魚', 'zh-hans': '明太鱼', ar: 'سمك البلوق' },
  '토끼':         { en: 'Rabbit', th: 'กระต่าย', vi: 'Thỏ', 'zh-hant': '兔肉', 'zh-hans': '兔肉', ar: 'لحم الأرنب' },
  '사슴고기':     { en: 'Venison', th: 'เนื้อกวาง', vi: 'Thịt nai', 'zh-hant': '鹿肉', 'zh-hans': '鹿肉', ar: 'لحم الغزال' },
  '멧돼지':       { en: 'Wild boar', th: 'หมูป่า', vi: 'Lợn rừng', 'zh-hant': '野豬肉', 'zh-hans': '野猪肉', ar: 'لحم الخنزير البري' },
  '브라질호두':   { en: 'Brazil nut', th: 'บราซิลนัท', vi: 'Hạt Brazil', 'zh-hant': '巴西堅果', 'zh-hans': '巴西坚果', ar: 'جوز برازيلي' },
  '헤이즐넛':     { en: 'Hazelnut', th: 'เฮเซลนัท', vi: 'Quả phỉ', 'zh-hant': '榛果', 'zh-hans': '榛子', ar: 'بندق' },
  '땅콩':         { en: 'Peanut', th: 'ถั่วลิสง', vi: 'Đậu phộng', 'zh-hant': '花生', 'zh-hans': '花生', ar: 'فول سوداني' },
  '피스타치오':   { en: 'Pistachio', th: 'พิสตาชิโอ', vi: 'Hạt dẻ cười', 'zh-hant': '開心果', 'zh-hans': '开心果', ar: 'فستق' },
  '알파락트알부민':{ en: 'Alpha-lactalbumin', th: 'อัลฟา-แลคตาลบูมิน', vi: 'Alpha-lactalbumin', 'zh-hant': 'α-乳白蛋白', 'zh-hans': 'α-乳白蛋白', ar: 'ألفا لاكتالبومين' },
  '농어':         { en: 'Sea bass', th: 'ปลากะพง', vi: 'Cá vược', 'zh-hant': '鱸魚', 'zh-hans': '鲈鱼', ar: 'سمك القاروص' },
  '고등어':       { en: 'Mackerel', th: 'ปลาแมคเคอเรล', vi: 'Cá thu', 'zh-hant': '鯖魚', 'zh-hans': '鲭鱼', ar: 'ماكاريل' },
  '아귀':         { en: 'Monkfish', th: 'ปลามังก์ฟิช', vi: 'Cá lưỡi rồng', 'zh-hant': '鮟鱇魚', 'zh-hans': '鮟鱇鱼', ar: 'سمك أبو الشص' },
  '고동':         { en: 'Conch', th: 'หอยสังข์', vi: 'Ốc xà cừ', 'zh-hant': '海螺', 'zh-hans': '海螺', ar: 'حلزون البحر' },
  '석류':         { en: 'Pomegranate', th: 'ทับทิม', vi: 'Lựu', 'zh-hant': '石榴', 'zh-hans': '石榴', ar: 'رمان' },
  '아마란스':     { en: 'Amaranth', th: 'อะมารันท์', vi: 'Rau dền', 'zh-hant': '莧菜', 'zh-hans': '苋菜', ar: 'قطيفة' },
  '말고기':       { en: 'Horse meat', th: 'เนื้อม้า', vi: 'Thịt ngựa', 'zh-hant': '馬肉', 'zh-hans': '马肉', ar: 'لحم الحصان' },
  '호두':         { en: 'Walnut', th: 'วอลนัท', vi: 'Quả óc chó', 'zh-hant': '核桃', 'zh-hans': '核桃', ar: 'جوز' },
  '무우':         { en: 'Radish', th: 'หัวไชเท้า', vi: 'Củ cải trắng', 'zh-hant': '白蘿蔔', 'zh-hans': '白萝卜', ar: 'فجل' },
  '버섯':         { en: 'Mushroom', th: 'เห็ด', vi: 'Nấm', 'zh-hant': '蘑菇', 'zh-hans': '蘑菇', ar: 'فطر' },
};

function buildFoodList(items: string[], lang: CaseLocale): string[] {
  return items.map((k) => FOOD[k]?.[lang] ?? k);
}

function localizeAllergy(items: string[]): LocalizedStringArray {
  return {
    en: buildFoodList(items, 'en'),
    th: buildFoodList(items, 'th'),
    vi: buildFoodList(items, 'vi'),
    'zh-hant': buildFoodList(items, 'zh-hant'),
    'zh-hans': buildFoodList(items, 'zh-hans'),
    ar: buildFoodList(items, 'ar'),
  };
}

// ============================================================================
// Cases banner (intro slide) — title/subtitle stay Korean in R2, translated here.
// Only the cases-embed page renders a banner for non-KO locales, so applying
// these overrides whenever lang !== 'ko' is safe.
// ============================================================================
export const CASES_BANNER_I18N: { title: LocalizedString; subtitle: LocalizedString } = {
  title: {
    en: 'Growing Tall with Confidence\n187 Growth Stories',
    th: 'เลี้ยงให้สูงได้อย่างมั่นใจ\n187 เรื่องราวการเติบโต',
    vi: 'Nuôi con cao lớn đầy tự tin\n187 Câu chuyện tăng trưởng',
    'zh-hant': '自信地養育高個子\n187 個成長故事',
    'zh-hans': '自信地养育高个子\n187 个成长故事',
    ar: 'ننمو طِوالاً بثقة\n187 قصة نمو',
  },
  subtitle: {
    en: "Real height-growth success stories from\n187 Growth Clinic's 10 years of expertise",
    th: 'เรื่องราวความสำเร็จด้านส่วนสูงจริง\nจากประสบการณ์ดูแลการเติบโต 10 ปีของคลินิก 187',
    vi: 'Những câu chuyện thành công về chiều cao thật\ntừ 10 năm kinh nghiệm của Phòng khám Tăng trưởng 187',
    'zh-hant': '來自 187 成長診所 10 年專業經驗的\n真實身高成長成功故事',
    'zh-hans': '来自 187 成长诊所 10 年专业经验的\n真实身高成长成功故事',
    ar: 'قصص نجاح حقيقية في نمو الطول\nمن خبرة عيادة 187 للنمو على مدى 10 سنوات',
  },
};

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
      'zh-hant': "父親 173 公分，母親 168 公分。遺傳預估身高 175 公分，但初診時的預估成人身高僅 167 公分。這是一個特別的案例——家庭住在日本，每逢學校假期便來韓國接受治療。",
      'zh-hans': "父亲 173 厘米，母亲 168 厘米。遗传预估身高 175 厘米，但初诊时的预估成人身高仅 167 厘米。这是一个特别的案例——家庭住在日本，每逢学校假期便来韩国接受治疗。",
      ar: "الأب 173 سم، والأم 168 سم. الطول الوراثي المتوقّع 175 سم، لكن الطول المتوقّع عند البلوغ في أول زيارة كان 167 سم فقط. حالة فريدة — تعيش العائلة في اليابان وتأتي إلى كوريا في كل عطلة مدرسية لتلقّي العلاج.",
    },
    finalMemo: {
      en: "An international case treated during every school break! Starting from a predicted 167 cm, height is now 175.6 cm — already past the 175 cm genetic target.\n\nThe highlight is bone-age suppression. At chronological age 16 the bone age is 13 years 10 months — pulled back by more than 2 years. That means the growth plates are still wide open and 178–180 cm is realistically reachable.\n\nThe family used auxiliary therapy abroad and committed to a 3–4 year long-term plan. Their willingness to keep flying back and forth between Japan and Korea was remarkable.\n\nSleep stayed the toughest item: bedtime past midnight kept recurring, but diet and exercise were managed well.\n\n\"In Japan they kept telling us 'it's just genetics, nothing can be done,' but treatment in Korea really changed things.\" — Mother\n\nA case that proved cross-border growth treatment works.",
      th: "เคสนานาชาติที่เดินทางมารักษาทุกปิดเทอม! เริ่มจากส่วนสูงคาดการณ์ 167 ซม. ปัจจุบันสูง 175.6 ซม. เกินเป้าหมายพันธุกรรม 175 ซม. แล้ว\n\nไฮไลต์คือการชะลออายุกระดูก อายุจริง 16 ปี แต่อายุกระดูกอยู่ที่ 13 ปี 10 เดือน ห่างไปกว่า 2 ปี แปลว่าแผ่นกระดูกอ่อนยังเปิดกว้าง ส่วนสูงสุดท้าย 178–180 ซม. เป็นไปได้จริง\n\nครอบครัวใช้การรักษาเสริมจากต่างประเทศและวางแผนระยะยาว 3–4 ปี ความตั้งใจที่บินกลับไปกลับมาเกาหลี-ญี่ปุ่นน่าชื่นชมมาก\n\nการนอนยังเป็นโจทย์จนถึงสุดท้าย — เข้านอนหลังเที่ยงคืนเกิดขึ้นซ้ำ ๆ แต่อาหารและการออกกำลังกายดูแลได้ดี\n\n\"ที่ญี่ปุ่นบอกแค่ว่า 'พันธุกรรม ทำอะไรไม่ได้' แต่พอมารักษาที่เกาหลีเปลี่ยนไปจริง ๆ\" — คุณแม่\n\nเคสที่พิสูจน์ว่าการรักษาการเจริญเติบโตข้ามพรมแดนเป็นไปได้",
      vi: "Một ca quốc tế điều trị mỗi kỳ nghỉ! Bắt đầu với chiều cao dự đoán 167 cm, hiện đã đạt 175.6 cm — vượt mục tiêu di truyền 175 cm.\n\nĐiểm nổi bật là việc kìm tuổi xương. Ở tuổi thực 16, tuổi xương chỉ 13 tuổi 10 tháng — chậm hơn 2 năm. Điều đó nghĩa là sụn tăng trưởng vẫn còn mở rộng và có thể đạt 178–180 cm.\n\nGia đình kết hợp điều trị bổ trợ ở nước ngoài và cam kết kế hoạch dài hạn 3–4 năm. Sự kiên trì đi lại Nhật-Hàn của họ thật đáng nể.\n\nGiấc ngủ vẫn là thử thách: ngủ sau nửa đêm lặp lại nhiều lần, nhưng dinh dưỡng và vận động được quản lý tốt.\n\n\"Ở Nhật họ chỉ bảo 'do gen thôi, không làm gì được' — nhưng sang Hàn điều trị thì thực sự khác.\" — Mẹ\n\nMột ca chứng minh điều trị tăng trưởng xuyên biên giới hoàn toàn khả thi.",
      'zh-hant': "每逢學校假期便跨國治療的案例！從預估 167 公分起步，現在身高已達 175.6 公分——早已超過 175 公分的遺傳目標。\n\n最大的亮點是骨齡的抑制。實際年齡 16 歲，骨齡卻是 13 歲 10 個月——足足拉回 2 年多。這意味著生長板仍然大幅開放，178–180 公分是切實可及的。\n\n家庭在海外並用了輔助療法，並承諾 3–4 年的長期計畫。他們願意持續往返日韓的堅持令人欽佩。\n\n睡眠始終是最棘手的項目：過了午夜才就寢的情況反覆出現，但飲食與運動管理得很好。\n\n\"在日本一直被告知『這就是遺傳，沒辦法』，但在韓國治療真的改變了一切。\" — 母親\n\n這是證明跨國成長治療確實有效的案例。",
      'zh-hans': "每逢学校假期便跨国治疗的案例！从预估 167 厘米起步，现在身高已达 175.6 厘米——早已超过 175 厘米的遗传目标。\n\n最大的亮点是骨龄的抑制。实际年龄 16 岁，骨龄却是 13 岁 10 个月——足足拉回 2 年多。这意味着生长板仍然大幅开放，178–180 厘米是切实可及的。\n\n家庭在海外并用了辅助疗法，并承诺 3–4 年的长期计划。他们愿意持续往返日韩的坚持令人钦佩。\n\n睡眠始终是最棘手的项目：过了午夜才就寝的情况反复出现，但饮食与运动管理得很好。\n\n\"在日本一直被告知『这就是遗传，没办法』，但在韩国治疗真的改变了一切。\" — 母亲\n\n这是证明跨国成长治疗确实有效的案例。",
      ar: "حالة دولية عُولجت في كل عطلة مدرسية! انطلاقاً من طول متوقّع 167 سم، أصبح الطول الآن 175.6 سم — متجاوزاً الطول الوراثي المتوقّع البالغ 175 سم.\n\nأبرز نقطة هي كبح العمر العظمي. عند العمر الزمني 16 سنة يبلغ العمر العظمي 13 سنة و10 أشهر — أي متأخّراً بأكثر من سنتين. وهذا يعني أن صفائح النمو ما زالت مفتوحة على اتساعها، وأن بلوغ 178–180 سم أمر واقعي.\n\nاستعانت العائلة بعلاج مساعد في الخارج والتزمت بخطة طويلة الأمد مدتها 3–4 سنوات. وكان استعدادها لمواصلة السفر ذهاباً وإياباً بين اليابان وكوريا أمراً يستحق التقدير.\n\nظل النوم أصعب البنود: تكرّر الخلود إلى النوم بعد منتصف الليل، لكن النظام الغذائي والتمارين جرى ضبطهما جيداً.\n\n\"في اليابان ظلوا يقولون لنا 'إنها مجرد وراثة، لا يمكن فعل شيء'، لكن العلاج في كوريا غيّر الأمور فعلاً.\" — الأم\n\nحالة أثبتت أن علاج النمو عبر الحدود ناجح.",
    },
    intakeInfo: {
      desiredHeight: { en: 'Over 180 cm', th: 'มากกว่า 180 ซม.', vi: 'Trên 180 cm', 'zh-hant': '180 公分以上', 'zh-hans': '180 厘米以上', ar: 'أكثر من 180 سم' },
      growthConcerns: {
        en: 'Lives in Japan, visits Korea every school break for treatment',
        th: 'อาศัยที่ญี่ปุ่น มาเกาหลีรักษาทุกปิดเทอม',
        vi: 'Sống ở Nhật, đến Hàn mỗi kỳ nghỉ để điều trị',
        'zh-hant': '住在日本，每逢學校假期來韓國治療',
        'zh-hans': '住在日本，每逢学校假期来韩国治疗',
        ar: 'تعيش في اليابان، وتأتي إلى كوريا في كل عطلة مدرسية لتلقّي العلاج',
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
      'zh-hant': "父親 168 公分，母親 158 公分——遺傳預估身高約 170 公分。孩子夢想成為棒球選手，因此身高十分迫切。開始治療時每年的生長速度僅 3 公分。",
      'zh-hans': "父亲 168 厘米，母亲 158 厘米——遗传预估身高约 170 厘米。孩子梦想成为棒球选手，因此身高十分迫切。开始治疗时每年的生长速度仅 3 厘米。",
      ar: "الأب 168 سم، والأم 158 سم — الطول الوراثي المتوقّع نحو 170 سم. يحلم الطفل بأن يصبح لاعب بيسبول، لذا كان الطول أمراً ملحّاً. بدأ العلاج ووتيرة نموه السنوية 3 سم فقط.",
    },
    finalMemo: {
      en: "Father 168 cm, mother 158 cm — a child whose genetic ceiling was around 170 cm has now passed 175.6 cm. He's already taller than his dad and the growth plates are still open!\n\nGrowth velocity at the first visit was only 3 cm/year, but it jumped to 5.5 cm in the first 6 months of treatment. After we layered on puberty-management medication, bone-age reversal kicked in. With 175.6 cm at bone age 14 yrs 3 mo, a final 182 cm or more is well within reach.\n\nFitness was already strong (athlete's habits), but the \"sleep late, sleep long\" pattern was the bottleneck. Pulling bedtime earlier was the core of treatment, and his parents kept moving it forward step by step.\n\n\"I used to feel guilty for being short and giving him short genes — now he's much taller than me and so happy about it.\" — Mother\n\nGenetics isn't everything. Active treatment + lifestyle care can break the genetic ceiling.",
      th: "พ่อ 168 ซม. แม่ 158 ซม. — เด็กที่เพดานพันธุกรรมประมาณ 170 ซม. ตอนนี้สูงเกิน 175.6 ซม. แล้ว สูงกว่าพ่อ และแผ่นกระดูกอ่อนยังเหลืออยู่!\n\nอัตราการโตตอนพบครั้งแรกเหลือแค่ 3 ซม./ปี แต่หลังเริ่มรักษา 6 เดือนแรกโตขึ้น 5.5 ซม. หลังจากเพิ่มยาจัดการวัยรุ่นก็เกิดการย้อนอายุกระดูก ตอนนี้ที่อายุกระดูก 14 ปี 3 เดือน สูง 175.6 ซม. ส่วนสูงสุดท้าย 182 ซม. ขึ้นไปสามารถคาดหวังได้\n\nร่างกายแข็งแรงอยู่แล้ว (เป็นนักกีฬา) แต่ติดที่ \"นอนดึก นอนยาว\" การปรับเวลานอนให้เร็วขึ้นคือหัวใจของการรักษา และคุณพ่อคุณแม่ค่อย ๆ ขยับเวลานอนได้ทีละนิด\n\n\"เคยรู้สึกผิดที่ตัวเล็กและถ่ายทอดยีนที่เตี้ย ตอนนี้ลูกสูงกว่าพ่อมากและดีใจมาก\" — คุณแม่\n\nพันธุกรรมไม่ใช่ทุกอย่าง การรักษาเชิงรุกกับการดูแลวิถีชีวิตทำให้ก้าวข้ามขีดจำกัดทางพันธุกรรมได้",
      vi: "Bố 168 cm, mẹ 158 cm — một bé có giới hạn di truyền khoảng 170 cm nay đã vượt 175.6 cm. Cậu đã cao hơn bố và sụn tăng trưởng vẫn còn mở!\n\nTốc độ tăng trưởng lúc đầu chỉ 3 cm/năm, nhưng đã tăng vọt 5.5 cm trong 6 tháng đầu điều trị. Sau khi bổ sung thuốc quản lý dậy thì, tuổi xương cũng đảo ngược. Ở tuổi xương 14 năm 3 tháng với 175.6 cm, có thể kỳ vọng chiều cao cuối từ 182 cm trở lên.\n\nThể lực vốn tốt (vận động viên), nhưng \"ngủ muộn, ngủ dài\" là điểm nghẽn. Đẩy giờ đi ngủ sớm hơn là cốt lõi của điều trị, và bố mẹ kiên trì xê dịch từng chút một.\n\n\"Tôi từng day dứt vì thấp và truyền gen thấp cho con — giờ con cao hơn bố nhiều và rất vui.\" — Mẹ\n\nDi truyền không phải là tất cả. Điều trị tích cực và chăm sóc lối sống có thể vượt giới hạn di truyền.",
      'zh-hant': "父親 168 公分，母親 158 公分——遺傳上限約 170 公分的孩子，如今已突破 175.6 公分。他已經比爸爸還高，而且生長板仍然開放！\n\n初診時生長速度只有每年 3 公分，但治療的頭 6 個月就竄升了 5.5 公分。在加上青春期管理藥物後，骨齡出現逆轉。骨齡 14 歲 3 個月時身高 175.6 公分，最終達到 182 公分以上是很有把握的。\n\n體能本來就好（運動員的習慣），但「晚睡、睡得久」是瓶頸。將就寢時間提前是治療的核心，父母一步步地慢慢把它往前挪。\n\n\"以前一直很自責，覺得自己個子矮又把矮的基因遺傳給孩子——現在他比我高出許多，非常開心。\" — 母親\n\n遺傳並非一切。積極治療加上生活護理，能夠突破遺傳的上限。",
      'zh-hans': "父亲 168 厘米，母亲 158 厘米——遗传上限约 170 厘米的孩子，如今已突破 175.6 厘米。他已经比爸爸还高，而且生长板仍然开放！\n\n初诊时生长速度只有每年 3 厘米，但治疗的头 6 个月就窜升了 5.5 厘米。在加上青春期管理药物后，骨龄出现逆转。骨龄 14 岁 3 个月时身高 175.6 厘米，最终达到 182 厘米以上是很有把握的。\n\n体能本来就好（运动员的习惯），但“晚睡、睡得久”是瓶颈。将就寝时间提前是治疗的核心，父母一步步地慢慢把它往前挪。\n\n\"以前一直很自责，觉得自己个子矮又把矮的基因遗传给孩子——现在他比我高出许多，非常开心。\" — 母亲\n\n遗传并非一切。积极治疗加上生活护理，能够突破遗传的上限。",
      ar: "الأب 168 سم، والأم 158 سم — طفلٌ كان سقفه الوراثي نحو 170 سم تجاوز الآن 175.6 سم. لقد أصبح أطول من والده وصفائح النمو ما زالت مفتوحة!\n\nكانت وتيرة النمو عند أول زيارة 3 سم في السنة فقط، لكنها قفزت إلى 5.5 سم في الأشهر الستة الأولى من العلاج. وبعد أن أضفنا دواء إدارة البلوغ، بدأ انعكاس العمر العظمي. وبطول 175.6 سم عند عمر عظمي 14 سنة و3 أشهر، فإن بلوغ طول نهائي 182 سم أو أكثر أمر في المتناول.\n\nكانت اللياقة قوية أصلاً (عادات رياضي)، لكن نمط \"النوم متأخراً والنوم طويلاً\" كان عنق الزجاجة. وكان تقديم موعد النوم جوهر العلاج، وظل والداه يقدّمانه خطوة خطوة.\n\n\"كنت أشعر بالذنب لأنني قصير وورّثته جينات القِصَر — والآن هو أطول مني بكثير وسعيد جداً بذلك.\" — الأم\n\nالوراثة ليست كل شيء. العلاج الفعّال مع رعاية نمط الحياة قادران على كسر السقف الوراثي.",
    },
    intakeInfo: {
      desiredHeight: { en: '185 cm', th: '185 ซม.', vi: '185 cm', 'zh-hant': '185 公分', 'zh-hans': '185 厘米', ar: '185 سم' },
      growthConcerns: {
        en: 'Training as a baseball player; worried because parents are short',
        th: 'กำลังฝึกเป็นนักเบสบอล กังวลเพราะพ่อแม่ตัวเล็ก',
        vi: 'Đang tập làm cầu thủ bóng chày; lo lắng vì bố mẹ thấp',
        'zh-hant': '正在訓練成為棒球選手；因父母個子矮而擔心',
        'zh-hans': '正在训练成为棒球选手；因父母个子矮而担心',
        ar: 'يتدرّب ليصبح لاعب بيسبول؛ والقلق قائم لأن الوالدين قصيرا القامة',
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
      'zh-hant': "父親 167 公分，母親 160 公分。住在美國，家庭專程飛來韓國接受成長治療。遺傳預估身高約 170 公分。骨齡已經超前 1 年多，抑制刻不容緩。",
      'zh-hans': "父亲 167 厘米，母亲 160 厘米。住在美国，家庭专程飞来韩国接受成长治疗。遗传预估身高约 170 厘米。骨龄已经超前 1 年多，抑制刻不容缓。",
      ar: "الأب 167 سم، والأم 160 سم. تعيش العائلة في الولايات المتحدة، وسافرت إلى كوريا خصيصاً من أجل علاج النمو. الطول الوراثي المتوقّع نحو 170 سم. وكان العمر العظمي متقدّماً بأكثر من سنة، لذا كان كبحه أمراً ملحّاً.",
    },
    finalMemo: {
      en: "Flew from the US for growth treatment. Father 167 cm, mother 160 cm — and he's now at 174.3 cm, already 7 cm taller than dad!\n\nWe layered three approaches: puberty management + auxiliary therapy + growth-stimulating treatment. Bone-age suppression was outstanding — chronological 13 yrs 9 mo with bone age 13 yrs 4 mo, a 5-month delay that's a real win.\n\nDose was stepped up gradually from 5.5, and the AI-predicted height climbed steadily from 172.3 → 182.9 cm. With 172.8 cm at bone age 13 yrs 4 mo, the growth plates are still wide open and the 183 cm goal is very promising.\n\n\"In the US they told us nothing could be done. So glad we came all the way to Korea.\" — Father\n\nA result built on cross-border trust.",
      th: "บินจากอเมริกามารักษาการเจริญเติบโต พ่อ 167 ซม. แม่ 160 ซม. แต่ตอนนี้สูง 174.3 ซม. สูงกว่าพ่อแล้ว 7 ซม.!\n\nวางการรักษา 3 ชั้น: จัดการวัยรุ่น + การรักษาเสริม + กระตุ้นการเจริญเติบโต การชะลออายุกระดูกได้ผลดีมาก อายุจริง 13 ปี 9 เดือน อายุกระดูก 13 ปี 4 เดือน ห่างไป 5 เดือน ถือเป็นผลลัพธ์ที่ดีมาก\n\nค่อย ๆ ปรับโดสจาก 5.5 และส่วนสูงคาดการณ์โดย AI ก็เพิ่มจาก 172.3 → 182.9 ซม. ที่อายุกระดูก 13 ปี 4 เดือนสูง 172.8 ซม. แผ่นกระดูกอ่อนยังเหลือมาก เป้าหมาย 183 ซม. มีโอกาสสูง\n\n\"ที่อเมริกาบอกว่าไม่มีทาง ดีจริงที่ตัดสินใจมาเกาหลี\" — คุณพ่อ\n\nผลลัพธ์จากความไว้วางใจที่ข้ามพรมแดน",
      vi: "Bay từ Mỹ về Hàn để điều trị tăng trưởng. Bố 167 cm, mẹ 160 cm — giờ cao 174.3 cm, đã hơn bố 7 cm!\n\nKết hợp 3 hướng: quản lý dậy thì + điều trị bổ trợ + kích thích tăng trưởng. Kìm tuổi xương rất tốt — tuổi thực 13 năm 9 tháng, tuổi xương 13 năm 4 tháng, chậm 5 tháng là kết quả ấn tượng.\n\nLiều dùng tăng dần từ 5.5, chiều cao AI dự đoán cũng tăng đều từ 172.3 → 182.9 cm. Ở tuổi xương 13 năm 4 tháng với 172.8 cm, sụn tăng trưởng còn rộng và mục tiêu 183 cm rất hứa hẹn.\n\n\"Ở Mỹ họ bảo không có cách nào. Mừng vì đã quyết định bay sang Hàn.\" — Bố\n\nKết quả của niềm tin xuyên biên giới.",
      'zh-hant': "從美國飛來接受成長治療。父親 167 公分，母親 160 公分——如今身高 174.3 公分，已經比爸爸高 7 公分！\n\n我們並用了三種方法：青春期管理 + 輔助療法 + 促進生長治療。骨齡抑制成效出色——實際年齡 13 歲 9 個月，骨齡 13 歲 4 個月，延緩了 5 個月，是實實在在的成果。\n\n劑量從 5.5 逐步增加，AI 預估身高也穩定攀升，從 172.3 → 182.9 公分。骨齡 13 歲 4 個月時身高 172.8 公分，生長板仍然大幅開放，183 公分的目標非常有希望。\n\n\"在美國他們說沒有辦法。很慶幸我們大老遠來了韓國。\" — 父親\n\n這是建立在跨國信任之上的成果。",
      'zh-hans': "从美国飞来接受成长治疗。父亲 167 厘米，母亲 160 厘米——如今身高 174.3 厘米，已经比爸爸高 7 厘米！\n\n我们并用了三种方法：青春期管理 + 辅助疗法 + 促进生长治疗。骨龄抑制成效出色——实际年龄 13 岁 9 个月，骨龄 13 岁 4 个月，延缓了 5 个月，是实实在在的成果。\n\n剂量从 5.5 逐步增加，AI 预估身高也稳定攀升，从 172.3 → 182.9 厘米。骨龄 13 岁 4 个月时身高 172.8 厘米，生长板仍然大幅开放，183 厘米的目标非常有希望。\n\n\"在美国他们说没有办法。很庆幸我们大老远来了韩国。\" — 父亲\n\n这是建立在跨国信任之上的成果。",
      ar: "سافر من الولايات المتحدة من أجل علاج النمو. الأب 167 سم، والأم 160 سم — وهو الآن عند 174.3 سم، أطول من والده بـ7 سم!\n\nدمجنا ثلاثة مسارات: إدارة البلوغ + علاج مساعد + علاج محفّز للنمو. وكان كبح العمر العظمي متميّزاً — العمر الزمني 13 سنة و9 أشهر مع عمر عظمي 13 سنة و4 أشهر، أي تأخّر 5 أشهر وهو مكسب حقيقي.\n\nرُفعت الجرعة تدريجياً من 5.5، وارتفع الطول المتوقّع عند البلوغ بالذكاء الاصطناعي باطّراد من 172.3 إلى 182.9 سم. وبطول 172.8 سم عند عمر عظمي 13 سنة و4 أشهر، فإن صفائح النمو ما زالت مفتوحة على اتساعها وهدف 183 سم واعد جداً.\n\n\"في الولايات المتحدة قالوا لنا إنه لا يمكن فعل شيء. سعداء جداً لأننا جئنا إلى كوريا رغم بُعد المسافة.\" — الأب\n\nنتيجة مبنية على ثقة عابرة للحدود.",
    },
    intakeInfo: {
      desiredHeight: { en: '183 cm', th: '183 ซม.', vi: '183 cm', 'zh-hant': '183 公分', 'zh-hans': '183 厘米', ar: '183 سم' },
      growthConcerns: {
        en: 'Lives in the US, started treatment after visiting Korea',
        th: 'อาศัยที่อเมริกา เริ่มรักษาหลังมาเยือนเกาหลี',
        vi: 'Sống ở Mỹ, bắt đầu điều trị sau khi sang Hàn',
        'zh-hant': '住在美國，來韓國後開始治療',
        'zh-hans': '住在美国，来韩国后开始治疗',
        ar: 'يعيش في الولايات المتحدة، وبدأ العلاج بعد زيارة كوريا',
      },
    },
  },

  // ---------------- 동생 (case-ublb7r61) — Precocious puberty, sister ----------------
  'case-ublb7r61': {
    category: CAT_PRECOCIOUS,
    initialMemo: {
      en: "A sibling case — she came to Korea from the US together with her older brother. Mother 160 cm, genetic target 157 cm. At age 8 her bone age was already 10 yrs 6 mo, more than 2 years ahead, so early treatment was needed.",
      th: "เคสพี่น้อง — เธอมาเกาหลีจากอเมริกาพร้อมพี่ชาย คุณแม่ 160 ซม. ส่วนสูงเป้าหมายพันธุกรรม 157 ซม. ที่อายุ 8 ปี อายุกระดูกอยู่ที่ 10 ปี 6 เดือน ล้ำหน้าไปกว่า 2 ปี จำเป็นต้องรักษาแต่เนิ่น ๆ",
      vi: "Một ca anh em ruột — cô bé sang Hàn từ Mỹ cùng anh trai. Mẹ 160 cm, mục tiêu di truyền 157 cm. Ở tuổi 8, tuổi xương đã 10 năm 6 tháng, sớm hơn hơn 2 năm — cần điều trị sớm.",
      'zh-hant': "一個手足案例——她與哥哥一起從美國來到韓國。母親 160 公分，遺傳預估身高 157 公分。8 歲時骨齡已達 10 歲 6 個月，超前 2 年多，需要及早治療。",
      'zh-hans': "一个手足案例——她与哥哥一起从美国来到韩国。母亲 160 厘米，遗传预估身高 157 厘米。8 岁时骨龄已达 10 岁 6 个月，超前 2 年多，需要及早治疗。",
      ar: "حالة أشقاء — جاءت إلى كوريا من الولايات المتحدة برفقة أخيها الأكبر. الأم 160 سم، والطول الوراثي المتوقّع 157 سم. في سن الثامنة كان عمرها العظمي 10 سنوات و6 أشهر، أي متقدّماً بأكثر من سنتين، لذا لزم العلاج المبكر.",
    },
    finalMemo: {
      en: "A success story of treating siblings together! Together with her older brother she came over from the US for every visit.\n\nFrom an AI-predicted 153.8 cm at the first visit, the prediction is now 165.3 cm — almost at the 165 cm goal!\n\nWe used puberty-management therapy to suppress bone age for about 2 years, while growth-stimulating treatment was stepped up from 4.0. Sleep was well managed and vegetable intake increased steadily, so treatment response was excellent.\n\nIn about 2 and a half years she grew from 133.7 to 155.7 cm — a remarkable 22 cm. With 155.7 cm at bone age 11 yrs 9 mo, the growth plates are still wide open and 165 cm or more is very achievable.\n\n\"My daughter is growing as well as my son — I think both siblings will reach their goals!\" — Mother\n\nA dual success of two siblings beating their genetic limit.",
      th: "ความสำเร็จของการรักษาพี่น้องด้วยกัน! เธอกับพี่ชายมาจากอเมริกาทุกครั้งที่นัด\n\nจากส่วนสูงคาดการณ์ AI 153.8 ซม. ตอนพบครั้งแรก ตอนนี้คาดการณ์ขึ้นมาที่ 165.3 ซม. ใกล้บรรลุเป้าหมาย 165 ซม. แล้ว!\n\nใช้การรักษาจัดการวัยรุ่นชะลออายุกระดูกประมาณ 2 ปี ขณะเดียวกันเพิ่มการรักษากระตุ้นการเจริญเติบโตจาก 4.0 ขึ้นไป การนอนจัดการได้ดีและรับประทานผักเพิ่มขึ้นเรื่อย ๆ การตอบสนองต่อการรักษาดีมาก\n\nประมาณ 2 ปีครึ่งโตจาก 133.7 เป็น 155.7 ซม. — ถึง 22 ซม. ที่อายุกระดูก 11 ปี 9 เดือนสูง 155.7 ซม. แผ่นกระดูกอ่อนยังเหลืออยู่มาก ส่วนสูงสุดท้าย 165 ซม. ขึ้นไปเป็นไปได้สูง\n\n\"ลูกสาวก็โตได้ดีเหมือนลูกชาย พี่น้องทั้งคู่น่าจะถึงเป้าหมายได้!\" — คุณแม่\n\nสองพี่น้องชนะขีดจำกัดทางพันธุกรรมไปด้วยกัน",
      vi: "Câu chuyện thành công khi điều trị anh em cùng nhau! Cô bé sang Hàn cùng anh trai từ Mỹ mỗi lần khám.\n\nTừ chiều cao AI dự đoán 153.8 cm lần đầu, dự đoán hiện đã lên 165.3 cm — sát mục tiêu 165 cm!\n\nLiệu pháp quản lý dậy thì kìm tuổi xương khoảng 2 năm, đồng thời điều trị kích thích tăng trưởng được tăng dần từ 4.0. Giấc ngủ được quản lý tốt và ăn rau tăng đều, đáp ứng điều trị rất tốt.\n\nKhoảng 2 năm rưỡi cô bé cao từ 133.7 lên 155.7 cm — tăng tới 22 cm. Ở tuổi xương 11 năm 9 tháng với 155.7 cm, sụn tăng trưởng vẫn còn rộng và đạt 165 cm trở lên là rất khả thi.\n\n\"Con gái cũng phát triển tốt như con trai — chắc cả hai sẽ đạt được mục tiêu!\" — Mẹ\n\nHai anh em cùng vượt giới hạn di truyền.",
      'zh-hant': "手足一起治療的成功故事！她每次回診都和哥哥一起從美國前來。\n\n從初診時 AI 預估 153.8 公分，如今預估已提升到 165.3 公分——幾乎達到 165 公分的目標！\n\n我們以青春期管理療法抑制骨齡約 2 年，同時將促進生長治療從 4.0 逐步增加。睡眠管理良好，蔬菜攝取也穩定增加，因此治療反應非常出色。\n\n約兩年半的時間，她從 133.7 公分長到 155.7 公分——足足 22 公分。骨齡 11 歲 9 個月時身高 155.7 公分，生長板仍然大幅開放，達到 165 公分以上非常可行。\n\n\"女兒和兒子一樣長得很好——我想兄妹倆都會達成目標！\" — 母親\n\n兄妹兩人一同戰勝了遺傳的極限。",
      'zh-hans': "手足一起治疗的成功故事！她每次回诊都和哥哥一起从美国前来。\n\n从初诊时 AI 预估 153.8 厘米，如今预估已提升到 165.3 厘米——几乎达到 165 厘米的目标！\n\n我们以青春期管理疗法抑制骨龄约 2 年，同时将促进生长治疗从 4.0 逐步增加。睡眠管理良好，蔬菜摄取也稳定增加，因此治疗反应非常出色。\n\n约两年半的时间，她从 133.7 厘米长到 155.7 厘米——足足 22 厘米。骨龄 11 岁 9 个月时身高 155.7 厘米，生长板仍然大幅开放，达到 165 厘米以上非常可行。\n\n\"女儿和儿子一样长得很好——我想兄妹俩都会达成目标！\" — 母亲\n\n兄妹两人一同战胜了遗传的极限。",
      ar: "قصة نجاح لعلاج الأشقاء معاً! كانت تأتي من الولايات المتحدة برفقة أخيها الأكبر في كل زيارة.\n\nمن طول متوقّع بالذكاء الاصطناعي 153.8 سم عند أول زيارة، أصبح التوقّع الآن 165.3 سم — قريباً جداً من هدف 165 سم!\n\nاستخدمنا علاج إدارة البلوغ لكبح العمر العظمي نحو سنتين، بينما رُفع العلاج المحفّز للنمو تدريجياً من 4.0. جرى ضبط النوم جيداً وزاد تناول الخضار باطّراد، فكانت الاستجابة للعلاج ممتازة.\n\nخلال نحو سنتين ونصف نمت من 133.7 إلى 155.7 سم — زيادة لافتة قدرها 22 سم. وبطول 155.7 سم عند عمر عظمي 11 سنة و9 أشهر، فإن صفائح النمو ما زالت مفتوحة على اتساعها وبلوغ 165 سم أو أكثر أمر ممكن جداً.\n\n\"ابنتي تنمو تماماً مثل ابني — أعتقد أن كلا الشقيقين سيبلغان هدفيهما!\" — الأم\n\nنجاحٌ مزدوج لشقيقين تغلّبا على حدّهما الوراثي.",
    },
    intakeInfo: {
      desiredHeight: { en: '165 cm', th: '165 ซม.', vi: '165 cm', 'zh-hant': '165 公分', 'zh-hans': '165 厘米', ar: '165 سم' },
      growthConcerns: {
        en: 'Visited Korea for treatment with her brother; suspected precocious puberty',
        th: 'มาเกาหลีรักษาพร้อมพี่ชาย สงสัยภาวะวัยรุ่นก่อนกำหนด',
        vi: 'Đến Hàn điều trị cùng anh trai; nghi dậy thì sớm',
        'zh-hant': '與哥哥一起來韓國治療；疑似性早熟',
        'zh-hans': '与哥哥一起来韩国治疗；疑似性早熟',
        ar: 'زارت كوريا للعلاج برفقة أخيها؛ يُشتبه في البلوغ المبكر',
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
      'zh-hant': "初診時實際年齡 9 歲 2 個月，但骨齡竟高達 13 歲 6 個月——超前 4 年以上，屬於嚴重的性早熟案例。體重 63 公斤，同時有肥胖問題。抑制骨齡刻不容緩。",
      'zh-hans': "初诊时实际年龄 9 岁 2 个月，但骨龄竟高达 13 岁 6 个月——超前 4 年以上，属于严重的性早熟案例。体重 63 公斤，同时有肥胖问题。抑制骨龄刻不容缓。",
      ar: "عند أول زيارة كان عمره الحقيقي 9 سنوات وشهرين، لكن عمره العظمي بلغ 13 سنة و6 أشهر — أي متقدّماً بأكثر من 4 سنوات، وهي حالة بلوغ مبكر شديدة. الوزن 63 كغ، مع سمنة أيضاً. وكان كبح العمر العظمي أمراً ملحّاً.",
    },
    finalMemo: {
      en: "The most dramatic change of all our cases. From 147.8 cm at the first visit to 177.4 cm now — about 30 cm of growth!\n\nWith bone age more than 4 years ahead it would have been easy to give up as \"too late,\" but puberty-management medication successfully suppressed bone-age progression. In particular, the 2024 check showing bone age 13 yrs 8 mo — only 11 months apart from real age — is a striking result.\n\nObesity was the biggest challenge. Weight even passed 100 kg at one point, but he kept going with diet care and exercise. Sleep care was a 4-year battle with the smartphone too, but his parents' persistence eventually paid off.\n\n\"They told us 160 cm would be hard because of precocious puberty, but he's already past 177 cm. So glad we didn't give up.\" — Father\n\nFor precocious puberty, early detection and steady treatment are everything.",
      th: "การเปลี่ยนแปลงที่ดราม่าที่สุดในบรรดาเคสทั้งหมด จาก 147.8 ซม. ตอนพบครั้งแรก ตอนนี้ 177.4 ซม. — โตขึ้นประมาณ 30 ซม.!\n\nอายุกระดูกล้ำหน้ากว่า 4 ปี เคยเสี่ยงจะถูกบอกว่า \"สายเกินไป\" แต่การรักษาด้วยยาจัดการวัยรุ่นชะลออายุกระดูกได้สำเร็จ การตรวจปี 2024 พบว่าอายุกระดูก 13 ปี 8 เดือน — ต่างจากอายุจริงเพียง 11 เดือน เป็นผลที่น่าทึ่ง\n\nการจัดการน้ำหนักเป็นโจทย์ใหญ่สุด เคยน้ำหนักเกิน 100 กก. แต่ไม่ยอมแพ้ ดูแลอาหารและออกกำลังกายควบคู่กัน การนอนเป็นสงครามกับมือถือ 4 ปีเต็ม แต่ความอดทนของพ่อแม่ก็ออกผลสุดท้าย\n\n\"หมอเคยบอกว่าเพราะวัยรุ่นก่อนกำหนด 160 ซม. ก็ยากแล้ว แต่ตอนนี้เกิน 177 ซม. ดีจริงที่ไม่ยอมแพ้\" — คุณพ่อ\n\nวัยรุ่นก่อนกำหนด หัวใจอยู่ที่การพบเร็วและรักษาอย่างต่อเนื่อง",
      vi: "Sự thay đổi ngoạn mục nhất trong tất cả các ca. Từ 147.8 cm lần đầu lên 177.4 cm bây giờ — tăng khoảng 30 cm!\n\nVới tuổi xương sớm hơn 4 năm, có thể dễ dàng bỏ cuộc với suy nghĩ \"đã muộn,\" nhưng thuốc quản lý dậy thì kìm tiến triển tuổi xương rất hiệu quả. Đặc biệt, kiểm tra năm 2024 cho thấy tuổi xương 13 năm 8 tháng — chỉ chênh tuổi thực 11 tháng — là kết quả ấn tượng.\n\nQuản lý béo phì là thử thách lớn nhất. Cân nặng từng vượt 100 kg, nhưng cậu vẫn kiên trì kết hợp ăn kiêng và vận động. Giấc ngủ là cuộc chiến với điện thoại suốt 4 năm, nhưng sự bền bỉ của bố mẹ cuối cùng đã có quả.\n\n\"Bác sĩ từng bảo do dậy thì sớm nên 160 cm cũng khó, vậy mà giờ đã hơn 177 cm. Mừng vì không bỏ cuộc.\" — Bố\n\nDậy thì sớm — phát hiện sớm và điều trị bền bỉ là cốt lõi.",
      'zh-hant': "在我們所有案例中變化最戲劇性的一例。從初診時的 147.8 公分到現在的 177.4 公分——長高了約 30 公分！\n\n骨齡超前 4 年以上，原本很容易被判定為「太遲了」而放棄，但青春期管理藥物成功抑制了骨齡的進展。特別是 2024 年的檢查顯示骨齡 13 歲 8 個月——與實際年齡只差 11 個月——是相當驚人的結果。\n\n肥胖是最大的挑戰。體重一度超過 100 公斤，但他堅持配合飲食管理與運動。睡眠是與手機長達 4 年的戰爭，但父母的堅持最終得到了回報。\n\n\"醫師曾說因為性早熟連 160 公分都很難，如今卻已超過 177 公分。很慶幸我們沒有放棄。\" — 父親\n\n對於性早熟，及早發現與持續治療就是一切。",
      'zh-hans': "在我们所有案例中变化最戏剧性的一例。从初诊时的 147.8 厘米到现在的 177.4 厘米——长高了约 30 厘米！\n\n骨龄超前 4 年以上，原本很容易被判定为“太迟了”而放弃，但青春期管理药物成功抑制了骨龄的进展。特别是 2024 年的检查显示骨龄 13 岁 8 个月——与实际年龄只差 11 个月——是相当惊人的结果。\n\n肥胖是最大的挑战。体重一度超过 100 公斤，但他坚持配合饮食管理与运动。睡眠是与手机长达 4 年的战争，但父母的坚持最终得到了回报。\n\n\"医师曾说因为性早熟连 160 厘米都很难，如今却已超过 177 厘米。很庆幸我们没有放弃。\" — 父亲\n\n对于性早熟，及早发现与持续治疗就是一切。",
      ar: "أكبر تغيّر مثير بين كل حالاتنا. من 147.8 سم عند أول زيارة إلى 177.4 سم الآن — أي نموّ يقارب 30 سم!\n\nمع عمر عظمي متقدّم بأكثر من 4 سنوات، كان من السهل الاستسلام بحجّة أنه \"فات الأوان\"، لكن دواء إدارة البلوغ نجح في كبح تقدّم العمر العظمي. وعلى وجه الخصوص، فإن فحص عام 2024 الذي أظهر عمراً عظمياً 13 سنة و8 أشهر — بفارق 11 شهراً فقط عن العمر الحقيقي — نتيجة لافتة.\n\nكانت السمنة أكبر التحديات. حتى إن الوزن تجاوز 100 كغ في وقتٍ ما، لكنه واصل بالعناية الغذائية والتمارين. وكانت رعاية النوم أيضاً معركة استمرّت 4 سنوات مع الهاتف الذكي، لكن مثابرة والديه أثمرت في النهاية.\n\n\"قالوا لنا إن بلوغ 160 سم سيكون صعباً بسبب البلوغ المبكر، لكنه تجاوز 177 سم بالفعل. سعداء جداً لأننا لم نستسلم.\" — الأب\n\nفي البلوغ المبكر، الاكتشاف المبكر والعلاج المتواصل هما كل شيء.",
    },
    intakeInfo: {
      desiredHeight: { en: '182 cm', th: '182 ซม.', vi: '182 cm', 'zh-hant': '182 公分', 'zh-hans': '182 厘米', ar: '182 سم' },
      growthConcerns: {
        en: 'Precocious puberty + obesity, bone age more than 4 years ahead',
        th: 'วัยรุ่นก่อนกำหนด + อ้วน อายุกระดูกล้ำหน้ากว่า 4 ปี',
        vi: 'Dậy thì sớm + béo phì, tuổi xương sớm hơn 4 năm',
        'zh-hant': '性早熟 + 肥胖，骨齡超前 4 年以上',
        'zh-hans': '性早熟 + 肥胖，骨龄超前 4 年以上',
        ar: 'بلوغ مبكر + سمنة، والعمر العظمي متقدّم بأكثر من 4 سنوات',
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
      'zh-hant': "初診時骨齡比實際年齡超前 1 年 3 個月。若照此速度，成長可能停在 173 公分。我們在生長板過早閉合之前，便開始了骨齡抑制治療。",
      'zh-hans': "初诊时骨龄比实际年龄超前 1 年 3 个月。若照此速度，成长可能停在 173 厘米。我们在生长板过早闭合之前，便开始了骨龄抑制治疗。",
      ar: "عند أول زيارة كان عمره العظمي متقدّماً على عمره الحقيقي بسنة و3 أشهر. وبهذه الوتيرة كان النمو قد يتوقّف عند 173 سم. بدأنا علاج كبح العمر العظمي قبل أن تنغلق صفائح النمو مبكراً.",
    },
    finalMemo: {
      en: "From an initial predicted height of 175.3 cm, he's now grown to 186 cm. Over 10 cm beyond the original target!\n\nPuberty-management therapy successfully suppressed bone-age progression while height kept climbing steadily. In the January 2024 check his bone age was actually younger than his real age — that confirmed treatment was working as intended.\n\nWe also identified personal food sensitivities through allergy testing and ran a tailored meal plan, which played a major role in lifting treatment outcomes.\n\n\"As a twin I expected the genetics would work against him, but seeing him reach 186 cm feels like a dream.\" — Mother\n\nThe result of consistent sleep care, nutrition, and well-timed puberty-management treatment.",
      th: "จากส่วนสูงคาดการณ์เริ่มต้น 175.3 ซม. ตอนนี้สูงถึง 186 ซม. เกินเป้าหมายเดิมไปมากกว่า 10 ซม.!\n\nการรักษาจัดการวัยรุ่นชะลอการดำเนินของอายุกระดูกได้สำเร็จ ขณะที่ส่วนสูงยังโตขึ้นเรื่อย ๆ การตรวจเดือนมกราคม 2024 พบว่าอายุกระดูกอ่อนกว่าอายุจริง ยืนยันว่าการรักษาได้ผลตามที่ตั้งใจ\n\nนอกจากนี้ยังตรวจภูมิแพ้อาหารหาความไวเฉพาะตัว และจัดเมนูเฉพาะบุคคล ซึ่งช่วยยกระดับผลการรักษาอย่างมาก\n\n\"คิดว่าเป็นฝาแฝดอาจเสียเปรียบทางพันธุกรรม แต่เห็นลูกสูง 186 ซม. รู้สึกเหมือนฝัน\" — คุณแม่\n\nผลลัพธ์ของการดูแลการนอน โภชนาการอย่างสม่ำเสมอ และการรักษาจัดการวัยรุ่นในเวลาที่เหมาะสม",
      vi: "Từ chiều cao dự đoán ban đầu 175.3 cm, hiện đã đạt 186 cm. Vượt mục tiêu ban đầu hơn 10 cm!\n\nLiệu pháp quản lý dậy thì kìm tiến triển tuổi xương thành công, trong khi chiều cao vẫn tăng đều. Kiểm tra tháng 1/2024 cho thấy tuổi xương còn trẻ hơn tuổi thực — xác nhận điều trị đang đi đúng hướng.\n\nNgoài ra, kiểm tra dị ứng giúp xác định thực phẩm nhạy cảm theo cá nhân và áp dụng thực đơn riêng, đóng vai trò quan trọng nâng kết quả điều trị.\n\n\"Vì là sinh đôi nên tôi nghĩ di truyền sẽ bất lợi, nhưng thấy con cao 186 cm thật như một giấc mơ.\" — Mẹ\n\nKết quả của giấc ngủ đều, dinh dưỡng và điều trị quản lý dậy thì đúng thời điểm.",
      'zh-hant': "從初始預估身高 175.3 公分，如今已長到 186 公分。比原本的目標超出了 10 公分以上！\n\n青春期管理療法成功抑制了骨齡的進展，同時身高持續穩定攀升。2024 年 1 月的檢查中，骨齡竟比實際年齡還年輕——這證實了治療正按預期發揮作用。\n\n此外，我們透過過敏檢查找出個人的食物敏感，並執行量身訂做的飲食計畫，這對提升治療成效起了重要作用。\n\n\"因為是雙胞胎，本以為遺傳會不利，看到孩子長到 186 公分，感覺就像做夢一樣。\" — 母親\n\n這是持續的睡眠護理、營養與適時青春期管理治療的成果。",
      'zh-hans': "从初始预估身高 175.3 厘米，如今已长到 186 厘米。比原本的目标超出了 10 厘米以上！\n\n青春期管理疗法成功抑制了骨龄的进展，同时身高持续稳定攀升。2024 年 1 月的检查中，骨龄竟比实际年龄还年轻——这证实了治疗正按预期发挥作用。\n\n此外，我们通过过敏检查找出个人的食物敏感，并执行量身定做的饮食计划，这对提升治疗成效起了重要作用。\n\n\"因为是双胞胎，本以为遗传会不利，看到孩子长到 186 厘米，感觉就像做梦一样。\" — 母亲\n\n这是持续的睡眠护理、营养与适时青春期管理治疗的成果。",
      ar: "من طول متوقّع مبدئي قدره 175.3 سم، نما الآن إلى 186 سم. أي أكثر من 10 سم فوق الهدف الأصلي!\n\nنجح علاج إدارة البلوغ في كبح تقدّم العمر العظمي بينما استمر الطول في الارتفاع باطّراد. وفي فحص يناير 2024 كان عمره العظمي أصغر فعلياً من عمره الحقيقي — وهذا أكّد أن العلاج يسير كما هو مقصود.\n\nكما حدّدنا حساسيات غذائية شخصية عبر فحص الحساسية وطبّقنا خطة وجبات مخصّصة، وهو ما أدّى دوراً كبيراً في رفع نتائج العلاج.\n\n\"بوصفه توأماً، توقّعت أن تكون الوراثة في غير صالحه، لكن رؤيته يبلغ 186 سم أشبه بحلم.\" — الأم\n\nثمرة رعاية نوم متواصلة وتغذية وعلاج إدارة بلوغ في توقيته المناسب.",
    },
    intakeInfo: {
      desiredHeight: { en: 'Over 180 cm', th: 'มากกว่า 180 ซม.', vi: 'Trên 180 cm', 'zh-hant': '180 公分以上', 'zh-hans': '180 厘米以上', ar: 'أكثر من 180 سم' },
      growthConcerns: {
        en: 'Twin son, signs of precocious puberty',
        th: 'ฝาแฝดชาย พบสัญญาณวัยรุ่นก่อนกำหนด',
        vi: 'Con trai sinh đôi, dấu hiệu dậy thì sớm',
        'zh-hant': '雙胞胎男孩，出現性早熟跡象',
        'zh-hans': '双胞胎男孩，出现性早熟迹象',
        ar: 'ابن توأم، مع علامات البلوغ المبكر',
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
      'zh-hant': "父親 174 公分，母親 160 公分。遺傳預估身高約 174 公分。他是娛樂經紀公司的練習生，因此身高十分重要。初診時骨齡超前 1 年，需要迅速應對。",
      'zh-hans': "父亲 174 厘米，母亲 160 厘米。遗传预估身高约 174 厘米。他是娱乐经纪公司的练习生，因此身高十分重要。初诊时骨龄超前 1 年，需要迅速应对。",
      ar: "الأب 174 سم، والأم 160 سم. الطول الوراثي المتوقّع نحو 174 سم. هو متدرّب في وكالة فنية، لذا للطول أهمية كبيرة. كان العمر العظمي متقدّماً بسنة عند أول فحص، لذا لزمت استجابة سريعة.",
    },
    finalMemo: {
      en: "From 145.3 cm at the first visit with a predicted 178 cm, he's now broken through 180 cm!\n\nOver about 4 and a half years of treatment he grew a total of 34.7 cm. The first 6 months alone added 6.7 cm — a fast initial response — and from there he kept up 7–8 cm per year.\n\nA trainee's irregular schedule was a worry, but securing sleep time alongside nutrition care maximized growth-hormone secretion. In particular, allergy testing pinpointed sensitive foods, and switching to a tailored avoidance diet was a major boost to growth velocity recovery.\n\n\"Now that I'm over 180 cm, my confidence in auditions is completely different!\" — Patient\n\nA case that broke past the genetic limit and got one step closer to the dream.",
      th: "จาก 145.3 ซม. ตอนพบครั้งแรกที่คาดการณ์ 178 ซม. ตอนนี้ทะลุ 180 ซม. แล้ว!\n\nตลอดประมาณ 4 ปีครึ่งของการรักษาโตทั้งหมด 34.7 ซม. แค่ 6 เดือนแรกโตขึ้น 6.7 ซม. — ตอบสนองเร็ว — และยังรักษาอัตราการโต 7–8 ซม./ปีต่อเนื่อง\n\nวิถีชีวิตเด็กฝึกที่ไม่เป็นเวลาเป็นกังวล แต่การรักษาเวลานอนพร้อมการดูแลโภชนาการช่วยเพิ่มการหลั่งฮอร์โมนเจริญเติบโตสูงสุด การตรวจภูมิแพ้พบอาหารที่แพ้และเปลี่ยนเมนูเลี่ยงเฉพาะตัวช่วยฟื้นอัตราการโตอย่างมาก\n\n\"พอสูงเกิน 180 ความมั่นใจในออดิชั่นต่างไปเลย!\" — ผู้ป่วย\n\nเคสที่ก้าวข้ามขีดจำกัดทางพันธุกรรมและเข้าใกล้ความฝันอีกก้าวหนึ่ง",
      vi: "Từ 145.3 cm ở lần khám đầu với dự đoán 178 cm, giờ đã vượt 180 cm!\n\nQua khoảng 4 năm rưỡi điều trị cậu cao thêm tổng cộng 34.7 cm. Riêng 6 tháng đầu đã tăng 6.7 cm — đáp ứng nhanh — và sau đó duy trì 7–8 cm mỗi năm.\n\nLịch sinh hoạt thất thường của thực tập sinh là điều đáng lo, nhưng đảm bảo giờ ngủ kết hợp dinh dưỡng đã tối đa hóa tiết hormone tăng trưởng. Đặc biệt, kiểm tra dị ứng giúp xác định thực phẩm nhạy cảm và chuyển sang thực đơn tránh riêng, đóng góp lớn vào việc phục hồi tốc độ tăng trưởng.\n\n\"Khi cao hơn 180 cm, sự tự tin trong các buổi audition khác hẳn!\" — Bệnh nhân\n\nMột ca vượt giới hạn di truyền và tiến thêm một bước gần với ước mơ.",
      'zh-hant': "從初診時的 145.3 公分、預估 178 公分，如今已突破 180 公分！\n\n在約四年半的治療中，他總共長高了 34.7 公分。光是頭 6 個月就長了 6.7 公分——初期反應迅速——之後每年也維持 7–8 公分。\n\n練習生作息不規律令人擔心，但確保睡眠時間並搭配營養管理，讓生長激素分泌達到最大化。特別是過敏檢查找出了敏感食物，改採量身訂做的迴避飲食，對生長速度的恢復有很大幫助。\n\n\"現在身高超過 180 公分，試鏡時的自信完全不一樣了！\" — 患者\n\n這是一個突破遺傳極限、向夢想更近一步的案例。",
      'zh-hans': "从初诊时的 145.3 厘米、预估 178 厘米，如今已突破 180 厘米！\n\n在约四年半的治疗中，他总共长高了 34.7 厘米。光是头 6 个月就长了 6.7 厘米——初期反应迅速——之后每年也维持 7–8 厘米。\n\n练习生作息不规律令人担心，但确保睡眠时间并搭配营养管理，让生长激素分泌达到最大化。特别是过敏检查找出了敏感食物，改采量身定做的回避饮食，对生长速度的恢复有很大帮助。\n\n\"现在身高超过 180 厘米，试镜时的自信完全不一样了！\" — 患者\n\n这是一个突破遗传极限、向梦想更近一步的案例。",
      ar: "من 145.3 سم عند أول زيارة مع توقّع 178 سم، تجاوز الآن 180 سم!\n\nخلال نحو أربع سنوات ونصف من العلاج نما بمجموع 34.7 سم. وفي الأشهر الستة الأولى وحدها زاد 6.7 سم — استجابة أولية سريعة — ثم واصل بمعدّل 7–8 سم في السنة.\n\nكان جدول المتدرّب غير المنتظم مصدر قلق، لكن تأمين وقت النوم مع العناية الغذائية رفع إفراز هرمون النمو إلى أقصاه. وعلى وجه الخصوص، حدّد فحص الحساسية الأطعمة المُثيرة للحساسية، وكان التحوّل إلى نظام غذائي تجنّبي مخصّص دفعة كبيرة لاستعادة وتيرة النمو.\n\n\"الآن وقد تجاوزت 180 سم، أصبحت ثقتي في اختبارات الأداء مختلفة تماماً!\" — المريض\n\nحالة تخطّت الحدّ الوراثي واقتربت خطوة من الحلم.",
    },
    intakeInfo: {
      desiredHeight: { en: 'Over 180 cm', th: 'มากกว่า 180 ซม.', vi: 'Trên 180 cm', 'zh-hant': '180 公分以上', 'zh-hans': '180 厘米以上', ar: 'أكثر من 180 سم' },
      growthConcerns: {
        en: 'K-pop trainee; growth velocity has slowed recently',
        th: 'เด็กฝึกของค่าย K-pop ช่วงหลังอัตราการโตชะลอ',
        vi: 'Thực tập sinh K-pop; tốc độ tăng trưởng gần đây chậm lại',
        'zh-hant': 'K-pop 練習生；近來生長速度變慢',
        'zh-hans': 'K-pop 练习生；近来生长速度变慢',
        ar: 'متدرّب في مجال الكيه-بوب؛ تباطأت وتيرة نموّه مؤخراً',
      },
    },
    allergyData: {
      danger: localizeAllergy(['카제인','우유','계란 흰자','계란 노른자','염소우유','양우유','에스파게트','미역','잉어','대구','먹도미류','참돔','장어','해덕','퍼츠','강꼬치고기','연어','각시서대속 어류','송어','잠치','가자미류','오렌지','자두','보리','마카로니용 밀','글리아딘','엿기름','귀리','호밀가루','스펠트밀','밀','밀 겨','옥수수','쌀','겨자 씨','소고기','양고기','타조고기','광고기','토끼','사슴고기','멧돼지','아몬드','브라질호두','캐슈 너트','헤이즐넛','땅콩','피스타치오']),
      caution: localizeAllergy(['알파락트알부민','농어','고등어','아귀','가자미류','고동','석류','아마란스','말고기','호두','무우','버섯']),
    },
  },
};
