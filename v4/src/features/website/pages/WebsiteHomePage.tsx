import { useEffect, useRef, useState } from 'react';
import { WebsiteLayout } from '../components/WebsiteLayout';
import { HeroBanner } from '../components/HeroBanner';
import { GrowthGuideSlider } from '../components/GrowthGuideSlider';
import { RecipeSlider } from '../components/RecipeSlider';
import { ExerciseSlider } from '../components/ExerciseSlider';
import { CaseSlider } from '../components/CaseSlider';
import { SectionSlider } from '../components/SectionSlider';
import { fetchSections } from '../services/websiteSectionService';

interface SectionItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

interface WebsiteSection {
  id: string;
  order: number;
  sectionType: 'growthGuide' | 'recipe' | 'exercise' | 'case';
  title: string;
  subtitle?: string;
  items?: SectionItem[];
  bgColor?: string;
  titleColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function WebsiteHomePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<WebsiteSection[]>([]);

  useEffect(() => {
    document.title = '연세새봄의원 187 성장클리닉 | 우리 아이 예상키 무료 측정';
  }, []);

  // Default sections
  const defaultSections: WebsiteSection[] = [
    {
      id: 'section-1',
      order: 0,
      sectionType: 'growthGuide',
      title: '📋 전문의가 알려주는 키 성장 가이드',
      subtitle: '성장을 방해하는 요소들을 제거하세요',
      items: [
        {
          id: 'guide-1',
          emoji: '📊',
          title: '성장 도표 읽는 법',
          description: '우리 아이 성장, 성장 도표로 확인하세요'
        },
        {
          id: 'guide-2',
          emoji: '⏰',
          title: '성장의 골든타임',
          description: '놓치면 안 되는 4가지 시기'
        },
        {
          id: 'guide-3',
          emoji: '📏',
          title: '최종 키 예측하기',
          description: '우리 아이, 얼마나 클까?'
        }
      ]
    },
    {
      id: 'section-2',
      order: 1,
      sectionType: 'recipe',
      title: '🥗 키 쑥쑥 영양 만점 식단',
      subtitle: '성장에 필요한 영양소를 모두 담았어요',
      items: [
        {
          id: 'recipe-1',
          emoji: '🧀',
          title: '치즈 듬뿍 닭가슴살 까르보나라 볶음밥',
          description: '단백질과 칼슘이 풍부하여 뼈 성장과 근육 발달을 동시에 돕습니다'
        },
        {
          id: 'recipe-2',
          emoji: '🐟',
          title: '달콤 바삭 연어 스틱',
          description: '오메가-3 지방산과 비타민 D가 풍부한 성장 음식'
        },
        {
          id: 'recipe-3',
          emoji: '🌈',
          title: '무지개 칼슘 스무디 볼',
          description: '칼슘, 비타민 C, 식이섬유가 풍부한 과일과 요거트의 조합'
        }
      ]
    }
  ];

  // Load sections from admin
  useEffect(() => {
    fetchSections()
      .then((data) => {
        if (data && data.length > 0) {
          setSections(data);
        } else {
          // Use default sections if none in database
          setSections(defaultSections);
        }
      })
      .catch(() => {
        // Fallback to default sections if load fails
        setSections(defaultSections);
      });
  }, []);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    let isScrolling = false;

    const handleWheel = (e: WheelEvent) => {
      if (isScrolling) return;

      const delta = e.deltaY;
      if (Math.abs(delta) < 10) return;

      isScrolling = true;
      const vh = window.innerHeight;
      const next = Math.round((main.scrollTop + (delta > 0 ? vh : -vh)) / vh) * vh;

      main.scrollTo({
        top: next,
        behavior: 'smooth'
      });

      setTimeout(() => {
        isScrolling = false;
      }, 800);

      e.preventDefault();
    };

    main.addEventListener('wheel', handleWheel, { passive: false });
    return () => main.removeEventListener('wheel', handleWheel);
  }, []);

  const sectionClass = "min-h-dvh w-full flex flex-col justify-center items-center";
  const snapStyle = {
    scrollSnapAlign: 'start' as const,
    scrollSnapStop: 'always' as const
  };

  return (
    <WebsiteLayout>
      {/* Section 1: HeroBanner */}
      <div className={sectionClass} style={snapStyle}>
        <div className="w-full h-full flex flex-col justify-center items-center">
          <HeroBanner />
        </div>
      </div>

      {/* Sections 2-5: Dynamic sections from admin */}
      {sections.length > 0 ? (
        sections.map((section) => (
          <div key={section.id} className={sectionClass} style={snapStyle}>
            <SectionSlider items={section.items || []} />
          </div>
        ))
      ) : (
        <>
          {/* Fallback: Default sections if admin sections not configured */}
          <div className={sectionClass} style={snapStyle}>
            <div className="w-full h-full flex flex-col justify-center items-center">
              <GrowthGuideSlider />
            </div>
          </div>
          <div className={sectionClass} style={snapStyle}>
            <div className="w-full h-full flex flex-col justify-center items-center">
              <RecipeSlider />
            </div>
          </div>
          <div className={sectionClass} style={snapStyle}>
            <div className="w-full h-full flex flex-col justify-center items-center">
              <ExerciseSlider />
            </div>
          </div>
          <div className={sectionClass} style={snapStyle}>
            <div className="w-full h-full flex flex-col justify-center items-center">
              <CaseSlider />
            </div>
          </div>
        </>
      )}
    </WebsiteLayout>
  );
}
