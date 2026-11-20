import Svg, { Path } from 'react-native-svg';
import { color, layout } from '@/theme';
import { iconPaths, type IconGlyph } from './icon-paths';

/** Base icon names; the "-fill" variants are selected with `filled`. */
export type IconName = Exclude<IconGlyph, `${string}-fill`>;

export interface IconProps {
  name: IconName;
  /** Use the "-fill" variant when Figma has one (active tab, playing, favorited). */
  filled?: boolean;
  tint?: keyof typeof color.icon | 'onAction' | 'live' | 'success';
  size?: number;
}

const tints = {
  ...color.icon,
  onAction: color.text.onAction,
  live: color.signal.live,
  success: color.state.success,
};

export function Icon({
  name,
  filled = false,
  tint = 'default',
  size = layout.iconSize,
}: IconProps) {
  const filledName = `${name}-fill` as IconGlyph;
  const glyph = filled && filledName in iconPaths ? filledName : name;
  const c = tints[tint];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      {iconPaths[glyph].map((p, i) => (
        <Path
          key={i}
          d={p.d}
          fill={p.fill ? c : 'none'}
          stroke={p.stroke ? c : 'none'}
          strokeWidth={p.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
