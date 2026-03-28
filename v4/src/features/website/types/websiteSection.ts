// Website section types
// Each slide has its own template - a section is a collection of mixed slides

export type SlideTemplate = 'banner' | 'video';

export interface BannerSlide {
  template: 'banner';
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaAction: 'scroll' | 'link';
  ctaTarget: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  childImageUrl?: string;
  bgGradient?: string;
  order: number;
  titleSize?: number;
  titleColor?: string;
  subtitleSize?: number;
  subtitleColor?: string;
  textPositionY?: number; // bottom % (default 12)
  titleShadow?: boolean; // default true
  subtitleShadow?: boolean; // default true
  ctaSize?: 'sm' | 'md' | 'lg';
}

export interface VideoSlide {
  template: 'video';
  id: string;
  videoUrl: string;
  title: string;
  description: string;
  titleColor?: string;
  descriptionColor?: string;
  order: number;
}

export type Slide = BannerSlide | VideoSlide;

export function isBannerSlide(slide: Slide): slide is BannerSlide {
  return slide.template === 'banner';
}

export function isVideoSlide(slide: Slide): slide is VideoSlide {
  return slide.template === 'video';
}

export interface WebsiteSection {
  id: string;
  order_index: number;
  title?: string;
  slides: Slide[];
  created_at?: string;
  updated_at?: string;
}
