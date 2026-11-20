/** m:ss (or h:mm:ss); "–:––" when unknown, as in T12 "Carregando". */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '–:––';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Spoken form for screen readers: "1 minuto e 24 segundos". */
export function spokenTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const min = m === 1 ? '1 minuto' : `${m} minutos`;
  const sec = r === 1 ? '1 segundo' : `${r} segundos`;
  return m > 0 ? `${min} e ${sec}` : sec;
}
