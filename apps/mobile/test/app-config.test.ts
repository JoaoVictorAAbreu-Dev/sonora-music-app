import appJson from '../app.json';
import { color } from '@/theme';

// app.json cannot import TypeScript, so guard its hard-coded colors against token drift.
describe('app.json', () => {
  it('uses bg.base for native backgrounds', () => {
    const { expo } = appJson;
    expect(expo.backgroundColor).toBe(color.bg.base);
    expect(expo.android.adaptiveIcon.backgroundColor).toBe(color.bg.base);
    const splash = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect((splash as [string, { backgroundColor: string }])[1].backgroundColor).toBe(
      color.bg.base,
    );
  });

  it('is dark only', () => expect(appJson.expo.userInterfaceStyle).toBe('dark'));

  it('keeps audio playing in the background on iOS', () => {
    expect(appJson.expo.ios.infoPlist.UIBackgroundModes).toContain('audio');
  });
});
