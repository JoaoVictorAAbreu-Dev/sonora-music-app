import { describe, expect, it } from 'vitest';
import figma from '../src/figma-variables.json';
import { color, duration, easing, radius, spacing, typography, withAlpha } from '../src/index';

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

describe('tokens match the Figma snapshot', () => {
  it('colors', () => {
    const aliases: Record<string, string> = { 'action/primaryPressed': 'action/pressed' };
    for (const [name, hex] of Object.entries(figma['Color/Escuro'])) {
      const path = camel(name.replace(/^color\//, ''));
      const [group, key] = (aliases[path] ?? path).split('/') as [string, string];
      const value = (color as unknown as Record<string, Record<string, string>>)[group]?.[key];
      expect(value, name).toBe(hex);
    }
  });

  it('spacing and radius', () => {
    for (const [name, v] of Object.entries(figma.Spacing))
      expect(spacing[name.split('/')[1] as keyof typeof spacing], name).toBe(v);
    for (const [name, v] of Object.entries(figma.Radius))
      expect(radius[name.split('/')[1] as keyof typeof radius], name).toBe(v);
  });

  it('motion', () => {
    for (const [name, v] of Object.entries(figma.Motion)) {
      const [kind, key] = name.split('/') as [string, string];
      if (kind === 'duration') expect(duration[key as keyof typeof duration], name).toBe(v);
      else if (v === 'linear') expect(easing.linear).toEqual([0, 0, 1, 1]);
      else {
        const pts = String(v)
          .match(/[\d.]+/g)!
          .map(Number);
        expect(easing[key as keyof typeof easing], name).toEqual(pts);
      }
    }
  });

  it('typography', () => {
    for (const [name, s] of Object.entries(figma.TextStyles)) {
      const t = typography[camel(name.replace('type/', '')) as keyof typeof typography];
      expect(t, name).toEqual({
        fontFamily: s.family,
        fontWeight: s.weight,
        fontSize: s.size,
        lineHeight: s.lineHeight,
      });
    }
  });

  it('every Figma token is represented', () => {
    expect(Object.keys(figma['Color/Escuro'])).toHaveLength(20);
    expect(Object.keys(spacing)).toHaveLength(Object.keys(figma.Spacing).length);
    expect(Object.keys(radius)).toHaveLength(Object.keys(figma.Radius).length);
    expect(Object.keys(duration)).toHaveLength(7);
  });
});

describe('withAlpha', () => {
  it('appends alpha', () => expect(withAlpha('#25272F', 0.9)).toBe('#25272FE6'));
  it('rejects non-hex', () => expect(() => withAlpha('red', 1)).toThrow());
});
