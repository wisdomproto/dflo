# 해외 환자 결제 연동 — 리서치 & 결정 (2026-07-21)

해외 환자(🇦🇺🇸🇬🇺🇸 + 화교 + 🇹🇭🇻🇳🇮🇩🇲🇾) **상담료(소액)·예약금(deposit)** 을 받기 위한 결제 연동 조사와 결정. 다른 컴퓨터에서 이어서 진행하기 위한 인수인계 문서.

## 배경
- 구글 검색 노출이 시작되며 여러 나라에서 문의 유입(GA4: SG·US·AU·TW·화교 등). 소액 상담료·예약금을 즉시 받을 수단 필요.
- 수취 주체 = **한국 병원 사업자** (연세새봄의원 / 187 성장클리닉).

## 핵심 제약
- **Stripe 탈락**: 한국 사업자로는 Stripe **판매자(가맹) 계정 개설 불가** (지원 46개국에 한국 없음 — 2026 기준 확인). Stripe 는 한국 "결제수단 수용"만 지원할 뿐 한국 머천트 온보딩은 안 됨.
- 소액·저볼륨·메신저(LINE/카톡/WhatsApp) 퍼널 → **결제 링크를 채팅에 붙여넣는 방식**이 최적. 사이트 결제창 통합은 후순위.

## 검토한 솔루션
| 솔루션 | 역할 | 커버 | 한국 사업자 | 온보딩 |
|---|---|---|---|---|
| **PayPal** | 결제사 | 해외/국내 무관 **국제 카드 + PayPal**(게스트 카드결제로 계정 없이 카드 가능) | ✅ | **셀프·즉시** |
| **Antom (Ant International) / 2C2P** | 글로벌 애그리게이터 | 카드 + **카카오/네이버페이·토스페이·삼성페이** + 화교 Alipay/WeChat + 동남아(**PromptPay·TrueMoney·ZaloPay·GoPay·OVO·DANA·GrabPay·GCash**) — 300+ 수단/200+ 국가, 노코드 **결제 링크**/호스티드 체크아웃/API | ✅ (KR 지원) | **영업+KYB 계약**(며칠~몇 주) |
| **Eximbay** | 한국 크로스보더 PG | 해외카드 + 화교 Alipay/WeChat + SEA 로컬 **일부**(Alipay+ 경유 TrueMoney/DANA/Touch'n Go). ⚠️ **태국 PromptPay·베트남 MoMo 미확인** | ✅ | 심사 |
| **토스페이먼츠** | 국내 PG | 국내 카드·카카오/네이버페이 + 해외카드 + Alipay+. 다통화 약함 | ✅ | 심사(국내 익숙) |
| dLocal / PayerMax / Coda | 글로벌 애그리게이터 | 신흥국·SEA 강함. Coda 는 게임·디지털재화 위주(의료 부적합) | 검토 필요 | 영업주도 |

- 애그리게이터(Antom/2C2P/dLocal/Adyen)는 전부 **셀프가입 아님 = Contact sales → KYB(사업자 서류) 심사 → 계약 → 연동**. 수백 개 로컬수단·규제를 대신 처리하는 acquirer라 표준 절차.

## 결정
1. **당장(오늘~이번 주) 브릿지 = PayPal**
   - 셀프가입·즉시. AU/SG 카드결제 오늘 가능(게스트 카드결제 = 계정 없이 카드).
   - **상담료(고정·반복)** → PayPal.Me / 고정 Payment Link. **예약금(환자별·기록)** → Invoice(환자명·차트 메모로 대사).
   - 단점: 소액 수수료 높음(~4.4%+고정+FX), 동남아 로컬수단 미커버(카드 있는 사람만).
2. **본진(제대로) = Antom(2C2P)**
   - **PayPal 과 같은 "링크 붙여넣기" 방식인데 결제수단이 전부**(카드+국내페이+화교+동남아 로컬 PromptPay 포함). Eximbay 가 빠뜨린 PromptPay·ZaloPay 를 커버 → SEA 우위.
   - 국내 환자 온라인 결제까지 한 통합으로 가능(카카오/네이버페이 포함).
3. **토스페이먼츠**: 지금 보류. **국내 온라인 결제 볼륨이 커지면** 국내 요율이 애그리게이터보다 쌀 수 있어 "국내=토스 / 해외=Antom" 2트랙 재검토.
4. **Eximbay**: 1픽 아님(Antom 이 상위호환). 한국 정산 친숙하니 **견적 비교용**만.

## 다음 할 일 (TODO)
- [ ] **PayPal 비즈니스 계정** 생성 + 한국 은행계좌 연결 + **게스트 카드결제 ON**(Settings → Payment preferences) + 첫 링크/인보이스 생성. 통화는 **USD** 표기 권장.
- [ ] 예약금 정책 확정: **치료비 차감 여부 + 취소/환불 조건**(예: 48h 전 취소 시 환불) → 링크 문구에 명시.
- [ ] **Antom/2C2P "Contact sales" 문의** 접수(우리 상황: 한국 병원·소액 상담료/예약금·TH/VN/ID/MY/AU/SG·예상 볼륨). KYB 서류(사업자등록증·대표자·정산계좌·업종) 준비.
- [ ] 견적 확인 포인트: **의료 서비스 가맹 가능? / 국내 KRW 요율 / 카카오·네이버페이 활성 조건 / 정산주기 / 베트남 MoMo 지원?**
- [ ] (나중) 사이트 임베드: `/report`·상담 페이지에 PayPal 버튼 또는 Antom 호스티드/SDK.

## PayPal 메시지 템플릿 (영어 — 남성 의사 격식 톤)
**상담료:**
> Hello [Name], thank you for your interest in **187 Growth Clinic (Yonsei Saebom, Seoul)**. To confirm your online consultation, please complete the consultation fee of **USD [__]** via the secure link below. You can pay by **credit/debit card or PayPal — no PayPal account needed**. 👉 [link] Once payment is confirmed, we'll arrange your consultation schedule. Thank you.

**예약금:**
> Hello [Name], to reserve your treatment slot at **187 Growth Clinic**, a deposit of **USD [__]** is required. 👉 [invoice link] ✅ This deposit is **applied to your treatment cost**. ↩️ Cancellation/refund: [policy]. Pay by card or PayPal — no account needed. Thank you.

→ 태국어·중국어(번체/간체) 버전은 발행 시 남성 의사 격식 톤으로 번역(태국어 `ครับ/ผม`).

## 참고 링크
- Stripe 지원국(한국 미포함): https://dodopayments.com/blogs/stripe-supported-countries-alternatives , https://stripe.com/global
- Antom 결제수단(PromptPay·TrueMoney·ZaloPay 등): https://www.antom.com/payment-methods
- Antom 결제 링크 가이드(예약금 예시): https://knowledge.antom.com/payment-link-guide-for-merchants
- Antom NAVER Pay / Kakao Pay: https://docs.antom.com/ac/antomop/naverpay , https://docs.antom.com/ac/antomop/kakaopay
- 2C2P 개발자 문서: https://developer.2c2p.com/docs/general
- Eximbay APM: https://www.eximbay.com/homepage/new/en/dist/service/service-online-apm.do
