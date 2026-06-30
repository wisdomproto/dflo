import { Composition } from "remotion";
import { HeightReels } from "./HeightReels";
import { HeightReelsTH } from "./HeightReelsTH";
import { HeightReelsTHPromo } from "./HeightReelsTHPromo";
import { HeightReelsKRPromo } from "./HeightReelsKRPromo";
import { HeightReelsKRMarketing } from "./HeightReelsKRMarketing";
import { CelebReel } from "./CelebReel";
import { SupplementSyncKR, SUPP_SYNC_DURATION } from "./shorts/supplement/SupplementSync";
import { SupplementFaithfulTH, SupplementFootageTH, SUPP_FAITHFUL_TH_DURATION } from "./shorts/supplement/SupplementFaithfulTH";
import { SupplementFaithfulEN, SupplementFootageEN, SUPP_FAITHFUL_EN_DURATION } from "./shorts/supplement/SupplementFaithfulEN";
import {
  ChogyeongTHPreview, ChogyeongTHFootage, ChogyeongTH, CHOGYEONG_TH_DURATION,
  ChogyeongENPreview, ChogyeongENFootage, ChogyeongEN, CHOGYEONG_EN_DURATION,
  ChogyeongVIFootage, ChogyeongVI, CHOGYEONG_VI_DURATION,
  ChogyeongZHFootage, ChogyeongZH, CHOGYEONG_ZH_DURATION,
} from "./shorts/초경";
import { BujakyongENPreview, BujakyongENFootage, BujakyongEN, BUJAKYONG_EN_DURATION, BujakyongTHFootage, BujakyongTH, BUJAKYONG_TH_DURATION } from "./shorts/부작용";
import { MongjeongEN, MONGJEONG_EN_DURATION, MongjeongTH, MONGJEONG_TH_DURATION } from "./shorts/몽정";
import { KicheukjeongEN, KICHEUKJEONG_EN_DURATION, KicheukjeongENFootage } from "./shorts/키측정";
import { SeongjosukEN, SeongjosukENPreview, SeongjosukENFootage, SEONGJOSUK_EN_DURATION, SeongjosukTH, SeongjosukTHFootage, SEONGJOSUK_TH_DURATION } from "./shorts/성조숙음식";
import { CalciumEN, CalciumENPreview, CalciumENFootage, CALCIUM_EN_DURATION, CalciumTH, CalciumTHFootage, CALCIUM_TH_DURATION } from "./shorts/칼슘영양제";
import { FootsizeEN, FootsizeENPreview, FootsizeENFootage, FOOTSIZE_EN_DURATION, FootsizeTH, FootsizeTHPreview, FootsizeTHFootage, FOOTSIZE_TH_DURATION } from "./shorts/발사이즈";
import { FakepubertyEN, FakepubertyENPreview, FakepubertyENFootage, FAKEPUB_EN_DURATION, FakepubertyTH, FakepubertyTHPreview, FakepubertyTHFootage, FAKEPUB_TH_DURATION, FakepubertyKO, FAKEPUB_KO_DURATION } from "./shorts/가짜성조숙증";
import { HeightGenesKO, HEIGHTGENES_KO_DURATION, HeightGenesTH, HEIGHTGENES_TH_DURATION } from "./shorts/키유전80";
import { Timing4KO, TIMING4_KO_DURATION, Timing4TH, TIMING4_TH_DURATION } from "./shorts/성장타이밍4";
import { PlateAgeKO, PLATEAGE_KO_DURATION, PlateAgeTH, PLATEAGE_TH_DURATION } from "./shorts/성장판나이";
import { Gh10KO, GH10_KO_DURATION } from "./shorts/성장호르몬10시";
import { BoneXrayKO, BONEXRAY_KO_DURATION } from "./shorts/뼈나이xray";
import { HeightFormulaKO, HEIGHTFORMULA_KO_DURATION } from "./shorts/예상키공식오차";
import { GrandparentsKO, GRANDPARENTS_KO_DURATION } from "./shorts/격세유전조부모키";
import { PrecociousPlateKO, PRECOCIOUSPLATE_KO_DURATION } from "./shorts/성조숙증성장판";
import { ObesityEarlyKO, OBESITYEARLY_KO_DURATION } from "./shorts/비만일찍멈춤";
import { PubertyOrderKO, PUBERTYORDER_KO_DURATION } from "./shorts/사춘기순서";
import { TestisSignKO, TESTISSIGN_KO_DURATION } from "./shorts/고환크기신호";
import { CortisolKO, CORTISOL_KO_DURATION } from "./shorts/코르티솔키";
import { GrowingPainsKO, GROWINGPAINS_KO_DURATION } from "./shorts/성장통신호";
import { ThyroidKO, THYROID_KO_DURATION } from "./shorts/갑상선성장";
import { AllergyThiefKO, ALLERGYTHIEF_KO_DURATION } from "./shorts/알레르기성장도둑";
import { EdcHormoneKO, EDCHORMONE_KO_DURATION } from "./shorts/환경호르몬성조숙";
import { HeavyMetalKO, HEAVYMETAL_KO_DURATION } from "./shorts/중금속키성장";
import { AdhdMedKO, ADHDMED_KO_DURATION } from "./shorts/adhd약키성장";
import { SteroidKO, STEROID_KO_DURATION } from "./shorts/스테로이드키";
import { CatchupGrowthKO, CATCHUP_KO_DURATION } from "./shorts/따라잡기성장";
import { BreakfastKO, BREAKFAST_KO_DURATION } from "./shorts/아침밥키성장";
import { DietPyramidKO, DIETPYRAMID_KO_DURATION } from "./shorts/식단피라미드";
import { DeepSleep5KO, DEEPSLEEP5_KO_DURATION } from "./shorts/깊은잠5단계";
import { SleepRoutineKO, SLEEPROUTINE_KO_DURATION } from "./shorts/수면루틴";
import { PhoneSleepKO, PHONESLEEP_KO_DURATION } from "./shorts/자기전폰수면";
import { AgeExerciseKO, AGEEXERCISE_KO_DURATION } from "./shorts/나이별운동";
import { ExerciseCompareKO, EXCOMPARE_KO_DURATION } from "./shorts/키크는운동비교";
import { CalciumVitDKO, CALCIUMVITD_KO_DURATION } from "./shorts/칼슘비타민D";
import { HideVeggiesKO, HIDEVEGGIES_KO_DURATION } from "./shorts/채소숨기기7";
import { SugarPlateKO, SUGARPLATE_KO_DURATION } from "./shorts/단음식성장판";
import { PostureKO, POSTURE_KO_DURATION } from "./shorts/자세교정숨은키";
import { BowLegsKO, BOWLEGS_KO_DURATION } from "./shorts/오다리키";
import { ScoliosisKO, SCOLIOSIS_KO_DURATION } from "./shorts/checkchu";
import { Thumb } from "./shorts/_thumbs/Thumb";
import { MainClipTH, MAINCLIP_DURATION } from "./mainclip/MainClipTH";
import { OneCmTH, ONECM_TH_DURATION } from "./shorts/1cm/OneCmTH";
import { PresenterGeneric, calcPresenterMetadata } from "./shorts/_shared/PresenterGeneric";
import { CalcDemoTH, CALC_DEMO_TH_DURATION } from "./ads/CalcDemoTH";
import { CalcDemoKR, CALC_DEMO_KR_DURATION } from "./ads/CalcDemoKR";
import { CaseStoryReel, CASE_STORY_DURATION } from "./casestory/CaseStoryReel";
import { ShortRepurpose, repurposeDuration, repurposeMetadata } from "./repurpose/ShortRepurpose";

