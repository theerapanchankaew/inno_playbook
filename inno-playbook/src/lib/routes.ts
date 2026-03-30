/**
 * Centralized route definitions for InnoPlaybook Platform
 * All navigation paths are defined here — change once, applies everywhere.
 *
 * ⚠️  Do NOT include basePath here.
 *     Next.js automatically prepends basePath (from next.config.ts) to every
 *     <Link href>, router.push(), and router.replace() call at build time.
 *
 * Deployment examples:
 *   Local dev             → /initiatives
 *   GitHub Pages          → /inno_playbook/initiatives        (basePath auto-added)
 *   mascipattadon.site    → /innovation_platform/initiatives  (basePath auto-added)
 *
 * To change basePath: edit BASE_PATH env var (or next.config.ts) only.
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
