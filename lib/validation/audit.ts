import { z } from 'zod'

export const listAuditQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  username: z.string().trim().optional().default(''),
  action: z.string().trim().optional().default(''),
  entity: z.string().trim().optional().default(''),
  severity: z.string().trim().optional().default(''),
  module: z.string().trim().optional().default(''),
  dateFrom: z.string().trim().optional().default(''),
  dateTo: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(25),
})

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>