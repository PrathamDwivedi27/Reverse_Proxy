"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootConfigSchema = void 0;
const zod_1 = require("zod");
const upstreamSchema = zod_1.z.object({
    id: zod_1.z.string(),
    url: zod_1.z.string()
});
const headerSchema = zod_1.z.object({
    key: zod_1.z.string(),
    value: zod_1.z.string()
});
const rulesSchema = zod_1.z.object({
    path: zod_1.z.string(),
    upstream: zod_1.z.array(zod_1.z.string()),
});
const serverSchema = zod_1.z.object({
    workers: zod_1.z.number().optional(),
    listen: zod_1.z.number(),
    headers: zod_1.z.array(headerSchema).optional(),
    rules: zod_1.z.array(rulesSchema),
    upstreams: zod_1.z.array(upstreamSchema)
});
exports.rootConfigSchema = zod_1.z.object({
    server: serverSchema
});
