/**
 * Centralized route definitions for InnoPlaybook Platform
 * All navigation paths are defined here — change once, applies everywhere.
 * Next.js automatically prepends basePath from next.config.ts to all routes.
 */

export const ROUTES = {
  // Root
  HOME: '/',

  // Auth
  AUTH: {
    LOGIN:    '/auth/login',
    REGISTER: '/auth/register',
    RESET:    '/auth/reset',
  },

  // Main features
  INITIATIVES:  '/initiatives',
  DASHBOARD:    '/dashboard',
  CANVAS:       '/canvas',
  COMMUNITY:    '/community',
  EXPERTS:      '/experts',
  COHORTS:      '/cohorts',
  PROFILE:      '/profile',

  // Admin
  ADMIN:        '/admin',
  ADMIN_USERS:  '/admin/users',

  // Dynamic — functions that return route strings
  INITIATIVE_WORKSPACE: (id: string) => `/initiatives/${id}`,
} as const;

export type AppRoute = string;
