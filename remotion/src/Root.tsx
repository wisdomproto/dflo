import { Composition } from "remotion";
import { HeightReels } from "./HeightReels";
import { HeightReelsTH } from "./HeightReelsTH";
import { HeightReelsTHPromo } from "./HeightReelsTHPromo";
import { HeightReelsKRPromo } from "./HeightReelsKRPromo";
import { HeightReelsKRMarketing } from "./HeightReelsKRMarketing";
import { CelebReel } from "./CelebReel";
import { SupplementSyncKR, SUPP_SYNC_DURATION } from "./shorts/supplement/SupplementSync";
import { SupplementFaithfulTH, SupplementFootageTH, SUPP_FAITHFUL_TH_DURATION } from "./shorts/supplement/SupplementFaithfulTH";
import { MenarcheTHPreview, MenarcheFootageTH, MenarcheTH, MENARCHE_TH_DURATION } from "./shorts/초경";

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
        id="chogyeong-preview"
        component={MenarcheTHPreview}
        durationInFrames={MENARCHE_TH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="chogyeong-footage"
        component={MenarcheFootageTH}
        durationInFrames={MENARCHE_TH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="chogyeong"
        component={MenarcheTH}
        durationInFrames={MENARCHE_TH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
