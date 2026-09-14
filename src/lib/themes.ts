export type AppearanceMode = 'light' | 'dark' | 'auto';

export interface StudioTheme {
  id: string;
  name: string;
  bg: string;
  bgElevated: string;
  bgCard: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentGlow: string;
  accentSoft: string;
  accentText: string;
  isDark: boolean;
}

export const THEMES: Record<string, StudioTheme> = {
  'onyx-booth': {
    id: 'onyx-booth',
    name: 'Onyx Booth',
    bg: '#0a0a0b',
    bgElevated: '#131316',
    bgCard: '#1a1a1f',
    border: '#27272a',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    textFaint: '#52525b',
    accent: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.15)',
    accentSoft: 'rgba(6, 182, 212, 0.1)',
    accentText: '#22d3ee',
    isDark: true,
  },
  'studio-crimson': {
    id: 'studio-crimson',
    name: 'Studio Crimson',
    bg: '#0c0a0a',
    bgElevated: '#1a1313',
    bgCard: '#211a1a',
    border: '#3a2a2a',
    text: '#f5f0f0',
    textMuted: '#a89090',
    textFaint: '#665050',
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.15)',
    accentSoft: 'rgba(239, 68, 68, 0.1)',
    accentText: '#f87171',
    isDark: true,
  },
  'analog-tape': {
    id: 'analog-tape',
    name: 'Analog Tape',
    bg: '#1a140e',
    bgElevated: '#241d14',
    bgCard: '#2e2519',
    border: '#3d3324',
    text: '#f5ead8',
    textMuted: '#b8a886',
    textFaint: '#6b5d42',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.15)',
    accentSoft: 'rgba(245, 158, 11, 0.1)',
    accentText: '#fbbf24',
    isDark: true,
  },
  'ultraviolet-drift': {
    id: 'ultraviolet-drift',
    name: 'Ultraviolet Drift',
    bg: '#0f0a1a',
    bgElevated: '#18112a',
    bgCard: '#211834',
    border: '#2e2344',
    text: '#f0eaf5',
    textMuted: '#a896c0',
    textFaint: '#5d4d7a',
    accent: '#a78bfa',
    accentGlow: 'rgba(167, 139, 250, 0.15)',
    accentSoft: 'rgba(167, 139, 250, 0.1)',
    accentText: '#c4b5fd',
    isDark: true,
  },
  'smoke-steel': {
    id: 'smoke-steel',
    name: 'Smoke & Steel',
    bg: '#181a1d',
    bgElevated: '#222528',
    bgCard: '#2a2d31',
    border: '#3a3d42',
    text: '#ffffff',
    textMuted: '#9ca3af',
    textFaint: '#565d66',
    accent: '#e5e7eb',
    accentGlow: 'rgba(229, 231, 235, 0.1)',
    accentSoft: 'rgba(229, 231, 235, 0.08)',
    accentText: '#f3f4f6',
    isDark: true,
  },
  light: {
    id: 'light',
    name: 'Daylight',
    bg: '#fafafa',
    bgElevated: '#ffffff',
    bgCard: '#f4f4f5',
    border: '#e4e4e7',
    text: '#18181b',
    textMuted: '#71717a',
    textFaint: '#a1a1aa',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.1)',
    accentSoft: 'rgba(16, 185, 129, 0.08)',
    accentText: '#059669',
    isDark: false,
  },
};

export function resolveTheme(appearance: AppearanceMode, themeId: string): StudioTheme {
  if (appearance === 'light') return THEMES.light;
  if (appearance === 'dark') return THEMES[themeId] ?? THEMES['onyx-booth'];
  // auto: check time of day
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 19) return THEMES.light;
  return THEMES[themeId] ?? THEMES['onyx-booth'];
}

export const THEME_ORDER = ['onyx-booth', 'studio-crimson', 'analog-tape', 'ultraviolet-drift', 'smoke-steel'];
