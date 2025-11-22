
//防抖函数
function debounce(fun,delay = 300) {
    let timer = null
    return function(...args){
        if(timer){
            clearTimeout(timer)
        }
        timer = setTimeout(()=>{
            fun.apply(this,args)
        },delay)
    }
}

//设置请求头
function setHeaders(headers = { 'Content-Type': 'application/json', Accept: `application/json` }) {
  return headers
}

//倒计时(60秒内)
const duration = 60*1000
const endTime = new Date().getTime() + duration
let zoraTimer = null
function countDown() {
  const now = new Date().getTime
  const leftTime = endTime - now
  if(leftTime <= 0){
    clearInterval(zoraTimer)
  }
}