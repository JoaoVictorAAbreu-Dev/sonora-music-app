/** Base URL of the Sonora API. Set EXPO_PUBLIC_API_URL in apps/mobile/.env (see .env.example). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
