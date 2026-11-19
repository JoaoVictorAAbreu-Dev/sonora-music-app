/**
 * Sonora design tokens (dark mode, "Escuro").
 * Source of truth: Figma variables, snapshotted in ./figma-variables.json.
 * The app must never hard-code colors, spacing, radii or durations — import them from here.
 */

export const color = {
  bg: { base: '#1B1D23', raised: '#25272F', overlay: '#363943' },
  text: {
    primary: '#FFFBEA',
    secondary: '#ABA89E',
    tertiary: '#9E9A93',
    highlight: '#EFE7BA',
    onAction: '#1B1D23',
  },
  action: { primary: '#F5891F', pressed: '#D9730F' },
  signal: { live: '#63C8D1' },
  icon: { default: '#FFFBEA', muted: '#ABA89E', action: '#F5891F' },
  border: { control: '#8D8983', hairline: '#363943' },
  focus: { ring: '#FFFFFF' },
  state: { error: '#F0657A', success: '#34D399', warning: '#F0D576' },
  /** Pure black used only as a shadow color (glass/regular and elevation level 2). */
  shadow: '#000000',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 } as const;

export const radius = { sm: 8, md: 14, lg: 22, xl: 28, full: 999 } as const;

export const duration = {
  instant: 100,
  micro: 150,
  standard: 240,
  screen: 320,
  complex: 440,
  loop: 360,
  skeleton: 1200,
} as const;

/** Opacity of disabled controls (Figma: Desabilitado = 40%). */
export const opacity = { disabled: 0.4 } as const;

/** Cubic-bezier control points [x1, y1, x2, y2]; `linear` is the identity curve. */
export const easing = {
  entrance: [0.22, 1, 0.36, 1],
  standard: [0.4, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type FontWeight = '400' | '500' | '600';
export interface TextStyle {
  fontFamily: string;
  fontWeight: FontWeight;
  fontSize: number;
  lineHeight: number;
}

/** Inter at all sizes; scales with Dynamic Type (no fixed text heights). */
export const typography = {
  display: { fontFamily: 'Inter', fontWeight: '600', fontSize: 28, lineHeight: 34 },
  title: { fontFamily: 'Inter', fontWeight: '600', fontSize: 22, lineHeight: 28 },
  body: { fontFamily: 'Inter', fontWeight: '400', fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: 'Inter', fontWeight: '600', fontSize: 17, lineHeight: 24 },
  caption: { fontFamily: 'Inter', fontWeight: '400', fontSize: 14, lineHeight: 20 },
  label: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

/** Elevation levels from Figma "05 Documentação". Glass (level 3) only on the controls layer. */
export const elevation = {
  overlay: { shadowColor: color.shadow, offsetY: 8, blur: 24, opacity: 0.5 },
  glass: {
    blur: 32,
    /** Tint opacity of the glass surface over bg.raised ("90% + desfoque 32"). */
    tintOpacity: 0.9,
    shadow: { shadowColor: color.shadow, offsetY: 8, blur: 32, opacity: 0.45 },
    highlight: { color: '#FFFAEB', offsetY: 1, opacity: 0.1 },
  },
} as const;

/** Layout constants from Figma "05 Documentação". */
export const layout = {
  screenMargin: spacing.lg,
  minTouchTarget: 44,
  tabBarHeight: 64,
  listRowHeight: 64,
  chipHeight: 36,
  /** Gap between a tab icon and its label ("Barra de abas" component). */
  iconLabelGap: 2,
  /** Component heights from Figma "03 Componentes" (minimums; they grow with Dynamic Type). */
  buttonHeight: 48,
  socialButtonHeight: 52,
  fieldHeight: 56,
  switchWidth: 52,
  switchHeight: 30,
  switchKnob: 22,
  /** Border widths: controls at rest 1.5, focus/error rings 2. */
  borderControl: 1.5,
  borderEmphasis: 2,
  iconSize: 24,
  brandIconSize: 20,
  focusRingWidth: 2,
  maxFontScale: 2,
} as const;

/**
 * Motion patterns from Figma "07 Protótipo" / "09 Motion" built on the duration tokens.
 * The shake (PB3a–c) moves the form −8 → +8 → 0 px, 60 ms per step.
 */
export const motionPattern = {
  shake: { distance: spacing.sm, stepMs: 60 },
  press: duration.instant,
  focus: duration.micro,
} as const;

/**
 * Sign-in button colors mandated by the providers' brand guidelines (Figma "Botão social").
 * Not part of the Sonora palette; use only for the Google and Apple buttons.
 */
export const brand = {
  google: { background: '#131314', pressed: '#1F1F21', border: '#8E918F', text: '#E3E3E3' },
  apple: { background: '#000000', pressed: '#1A1A1A', border: '#FFFFFF', text: '#FFFFFF' },
} as const;

/** "Reduce Motion": replace movement with a short fade of this duration. */
export const reducedMotionFade = duration.instant;

export const tokens = {
  color,
  brand,
  opacity,
  motionPattern,
  spacing,
  radius,
  duration,
  easing,
  typography,
  elevation,
  layout,
} as const;
export type Tokens = typeof tokens;

/** Appends an alpha channel to a #RRGGBB token. */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Expected #RRGGBB, got ${hex}`);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex}${a}`;
}
