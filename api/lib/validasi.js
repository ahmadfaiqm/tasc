// api/lib/validasi.js
import { z } from 'zod';

const jamRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const taskBuat = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().nullable().optional(),
  source_text: z.string().nullable().optional(),
  sourceText: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  due_time: z.string().regex(jamRegex, 'due_time harus HH:MM').nullable().optional(),
  dueTime: z.string().regex(jamRegex, 'due_time harus HH:MM').nullable().optional(),
  time_precision: z.enum(['EXACT', 'PERIOD', 'UNSPECIFIED']).optional().default('UNSPECIFIED'),
  timePrecision: z.enum(['EXACT', 'PERIOD', 'UNSPECIFIED']).optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  duration_source: z.enum(['USER', 'AI', 'SYSTEM']).nullable().optional(),
  urgency: z.enum(['URGENT', 'NORMAL', 'LOW']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  priority_source: z.enum(['USER', 'AI', 'SYSTEM']).optional(),
  prioritySource: z.enum(['USER', 'AI', 'SYSTEM']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  ai_assumption: z.string().nullable().optional(),
  aiAssumption: z.string().nullable().optional(),
});

export const taskUbah = taskBuat.partial();

export const chatMasuk = z.object({
  pesan: z.string().trim().min(1).max(4000),
});

export const settings = z.object({
  enabled: z.boolean().optional(),
  default_reminder_minutes: z.number().int().min(1).max(1440).optional(),
  defaultReminderMinutes: z.number().int().min(1).max(1440).optional(),
});
