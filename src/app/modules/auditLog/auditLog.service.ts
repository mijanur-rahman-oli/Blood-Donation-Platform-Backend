import prisma from '../../utils/prisma';
import { buildMeta, buildPaginationOptions } from '../../utils/queryBuilder';

interface ICreateAuditLog {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an audit trail entry. Called from other services (never scattered
 * ad-hoc query building) whenever a critical state change happens.
 */
const record = async (payload: ICreateAuditLog) => {
  return prisma.auditLog.create({
    data: {
      actorId: payload.actorId ?? null,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: payload.metadata ?? undefined,
    },
  });
};

const getAll = async (query: Record<string, unknown>) => {
  const { page, limit, skip, sortBy, sortOrder } = buildPaginationOptions(query);

  const where: Record<string, unknown> = {};
  if (query.action) where.action = query.action;
  if (query.entityType) where.entityType = query.entityType;

  const [result, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { meta: buildMeta(page, limit, total), result };
};

export const AuditLogService = { record, getAll };
