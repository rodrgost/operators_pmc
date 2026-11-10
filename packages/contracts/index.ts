import {countries} from '../rules/index.ts';
import { z } from 'zod';
const requestId=z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const createGameSchema=z.object({requestId,name:z.string().trim().min(2).max(60),seed:z.string().min(1).max(100),registrationCountryId:z.string().refine(id=>countries.some(c=>c.id===id),'País de registro inválido.').optional(),difficulty:z.enum(['easy','normal','hard']).default('normal')}).strict();
export const advanceSchema=z.object({requestId,expectedVersion:z.number().int().nonnegative(),turns:z.number().int().min(1).max(28),stopOnImportant:z.boolean().default(false)}).strict();
export const resumeSchema=z.object({expectedVersion:z.number().int().nonnegative()}).strict();
export const paginationSchema=z.object({offset:z.coerce.number().int().min(0).max(100000).default(0),limit:z.coerce.number().int().min(1).max(100).default(30)});
export type AdvanceCommand=z.infer<typeof advanceSchema>;
