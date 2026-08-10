import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || process.env.NEXT_PUBLIC_NEON_AUTH_URL || 'https://auth.neon.tech',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || 'default-neon-auth-cookie-secret-healthpredict-32chars',
  },
});
