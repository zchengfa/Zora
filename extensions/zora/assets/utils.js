const FETCH_BASE_URL = "https://83f3595da512.ngrok-free.app";
const ZORA_TOKEN = "zora_token"
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

function zoraFetch(url,config){
  return fetch(`${FETCH_BASE_URL + url}` , {
    method: 'POST',
    headers: setHeaders(),
    ...config
  })
}

function zoraGetCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

//设置请求头
function setHeaders(headers) {
  return headers || {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    "ngrok-skip-browser-warning": true, //绕过ngrok验证
    authorization: `Bearer ${sessionStorage.getItem(ZORA_TOKEN)}`
  }
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

//弹框类
class ZoraToast {
  constructor(){
    this.zoraEl = document.querySelector('.zora-main');
    this.zoraToastEl = document.querySelector('#zora-toast');
    this.msgEl = this.zoraToastEl.querySelector('.zora-toast-message');
    this.titleEl = this.zoraToastEl.querySelector('.zora-toast-title');
    this.zoraToastTimer = null;
  }

  /**
   * @description 显示zora弹框
   * @param title {string} 弹框标题
   * @param message {string} 弹框需要显示的消息
   * @param type {'info' | 'warning' | 'success' | 'error'} 弹框类型
   * @param positionComputedTarget {string} 弹框定位的目标
   * @param duration 弹框间隔多久会消失
   * @example 弹框使用示例：
   * zoraToast.showZoraToast({
   *   message:'zora toast message',
   *   type: 'success',
   *   positionComputedTarget: '.zora-auth-container'
   * })
   */
  showZoraToast = (
    {
      message,
      type,
      title,
      positionComputedTarget
    },duration = 3000)=>{
    //初始化
    this.initial(title,message,type,positionComputedTarget);
    //显示弹框
    this.triggerToast()
    //清除之前的定时器
    if(this.zoraToastTimer){
      clearTimeout(this.zoraToastTimer)
    }
    //过一段时间就隐藏弹框
    this.zoraToastTimer = setTimeout(()=>{
      this.triggerToast(true)
    },duration)
  }
  initial = (title,message,type,positionComputedTarget) => {
    //参数初始化
    if (!title){
      title = 'zora tips:'
    }
    if(!message){
      message = 'zora message'
    }
    if(!type){
      type = 'success'
    }
    if(!positionComputedTarget){
      positionComputedTarget = '.zora-auth-container'
    }

    this.setToast({title,message,type,positionComputedTarget})

    return {message,type,positionComputedTarget}
  }
  setTypeStyle = (type)=>{
    const zoraBorderClassName = `zora-${type}`
    const zoraTitleClassName = `zora-title-${type}`
    const zoraMessageClassName = `zora-message-${type}`
    this.zoraToastEl.className = `zora-toast-container zora-toast-show ${zoraBorderClassName}`
    this.titleEl.className = `zora-toast-title ${zoraTitleClassName}`
    this.msgEl.className = `zora-toast-message ${zoraMessageClassName}`
  }
  setToast = (options)=>{
    this.setTypeStyle(options.type)
    this.titleEl.innerHTML = options.title
    this.msgEl.innerHTML = options.message
    const targetEl = document.querySelector(options.positionComputedTarget)
    //获取目标元素的计算样式
    const boundingRect = targetEl.getBoundingClientRect()
    const targetWidth = parseInt(boundingRect.width)
    const targetHeight = parseInt(boundingRect.height)

    //获取弹框的计算样式
    const toastRect = this.zoraToastEl.getBoundingClientRect()
    const toastWidth = parseFloat(toastRect.width)
    const toastHeight = parseFloat(toastRect.height)

    //获取顶层元素的位置
    const zoraRect = this.zoraEl.getBoundingClientRect()
    this.zoraToastEl.style.left = `${boundingRect.x - zoraRect.left  + ((targetWidth - toastWidth) / 2)}px`
    this.zoraToastEl.style.bottom = `${boundingRect.y - zoraRect.height + ((targetHeight - toastHeight) / 2)}px`
  }
  triggerToast = (state = false)=>{
    if(state){
      this.zoraToastEl.classList.remove('zora-toast-show')
      this.zoraToastEl.classList.add('zora-toast-hidden')
    }
    else{
      this.zoraToastEl.classList.add('zora-toast-show')
      this.zoraToastEl.classList.remove('zora-toast-hidden')
    }
  }
}

class ZoraResponse {
  constructor(is_code) {
    this.locale = is_code;
    this.localeCache = {
      'zh-CN':{
        title:{
          success: '成功✅',
          info: '信息ℹ️',
          warning: '警告⚠️',
          error: '错误❌'
        },
        message:{
          success:{
            code:'验证码发送成功',
            validate_email:'邮箱验证成功'
          },
          info: {

          },
          warning: {

          },
          error:{
            code:'验证码发送失败',
            server: '服务器开小差了,稍后再试！',
            validate_email:'邮箱验证失败',
            code_error:'验证码错误',
            no_attempt_expired: '验证次数过多或验证码过期',
            password: '账号密码错误'
          },
          msg_status:{
            READ: '已读',
          }
        }
      } ,
      'en':{
        title:{
          success: 'Success ✅',
          info: 'Info ℹ️',
          warning: 'Warning ⚠️',
          error: 'Error ❌'
        },
        message:{
          success:{
            code:'code send successful',
            validate_email:'email validate successful',
          },
          info: {

          },
          warning: {

          },
          error:{
            code:'code send failure',
            server: 'The server is having a momentary glitch. Please try again later!',
            validate_email:'email validate failure',
            code_error:'incorrect code',
            no_attempt_expired: 'Excessive verification attempts or expired verification code',
            password: 'incorrect password'
          },
          msg_status:{
            READ: 'read',
          }
        }
      }
    }
  }

  /**
   * @description 标题响应
   * @param type {'success' | 'info' | 'warning' | 'error'} 标题类型
   * @returns {string} 返回响应后的文本
   * @example 使用示例：
   * zoraResponse.responseTitle('error')
   */
  responseTitle = (type = 'success')=>{
    return this.localeCache[this.locale].title[type]
  }
  /**
   * @description 消息响应
   * @param type {'success' | 'info' | 'warning' | 'error' | 'msg_status'} 消息类型
   * @param msgType {string} 具体的消息类型
   * @returns {string} 返回响应后的文本
   * @example 使用示例：
   * zoraResponse.responseMessage('error','code')
   */
  responseMessage = (type,msgType)=>{
    return this.localeCache[this.locale].message[type][msgType]
  }
}
