const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function textSearchRegex(value) {
  return new RegExp(escapeRegex(value.trim()), "i");
}

export function buildPage({ page = 1, limit = DEFAULT_LIMIT }) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const safePage = Math.max(Number(page) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildDateRange(from, to) {
  if (!from && !to) return undefined;
  const range = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

export function paginationMeta(total, { page, limit }) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  return { total, page, limit, pages, hasNext: page < pages, hasPrev: page > 1 };
}

export const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  name_desc: { name: -1 },
  visit_newest: { visitDate: -1 },
  visit_oldest: { visitDate: 1 },
};
