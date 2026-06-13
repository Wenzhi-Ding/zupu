export type Gender = 'male' | 'female' | 'unknown';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  deathYear?: string;
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
