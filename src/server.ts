import http from 'node:http'
import { ConfigSchemaType, rootConfigSchema } from "./config/config-schema";
import cluster,{Worker} from 'node:cluster'
import { workerMessageReplySchema, workerMessageReplyType, workerMessageSchema, WorkerMessageType } from './config/server-schema';


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

            worker.on('message',async (workerReply:string)=>{
                const reply=await workerMessageReplySchema.parseAsync(JSON.parse(workerReply));
                console.log(reply);
                if(reply.errorCode){
                    res.writeHead(parseInt(reply.errorCode));
                    res.end(reply.error);
                    return ;
                }
                else {
                    res.writeHead(200);
                    res.end(reply.data);
                    return ;
                }
            })

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
            const messageValidated=await workerMessageSchema.parseAsync(JSON.parse(message));    //validating that the message you recieved follow schema

            const requestURL=messageValidated.url;  //jo message aaya usme url hai na
            const rule=config.config.server.rules.find((e)=>{
                const regex=new RegExp(`^${e.path}.*$`);    //agar path match hota hai to us rule ko apply karna padega
                return regex.test(requestURL);  
            });

            if(!rule){
                const reply:workerMessageReplyType={
                    errorCode:'404',
                    error:'Rule not found'
                };
                if(process.send) return process.send(JSON.stringify(reply));
                //agar rule hai to uska upstream decide karna padega

            }
            const upstreamID=rule?.upstream[0];
            const upstream=configuration.server.upstreams.find((e)=>e.id===upstreamID);

            if(!upstream){
                const reply:workerMessageReplyType={
                    errorCode:'500',
                    error:'Upstream not found'
                };
                if(process.send) return process.send(JSON.stringify(reply));
            }


            const request=http.request({
                host:upstream?.url, 
                path:requestURL
            },(proxyRes)=>{
                let body='';

                proxyRes.on('data',(chunk)=>{
                    body+=chunk;
                })

                proxyRes.on('end',()=>{
                    const reply:workerMessageReplyType={
                        data:body,
                    };
                    if( process.send) return process.send(JSON.stringify(reply));
                })
            });
            request.end();
        });
    }
}