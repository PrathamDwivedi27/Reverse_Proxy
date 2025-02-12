import { url } from 'inspector'
import {z} from 'zod'

export const workerMessageSchema=z.object({
    requestType:z.enum(['HTTP']),
    headers:z.any(),
    body:z.any(),
    url:z.string().url(),
});



export type WorkerMessageType=z.infer<typeof workerMessageSchema>