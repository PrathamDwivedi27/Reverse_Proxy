"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const node_http_1 = __importDefault(require("node:http"));
const config_schema_1 = require("./config/config-schema");
const node_cluster_1 = __importDefault(require("node:cluster"));
const server_schema_1 = require("./config/server-schema");
function createServer(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { workerCount, port } = config;
        const WORKER_POOL = [];
        if (node_cluster_1.default.isPrimary) {
            console.log(`Master process started with PID ${process.pid}`);
            for (let i = 0; i < workerCount; i++) {
                const w = node_cluster_1.default.fork({ config: JSON.stringify(config.config) }); //forking worker processes
                WORKER_POOL.push(w);
                // hum apna poora configuration worker process ko bhi pakda de rhe hai
            }
            const server = node_http_1.default.createServer(function (req, res) {
                //humko ek event emit karna hai ki ek event aaya
                //pehle humko koi request aayega to humko uska worker process decide karna padega
                const index = Math.floor(Math.random() * WORKER_POOL.length);
                const worker = WORKER_POOL.at(index); //matlab is worker ko lo jo index pe aaya hai
                if (!worker) {
                    throw new Error('Worker not found');
                }
                const payload = {
                    requestType: 'HTTP',
                    headers: req.headers,
                    body: null,
                    url: `${req.url}`
                };
                worker.send(JSON.stringify(payload));
            });
            // console.log(port);
            server.listen(config.port, function () {
                console.log(`Reverse Proxy server is listening on PORT: ${port}`);
            });
        }
        else {
            console.log(`Worker process started with PID ${process.pid}`);
            const configuration = yield config_schema_1.rootConfigSchema.parseAsync(JSON.parse(`${process.env.config}`));
            // console.log(configuration);
            process.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
                // console.log(`message recieved by worker with processID ${process.pid}`,message);
                const messageValidate = yield server_schema_1.workerMessageSchema.parseAsync(JSON.parse(message)); //validating that the message you recieved follow schema
            }));
        }
    });
}
