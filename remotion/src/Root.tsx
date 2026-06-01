import { Composition } from "remotion";
import { HeightReels } from "./HeightReels";
import { HeightReelsTH } from "./HeightReelsTH";
import { HeightReelsTHPromo } from "./HeightReelsTHPromo";
import { HeightReelsKRPromo } from "./HeightReelsKRPromo";
import { HeightReelsKRMarketing } from "./HeightReelsKRMarketing";

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
        durationInFrames={1015}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
