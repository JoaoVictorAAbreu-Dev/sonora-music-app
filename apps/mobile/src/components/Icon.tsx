import Svg, { Path } from 'react-native-svg';
import { color } from '@/theme';

/** Path data exported from Figma page "02 Ícones" (24×24, stroke 2, round caps/joins). */
const paths = {
  home: [
    'M4 10.6L12 4L20 10.6V19C20 19.2652 19.8946 19.5196 19.7071 19.7071C19.5196 19.8946 19.2652 20 19 20H14.8V14.6H9.2V20H5C4.73478 20 4.48043 19.8946 4.29289 19.7071C4.10536 19.5196 4 19.2652 4 19V10.6Z',
  ],
  search: [
    'M10.5 17C14.0899 17 17 14.0899 17 10.5C17 6.91015 14.0899 4 10.5 4C6.91015 4 4 6.91015 4 10.5C4 14.0899 6.91015 17 10.5 17Z',
    'M15.4 15.4L20 20',
  ],
  library: [
    'M6.6 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H6.6C7.15228 20 7.6 19.5523 7.6 19V5C7.6 4.44772 7.15228 4 6.6 4Z',
    'M12.6 4H11C10.4477 4 10 4.44772 10 5V19C10 19.5523 10.4477 20 11 20H12.6C13.1523 20 13.6 19.5523 13.6 19V5C13.6 4.44772 13.1523 4 12.6 4Z',
    'M14.8 7L18.2 6.1L21.2 18L17.8 18.9L14.8 7Z',
  ],
} as const;

/** Stroke width of the filled variant, per Figma (search-fill uses a heavier stroke). */
const filledStroke: Partial<Record<IconName, number>> = { search: 2.8 };

export type IconName = keyof typeof paths;

export interface IconProps {
  name: IconName;
  /** The "-fill" variant used for the active tab. */
  filled?: boolean;
  tint?: keyof typeof color.icon;
  size?: number;
}

export function Icon({ name, filled = false, tint = 'default', size = 24 }: IconProps) {
  const c = color.icon[tint];
  const strokeWidth = filled ? (filledStroke[name] ?? 2) : 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      {paths[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          // The second search path is the handle: a line, never filled.
          fill={filled && !(name === 'search' && i === 1) ? c : 'none'}
          stroke={c}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
