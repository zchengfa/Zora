import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios'

const baseURL = import.meta.env.VITE_BASE_URL;
const timeout = 5000

const instance = axios.create({
  baseURL,
  timeout,
  headers:{
    "ngrok-skip-browser-warning": 'true'
  }
})

//axios请求拦截器
instance.interceptors.request.use(function (config:AxiosRequestConfig){
  return config
}, (err:AxiosError) =>{
  return Promise.reject(err)
})

//axios响应拦截器
instance.interceptors.response.use((response:AxiosResponse) =>{

  return response
}, (err:AxiosError) => {

  return Promise.reject(err)
})

export function Get(config:AxiosRequestConfig){
  return instance({...config,method:'GET'})
}

export function Post (config:AxiosRequestConfig){
  return instance({...config,method:'POST'})
}

export function Delete (config:AxiosRequestConfig){
  return instance({...config,method:'DELETE'})
}


