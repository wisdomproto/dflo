// Website section types - for managing homepage sections
export interface WebsiteSection {
  id: string;
  order: number; // 0 = Section 1, 1 = Section 2, etc.
  sectionType: 'growthGuide' | 'recipe' | 'exercise' | 'case'; // section content type
  title: string; // section header 
  subtitle?: string; // optional section subheader
  
  // Cards/content
  items?: SectionItem[];
  
  // Styling
  bgColor?: string;
  titleColor?: string;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface SectionItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}
