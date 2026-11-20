import { describe, expect, it } from 'vitest';
import { catalogIdSchema, searchQuerySchema, trackSchema } from '../src';

describe('catalog schemas', () => {
  it('accepts numeric ids only', () => {
    expect(catalogIdSchema.safeParse('168').success).toBe(true);
    expect(catalogIdSchema.safeParse('abc').success).toBe(false);
    expect(catalogIdSchema.safeParse('1; drop').success).toBe(false);
  });

  it('applies search defaults and bounds', () => {
    expect(searchQuerySchema.parse({ q: '  lo-fi ' })).toEqual({
      q: 'lo-fi',
      type: 'all',
      limit: 20,
      offset: 0,
    });
    expect(searchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: 'x', limit: '51' }).success).toBe(false);
    expect(searchQuerySchema.parse({ q: 'x', limit: '5', type: 'albums' }).limit).toBe(5);
  });

  it('requires the stream to go through the API', () => {
    const base = {
      id: '1',
      title: 'Synthetic',
      artist: { id: '2', name: 'Fixture' },
      album: null,
      durationSeconds: 120,
      artworkUrl: null,
      licenseUrl: null,
    };
    expect(trackSchema.safeParse({ ...base, streamPath: '/v1/tracks/1/stream' }).success).toBe(
      true,
    );
    expect(
      trackSchema.safeParse({ ...base, streamPath: 'https://cdn.example/1.mp3' }).success,
    ).toBe(false);
  });
});
