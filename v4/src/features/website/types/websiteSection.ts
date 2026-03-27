// Website section types
// Each section = a collection of banner slides
// template field allows different render styles in the future

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaAction: 'scroll' | 'link';
  ctaTarget: string;
  imageUrl?: string;
  childImageUrl?: string;
  bgGradient?: string;
  order: number;
  titleSize?: number;
  titleColor?: string;
  subtitleSize?: number;
  subtitleColor?: string;
}

export interface WebsiteSection {
  id: string;
  order_index: number;
  template: 'banner'; // future: 'video' | 'cards' etc.
  title?: string;
  slides: BannerSlide[];
  created_at?: string;
  updated_at?: string;
}
