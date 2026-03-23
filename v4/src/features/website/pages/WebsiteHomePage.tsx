import { useEffect } from 'react';
import { WebsiteLayout } from '../components/WebsiteLayout';
import { HeroSection } from '../components/HeroSection';
import { TrustStats } from '../components/TrustStats';
import { HeightCalculator } from '../components/HeightCalculator';
import { ProgramSlider } from '../components/ProgramSlider';
import { GrowthGuideSlider } from '../components/GrowthGuideSlider';
import { RecipeSlider } from '../components/RecipeSlider';
import { ExerciseSlider } from '../components/ExerciseSlider';
import { CaseSlider } from '../components/CaseSlider';

export default function WebsiteHomePage() {
  useEffect(() => {
    document.title = '연세새봄의원 187 성장클리닉 | 우리 아이 예상키 무료 측정';
  }, []);

  return (
    <WebsiteLayout>
      <HeroSection />
      <TrustStats />
      <HeightCalculator />
      <ProgramSlider />
      <GrowthGuideSlider />
      <RecipeSlider />
      <ExerciseSlider />
      <CaseSlider />
    </WebsiteLayout>
  );
}
