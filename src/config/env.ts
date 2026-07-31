/**
 * Centralized, typed access to environment configuration.
 * No test or page object should read `process.env` directly.
 */
export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://www.liverpool.com.mx',
  searchTerm: process.env.SEARCH_TERM ?? 'playstation 5',
  colorFilter: process.env.COLOR_FILTER ?? 'Blanco',
  resultsLimit: Number(process.env.RESULTS_LIMIT ?? 5),
  minCrossValidationMatches: Number(process.env.MIN_CROSS_VALIDATION_MATCHES ?? 3),
} as const;
