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
import { MainClipTH, MAINCLIP_DURATION } from "./mainclip/MainClipTH";

// Total: 90 + 150 + 390 + 150 - (3 * 15) = 735 frames ≈ 24.5 seconds
const TOTAL_DURATION = 90 + 150 + 390 + 150 - 3 * 15;

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
      <Composition id="MainClipTH" component={MainClipTH} durationInFrames={MAINCLIP_DURATION} fps={30} width={1920} height={1080} />
    </>
  );
};
