import http from 'node:http'
import { ConfigSchemaType, rootConfigSchema } from "./config/config-schema";
import cluster,{Worker} from 'node:cluster'
import { workerMessageSchema, WorkerMessageType } from './config/server-schema';


interface CreateServerConfig{
    port :number;       //jis port pe master process bind hoga
    workerCount:number;
    config:ConfigSchemaType;
}

export async function createServer(config: CreateServerConfig){
    const {workerCount,port}=config;
    const WORKER_POOL:Worker[]=[];

    if(cluster.isPrimary){
        console.log(`Master process started with PID ${process.pid}`);

        for(let i=0;i<workerCount;i++){
            const w=cluster.fork({config:JSON.stringify(config.config)});         //forking worker processes
            WORKER_POOL.push(w);
            // hum apna poora configuration worker process ko bhi pakda de rhe hai
        }

        const server=http.createServer(function(req,res){
            //humko ek event emit karna hai ki ek event aaya
            //pehle humko koi request aayega to humko uska worker process decide karna padega
            const index=Math.floor(Math.random()*WORKER_POOL.length);
            const worker=WORKER_POOL.at(index);     //matlab is worker ko lo jo index pe aaya hai

            if(!worker){
                throw new Error ('Worker not found')
            }

            const payload:WorkerMessageType={
                requestType:'HTTP',
                headers:req.headers,
                body:null,
                url:`${req.url}`

            };
            worker.send(JSON.stringify(payload));

        })
        // console.log(port);
        server.listen(config.port,function(){
            console.log(`Reverse Proxy server is listening on PORT: ${port}`)
        })
    }
    else {
        console.log(`Worker process started with PID ${process.pid}`);
        const configuration=await rootConfigSchema.parseAsync(JSON.parse(`${process.env.config}`));
        // console.log(configuration);
        process.on('message',async (message:string)=>{
            // console.log(`message recieved by worker with processID ${process.pid}`,message);
            const messageValidate=await workerMessageSchema.parseAsync(JSON.parse(message));    //validating that the message you recieved follow schema

            
        })
    }
}