export const ROLES = {
  DONOR: 'DONOR',
  REQUESTER: 'REQUESTER',
  ADMIN: 'ADMIN',
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  maxLimit: 100,
};

// Donor blood group -> set of recipient blood groups it can donate TO.
// (Standard whole-blood compatibility chart)
export const DONOR_COMPATIBILITY_MAP: Record<string, string[]> = {
  O_NEGATIVE: [
    'O_NEGATIVE',
    'O_POSITIVE',
    'A_NEGATIVE',
    'A_POSITIVE',
    'B_NEGATIVE',
    'B_POSITIVE',
    'AB_NEGATIVE',
    'AB_POSITIVE',
  ],
  O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
  A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
  B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
  AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
  AB_POSITIVE: ['AB_POSITIVE'],
};

// Minimum days that must pass between two donations for a donor to be eligible again.
export const MIN_DONATION_INTERVAL_DAYS = 90;
export const MIN_DONOR_AGE = 18;
export const MAX_DONOR_AGE = 65;
export const MIN_DONOR_WEIGHT_KG = 50;

export const CACHE_KEYS = {
  DONOR_SEARCH: (query: string) => `donor:search:${query}`,
  DASHBOARD_STATS: 'admin:dashboard:stats',
};

export const CACHE_TTL_SECONDS = {
  DONOR_SEARCH: 60,
  DASHBOARD_STATS: 120,
};
