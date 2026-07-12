export type ThemeName = 'parisDusk' | 'memory' | 'forest';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  primarySoft: string;
  accent: string;
  map: string;
  mapLine: string;
  water: string;
  border: string;
  fontFamily: string;
};

export const themes: Record<ThemeName, ThemeColors> = {
  parisDusk: {
    background: '#F8F4EF',
    surface: '#FFFDF9',
    surfaceRaised: '#FFFFFF',
    text: '#3D3A39',
    textMuted: '#807A75',
    primary: '#E79BAA',
    secondary: '#AFC6E9',
    primarySoft: '#F7E1E5',
    accent: '#F4C98B',
    map: '#F7F0E7',
    mapLine: '#FDFBF7',
    water: '#BFD7E8',
    border: '#E9D9DC',
    fontFamily: 'serif',
  },
  memory: {
    background: '#EECDBA',
    surface: '#F8E5CD',
    surfaceRaised: '#FFF4E3',
    text: '#52372E',
    textMuted: '#876458',
    primary: '#A94F3D',
    secondary: '#9FBDB8',
    primarySoft: '#DCA692',
    accent: '#65785E',
    map: '#BFC8A8',
    mapLine: '#F2D9C2',
    water: '#9FBDB8',
    border: '#C98D77',
    fontFamily: 'sans-serif',
  },
  forest: {
    background: '#BFD1BB',
    surface: '#DDE6C9',
    surfaceRaised: '#F2F1D7',
    text: '#1F3B31',
    textMuted: '#526B5F',
    primary: '#285D49',
    secondary: '#79AEB1',
    primarySoft: '#8EB69A',
    accent: '#C96542',
    map: '#91AF92',
    mapLine: '#DDE6C9',
    water: '#79AEB1',
    border: '#74977F',
    fontFamily: 'sans-serif',
  },
};

// Default palette for styles that do not need to react to a live theme change.
export const colors = themes.parisDusk;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
  round: 999,
} as const;

export const shadows = {
  light: { elevation: 2, shadowColor: '#B98D9B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
  medium: { elevation: 5, shadowColor: '#A77D8B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 12 },
  large: { elevation: 8, shadowColor: '#8F6977', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 38 },
  title: { fontSize: 24, lineHeight: 31 },
  headline: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 14, lineHeight: 21 },
  caption: { fontSize: 12, lineHeight: 17 },
} as const;
