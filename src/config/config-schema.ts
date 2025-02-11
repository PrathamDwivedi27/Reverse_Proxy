import { url } from 'inspector';
import path from 'path';
import {z} from 'zod';

const upstreamSchema=z.object({
    id:z.string(),
    url:z.string().url()
})

const headerSchema=z.object({
    key:z.string(),
    value:z.string()
})

const rulesSchema=z.object({
    path:z.string(),
    upstream:z.array(z.string()),

})

const serverSchema=z.object({
    workers:z.number().optional(),
    listen:z.number(),
    headers:z.array(headerSchema).optional(),
    rules:z.array(rulesSchema),
    upstreams:z.array(upstreamSchema)

})

export const rootConfigSchema=z.object({
    server:serverSchema
})