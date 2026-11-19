import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import * as glass from 'expo-glass-effect';
import { GlassSurface } from '@/components/GlassSurface';
import { color } from '@/theme';

jest.mock('expo-glass-effect', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: (props: object) => <View {...props} testID="native-glass" />,
    isLiquidGlassAvailable: jest.fn(() => false),
    isGlassEffectAPIAvailable: jest.fn(() => true),
  };
});

const available = glass.isLiquidGlassAvailable as jest.Mock;

describe('GlassSurface', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders the solid fallback when Liquid Glass is unavailable', async () => {
    available.mockReturnValue(false);
    await render(<GlassSurface testID="surface" />);
    await waitFor(() =>
      expect(StyleSheet.flatten(screen.getByTestId('surface').props.style).backgroundColor).toBe(
        color.bg.base,
      ),
    );
    expect(screen.queryByTestId('native-glass')).toBeNull();
  });

  it('renders native glass when available', async () => {
    available.mockReturnValue(true);
    await render(<GlassSurface testID="surface" />);
    expect(await screen.findByTestId('native-glass')).toBeTruthy();
  });

  it('falls back to solid when Reduce Transparency is on', async () => {
    available.mockReturnValue(true);
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);
    await render(<GlassSurface testID="surface" />);
    await waitFor(() => expect(screen.queryByTestId('native-glass')).toBeNull());
    expect(StyleSheet.flatten(screen.getByTestId('surface').props.style).backgroundColor).toBe(
      color.bg.base,
    );
  });
});