// Total: 90 + 150 + 390 + 150 - (3 * 15) = 735 frames ≈ 24.5 seconds
const TOTAL_DURATION = 90 + 150 + 390 + 150 - 3 * 15;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortRepurpose"
        component={ShortRepurpose}
        durationInFrames={repurposeDuration(48.501, 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ videoSrc: "videos/repurpose-src.mp4", videoSec: 48.501, url: "dr187growup.com", outroLine: "우리 아이 예측키\n지금 무료로 측정" }}
        // 영상별 길이 자동: 배치 렌더가 --props 로 넘긴 videoSec 에서 본편+아웃트로 프레임 산출
        calculateMetadata={repurposeMetadata}
      />
      <Composition
        id="HeightReels"
        component={HeightReels}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HeightReelsTH"
        component={HeightReelsTH}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HeightReelsTHPromo"
        component={HeightReelsTHPromo}
        durationInFrames={800}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HeightReelsKRPromo"
        component={HeightReelsKRPromo}
        durationInFrames={800}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HeightReelsKRMarketing"
        component={HeightReelsKRMarketing}
        durationInFrames={720}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CelebReel"
        component={CelebReel}
        durationInFrames={286}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SupplementSyncKR"
        component={SupplementSyncKR}
        durationInFrames={SUPP_SYNC_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SupplementFaithfulTH"
        component={SupplementFaithfulTH}
        durationInFrames={SUPP_FAITHFUL_TH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SupplementFootageTH"
        component={SupplementFootageTH}
        durationInFrames={SUPP_FAITHFUL_TH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SupplementFaithfulEN"
        component={SupplementFaithfulEN}
        durationInFrames={SUPP_FAITHFUL_EN_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SupplementFootageEN"
        component={SupplementFootageEN}
        durationInFrames={SUPP_FAITHFUL_EN_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition id="chogyeong-preview" component={ChogyeongTHPreview} durationInFrames={CHOGYEONG_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-footage" component={ChogyeongTHFootage} durationInFrames={CHOGYEONG_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong" component={ChogyeongTH} durationInFrames={CHOGYEONG_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-en-preview" component={ChogyeongENPreview} durationInFrames={CHOGYEONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-en-footage" component={ChogyeongENFootage} durationInFrames={CHOGYEONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-en" component={ChogyeongEN} durationInFrames={CHOGYEONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-vi-footage" component={ChogyeongVIFootage} durationInFrames={CHOGYEONG_VI_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-vi" component={ChogyeongVI} durationInFrames={CHOGYEONG_VI_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-zh-footage" component={ChogyeongZHFootage} durationInFrames={CHOGYEONG_ZH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="chogyeong-zh" component={ChogyeongZH} durationInFrames={CHOGYEONG_ZH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bujakyong-en-preview" component={BujakyongENPreview} durationInFrames={BUJAKYONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bujakyong-en-footage" component={BujakyongENFootage} durationInFrames={BUJAKYONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bujakyong-en" component={BujakyongEN} durationInFrames={BUJAKYONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bujakyong-th-footage" component={BujakyongTHFootage} durationInFrames={BUJAKYONG_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bujakyong-th" component={BujakyongTH} durationInFrames={BUJAKYONG_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="mongjeong-en" component={MongjeongEN} durationInFrames={MONGJEONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="mongjeong-th" component={MongjeongTH} durationInFrames={MONGJEONG_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="kicheukjeong-en-footage" component={KicheukjeongENFootage} durationInFrames={KICHEUKJEONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="seongjosuk-en-preview" component={SeongjosukENPreview} durationInFrames={SEONGJOSUK_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="seongjosuk-en-footage" component={SeongjosukENFootage} durationInFrames={SEONGJOSUK_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="seongjosuk-en" component={SeongjosukEN} durationInFrames={SEONGJOSUK_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="seongjosuk-th-footage" component={SeongjosukTHFootage} durationInFrames={SEONGJOSUK_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="seongjosuk-th" component={SeongjosukTH} durationInFrames={SEONGJOSUK_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calcium-en-preview" component={CalciumENPreview} durationInFrames={CALCIUM_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calcium-en-footage" component={CalciumENFootage} durationInFrames={CALCIUM_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calcium-en" component={CalciumEN} durationInFrames={CALCIUM_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calcium-th-footage" component={CalciumTHFootage} durationInFrames={CALCIUM_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calcium-th" component={CalciumTH} durationInFrames={CALCIUM_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="footsize-en-preview" component={FootsizeENPreview} durationInFrames={FOOTSIZE_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="footsize-en-footage" component={FootsizeENFootage} durationInFrames={FOOTSIZE_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="footsize-en" component={FootsizeEN} durationInFrames={FOOTSIZE_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="footsize-th-preview" component={FootsizeTHPreview} durationInFrames={FOOTSIZE_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="footsize-th-footage" component={FootsizeTHFootage} durationInFrames={FOOTSIZE_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="footsize-th" component={FootsizeTH} durationInFrames={FOOTSIZE_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-en-preview" component={FakepubertyENPreview} durationInFrames={FAKEPUB_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-en-footage" component={FakepubertyENFootage} durationInFrames={FAKEPUB_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-en" component={FakepubertyEN} durationInFrames={FAKEPUB_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-th-preview" component={FakepubertyTHPreview} durationInFrames={FAKEPUB_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-th-footage" component={FakepubertyTHFootage} durationInFrames={FAKEPUB_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-th" component={FakepubertyTH} durationInFrames={FAKEPUB_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="fakepuberty-ko" component={FakepubertyKO} durationInFrames={FAKEPUB_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="kicheukjeong-en" component={KicheukjeongEN} durationInFrames={KICHEUKJEONG_EN_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="heightgenes-ko" component={HeightGenesKO} durationInFrames={HEIGHTGENES_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="heightgenes-th" component={HeightGenesTH} durationInFrames={HEIGHTGENES_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="timing4-ko" component={Timing4KO} durationInFrames={TIMING4_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="timing4-th" component={Timing4TH} durationInFrames={TIMING4_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="plateage-ko" component={PlateAgeKO} durationInFrames={PLATEAGE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="plateage-th" component={PlateAgeTH} durationInFrames={PLATEAGE_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="gh10-ko" component={Gh10KO} durationInFrames={GH10_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bonexray-ko" component={BoneXrayKO} durationInFrames={BONEXRAY_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="heightformula-ko" component={HeightFormulaKO} durationInFrames={HEIGHTFORMULA_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="grandparents-ko" component={GrandparentsKO} durationInFrames={GRANDPARENTS_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="precociousplate-ko" component={PrecociousPlateKO} durationInFrames={PRECOCIOUSPLATE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="obesityearly-ko" component={ObesityEarlyKO} durationInFrames={OBESITYEARLY_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="pubertyorder-ko" component={PubertyOrderKO} durationInFrames={PUBERTYORDER_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="testissign-ko" component={TestisSignKO} durationInFrames={TESTISSIGN_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="cortisol-ko" component={CortisolKO} durationInFrames={CORTISOL_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="growingpains-ko" component={GrowingPainsKO} durationInFrames={GROWINGPAINS_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="thyroid-ko" component={ThyroidKO} durationInFrames={THYROID_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="allergythief-ko" component={AllergyThiefKO} durationInFrames={ALLERGYTHIEF_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="edchormone-ko" component={EdcHormoneKO} durationInFrames={EDCHORMONE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="heavymetal-ko" component={HeavyMetalKO} durationInFrames={HEAVYMETAL_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="adhdmed-ko" component={AdhdMedKO} durationInFrames={ADHDMED_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="steroid-ko" component={SteroidKO} durationInFrames={STEROID_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="catchup-ko" component={CatchupGrowthKO} durationInFrames={CATCHUP_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="breakfast-ko" component={BreakfastKO} durationInFrames={BREAKFAST_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="dietpyramid-ko" component={DietPyramidKO} durationInFrames={DIETPYRAMID_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="deepsleep5-ko" component={DeepSleep5KO} durationInFrames={DEEPSLEEP5_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="sleeproutine-ko" component={SleepRoutineKO} durationInFrames={SLEEPROUTINE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="phonesleep-ko" component={PhoneSleepKO} durationInFrames={PHONESLEEP_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="ageexercise-ko" component={AgeExerciseKO} durationInFrames={AGEEXERCISE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="excompare-ko" component={ExerciseCompareKO} durationInFrames={EXCOMPARE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calciumvitd-ko" component={CalciumVitDKO} durationInFrames={CALCIUMVITD_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="hideveggies-ko" component={HideVeggiesKO} durationInFrames={HIDEVEGGIES_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="sugarplate-ko" component={SugarPlateKO} durationInFrames={SUGARPLATE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="posture-ko" component={PostureKO} durationInFrames={POSTURE_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="bowlegs-ko" component={BowLegsKO} durationInFrames={BOWLEGS_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="scoliosis-ko" component={ScoliosisKO} durationInFrames={SCOLIOSIS_KO_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="thumb" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ n: 1, lang: "ko" }} />
      <Composition id="MainClipTH" component={MainClipTH} durationInFrames={MAINCLIP_DURATION} fps={30} width={1920} height={1080} />
      <Composition id="onecm-th" component={OneCmTH} durationInFrames={ONECM_TH_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="calc-demo-th" component={CalcDemoTH} durationInFrames={CALC_DEMO_TH_DURATION} fps={30} width={1080} height={1920} defaultProps={{ lang: "th" as const }} />
      <Composition id="calc-demo-vi" component={CalcDemoTH} durationInFrames={CALC_DEMO_TH_DURATION} fps={30} width={1080} height={1920} defaultProps={{ lang: "vi" as const }} />
      <Composition id="calc-demo-en" component={CalcDemoTH} durationInFrames={CALC_DEMO_TH_DURATION} fps={30} width={1080} height={1920} defaultProps={{ lang: "en" as const }} />
      <Composition id="calc-demo-ko" component={CalcDemoKR} durationInFrames={CALC_DEMO_KR_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="case-story-siyun" component={CaseStoryReel} durationInFrames={CASE_STORY_DURATION} fps={30} width={1080} height={1920} />
      <Composition
        id="PresenterGeneric"
        component={PresenterGeneric}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ script: {} as never, timing: [], lang: "ko", slug: "", assets: { videoSrc: "", audio: {} } }}
        calculateMetadata={calcPresenterMetadata}
      />
    </>
  );
};
