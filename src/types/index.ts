export type Gender = 'male' | 'female' | 'unknown';
export type CalendarType = 'solar' | 'lunar';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  birthDate?: string;
  deathYear?: string;
  deathDate?: string;
  birthCalendarType?: CalendarType;
  deathCalendarType?: CalendarType;
  title?: string;
  generation: number;
  spouseIds: string[];
  childrenIds: string[];
  parentIds: string[];
  collapsed: boolean;
  parentCollapsed?: boolean;
  bio?: string;
  avatarImageId?: string;
  galleryImageIds?: string[];
}

export type RelationType = 'father' | 'mother' | 'son' | 'daughter' | 'husband' | 'wife';

export interface LayoutNode {
  id: string;
  spouseIds: string[];
  generation: number;
  x: number;
  y: number;
  childrenUnitIds: string[];
  collapsed: boolean;
}

export interface ImageMeta {
  id: string;
  personId: string;
  format: string;
  kind: 'avatar' | 'gallery';
}
