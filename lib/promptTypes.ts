import {
  Star,
  Sword,
  ArticleNyTimes,
  Lightning,
  Pen,
  Eyeglasses,
  IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';

export type PromptTypeId = 'daily' | 'debate' | 'basic' | 'lightning' | 'draw' | 'opinion';

export type PromptTypeConfig = {
  id: PromptTypeId;
  label: string;
  color: string;
  primary: string;
  icon: ComponentType<IconProps>;
};

export const PROMPT_TYPES: Record<PromptTypeId, PromptTypeConfig> = {
  daily:     { id: 'daily',     label: 'The Daily',       color: '#F7D721', primary: '#000000', icon: Star },
  debate:    { id: 'debate',    label: 'Debate',          color: '#EE695A', primary: '#FFFFFF', icon: Sword },
  basic:     { id: 'basic',     label: 'Basic',           color: '#5090E0', primary: '#FFFFFF', icon: ArticleNyTimes },
  lightning: { id: 'lightning', label: 'Lightning Round', color: '#FF973C', primary: '#FFFFFF', icon: Lightning },
  draw:      { id: 'draw',      label: 'Draw',            color: '#8763D7', primary: '#FFFFFF', icon: Pen },
  opinion:   { id: 'opinion',   label: 'Opinion',         color: '#26B870', primary: '#FFFFFF', icon: Eyeglasses },
};

export function getPromptType(id?: string | null): PromptTypeConfig {
  if (id && id in PROMPT_TYPES) return PROMPT_TYPES[id as PromptTypeId];
  return PROMPT_TYPES.daily;
}

export function getInverse(primary: string): string {
  return primary.toUpperCase() === '#FFFFFF' ? '#000000' : '#FFFFFF';
}
