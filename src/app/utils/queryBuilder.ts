import { PAGINATION_DEFAULTS } from '../constants';

export interface IPaginationOptions {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Extracts and normalizes page, limit, sortBy, sortOrder from a request query object.
 * Reused across every list endpoint so pagination/sorting logic lives in one place.
 */
export const buildPaginationOptions = (
  query: Record<string, unknown>,
  defaultSortBy = 'createdAt',
): IPaginationOptions => {
  const page = Math.max(Number(query.page) || PAGINATION_DEFAULTS.page, 1);
  const rawLimit = Number(query.limit) || PAGINATION_DEFAULTS.limit;
  const limit = Math.min(Math.max(rawLimit, 1), PAGINATION_DEFAULTS.maxLimit);
  const skip = (page - 1) * limit;
  const sortBy = (query.sortBy as string) || defaultSortBy;
  const sortOrder = (query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  return { page, limit, skip, sortBy, sortOrder };
};

export const buildMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
});

/**
 * Builds a Prisma `where` filter object from a set of allowed query keys.
 * Only keys present in `allowedFilters` and present in `query` are applied.
 */
export const buildExactFilters = (
  query: Record<string, unknown>,
  allowedFilters: string[],
): Record<string, unknown> => {
  const where: Record<string, unknown> = {};
  for (const key of allowedFilters) {
    if (query[key] !== undefined && query[key] !== '') {
      const value = query[key];
      if (value === 'true' || value === 'false') {
        where[key] = value === 'true';
      } else {
        where[key] = value;
      }
    }
  }
  return where;
};
