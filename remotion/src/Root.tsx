import { Composition } from "remotion";
import { HeightReels } from "./HeightReels";
import { HeightReelsTH } from "./HeightReelsTH";
import { HeightReelsTHPromo } from "./HeightReelsTHPromo";
import { HeightReelsKRPromo } from "./HeightReelsKRPromo";
import { HeightReelsKRMarketing } from "./HeightReelsKRMarketing";
import { CelebReel } from "./CelebReel";
import { SupplementSyncKR, SUPP_SYNC_DURATION } from "./shorts/supplement/SupplementSync";
import { SupplementFaithfulTH, SupplementFootageTH, SUPP_FAITHFUL_TH_DURATION } from "./shorts/supplement/SupplementFaithfulTH";
import {
  ChogyeongTHPreview, ChogyeongTHFootage, ChogyeongTH, CHOGYEONG_TH_DURATION,
  ChogyeongENPreview, ChogyeongENFootage, ChogyeongEN, CHOGYEONG_EN_DURATION,
  ChogyeongVIFootage, ChogyeongVI, CHOGYEONG_VI_DURATION,
  ChogyeongZHFootage, ChogyeongZH, CHOGYEONG_ZH_DURATION,
} from "./shorts/초경";
import { BujakyongENPreview, BujakyongENFootage, BujakyongEN, BUJAKYONG_EN_DURATION, BujakyongTHFootage, BujakyongTH, BUJAKYONG_TH_DURATION } from "./shorts/부작용";
import { MongjeongEN, MONGJEONG_EN_DURATION, MongjeongTH, MONGJEONG_TH_DURATION } from "./shorts/몽정";

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
    </>
  );
};
