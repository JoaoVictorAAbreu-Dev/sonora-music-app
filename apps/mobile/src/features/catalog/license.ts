import type { Track } from '@sonora/shared';

/** "https://creativecommons.org/licenses/by-nc-sa/3.0/" → "Creative Commons BY-NC-SA 3.0". */
export function licenseName(url: string): string {
  const m = /creativecommons\.org\/licenses\/([a-z-]+)\/(\d+(?:\.\d+)?)/i.exec(url);
  return m?.[1] && m[2] ? `Creative Commons ${m[1].toUpperCase()} ${m[2]}` : 'Creative Commons';
}

/** T09 "Nota": the album's license, or null when no track has one. */
export function albumLicenseNote(tracks: Track[]): string | null {
  const names = [
    ...new Set(tracks.flatMap((t) => (t.licenseUrl ? [licenseName(t.licenseUrl)] : []))),
  ];
  if (names.length === 0) return null;
  const label = names.length === 1 ? `Licença ${names[0]}` : 'Licenças Creative Commons variadas';
  return `${label} · ver detalhes em Sobre e licenças`;
}
