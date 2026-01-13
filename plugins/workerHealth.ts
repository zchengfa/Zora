import type {RedisClient} from "bullmq";
import {beginLogger} from "./bullTaskQueue.ts";

export interface WorkerHealthOptions {
  connection: RedisClient,
  workerName: string,
  maxCheckAttempts?:number,
  workerHealthCheckDelay?:number
}

type WorkerStatus = {
  id?: string,
  pid?: number,
  lastHeartbeat?: number,
  status?: string,
  startTime?: string
}

export type WorkerHealthType = {
  registerWorker():Promise<WorkerStatus>,
  updateWorkerHeartBeat(): Promise<void>,
  unregisterWorker():Promise<void>,
}

export class WorkerHealth implements WorkerHealthType{
  private readonly redis: RedisClient
  private readonly workerName: string
  private readonly WORKER_STATUS_KEY:string
  private readonly maxCheckAttempts:number
  private WORKER_HEALTH_TIMER: ReturnType<typeof setInterval> | undefined
  private currentCheckAttempts:number
  private checkStatus:WorkerStatus | string | null
  private readonly workerHealthCheckDelay:number
  constructor(options:WorkerHealthOptions) {
    this.redis = options.connection
    this.workerName = options.workerName
    this.WORKER_STATUS_KEY = `worker:${this.workerName}:status`
    this.maxCheckAttempts = options.maxCheckAttempts || 5
    this.currentCheckAttempts = 0
    this.checkStatus = {}
    this.workerHealthCheckDelay = options.workerHealthCheckDelay || 5000
  }

  public registerWorker =async ():Promise<WorkerStatus>=>{
    const workerId = `${this.workerName}_worker_${process.pid}`
    const status = {
      id: workerId,
      pid: process.pid,
      lastHeartbeat: Date.now(),
      status: 'running',
      startTime: new Date().toISOString()
    };

    await this.redis.setex(this.WORKER_STATUS_KEY,30,JSON.stringify(status))

    return status
  }

  public updateWorkerHeartBeat = async ()=>{
    const status = {
      lastHeartbeat: Date.now(),
      status: 'running'
    };
    await this.redis.setex(this.WORKER_STATUS_KEY, 30, JSON.stringify(status));
  }

  public unregisterWorker = async ()=> {
    await this.redis.del(this.WORKER_STATUS_KEY);
  }

  public checkWorkerHealthStatus = ()=>{
    const keyArr = this.WORKER_STATUS_KEY.split(':')
    const target = `${keyArr[1]} ${keyArr[0]}`
    this.WORKER_HEALTH_TIMER = setInterval(async ()=>{
      this.checkStatus = await this.redis.get(this.WORKER_STATUS_KEY)
      this.currentCheckAttempts ++
      if(this.checkStatus){
        clearInterval(this.WORKER_HEALTH_TIMER)
        await beginLogger({
          level: 'info',
          message: `${target} is healthy`,
          meta:{
            taskType: `worker_health_check`,
            attempts: this.currentCheckAttempts,
            status: JSON.parse(this.checkStatus)
          }
        })
      }
      if(this.currentCheckAttempts >= this.maxCheckAttempts){
        clearInterval(this.WORKER_HEALTH_TIMER)
        await beginLogger({
          level: 'error',
          message: `${target} is unhealthy`,
          meta:{
            taskType: `worker_health_check`,
            attempts: this.currentCheckAttempts,
            status: this.checkStatus
          }
        })
      }
    },this.workerHealthCheckDelay)
  }
}
