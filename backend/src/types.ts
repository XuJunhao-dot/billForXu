import { z } from 'zod';

export const Direction = z.enum(['ASSET', 'LIABILITY']);
export type Direction = z.infer<typeof Direction>;

export const CreateCategory = z.object({
  direction: Direction,
  name: z.string().trim().min(1),
  parentId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().optional().default(0)
});

export const UpdateCategory = z.object({
  name: z.string().trim().min(1).optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isLeaf: z.boolean().optional()
});

export const SnapshotItemInput = z.object({
  id: z.string().trim().min(1).optional(),
  direction: Direction,
  itemName: z.string().trim().min(1),
  amount: z.string().trim().min(1),
  itemType: z.string().trim().min(1),
  categoryId: z.string().trim().min(1).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional()
});

export const CreateSnapshot = z.object({
  // ISO string, e.g. 2026-03-05T12:00:00.000Z
  snapshotTime: z.string().trim().datetime(),
  currency: z.string().trim().min(1).optional().default('CNY'),
  note: z.string().trim().max(2000).nullable().optional(),
  // client-generated idempotency key to prevent accidental duplicates
  clientRequestId: z.string().trim().min(1).optional(),
  items: z.array(SnapshotItemInput).min(1)
});
