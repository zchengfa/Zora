const FETCH_BASE_URL = "https://eb20aab79882.ngrok-free.app";
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
  setToast = (options) => {
    this.setTypeStyle(options.type);
    this.titleEl.innerHTML = options.title;
    this.msgEl.innerHTML = options.message;

    const targetEl = document.querySelector(options.positionComputedTarget);
    if (!targetEl) {
      return;
    }

    // 1. 获取目标元素相对于视口的位置
    const targetRect = targetEl.getBoundingClientRect();

    // 2. 获取弹窗自身的尺寸
    const toastRect = this.zoraToastEl.getBoundingClientRect();

    // 3. 计算目标元素的中心点坐标
    const targetCenterX = targetRect.left + targetRect.width / 2 ;
    const targetCenterY = targetRect.top + targetRect.height / 2 ;

    // 4. 计算弹窗的左上角位置，使其中心点与目标中心点重合
    const toastLeft = targetCenterX - toastRect.width / 2;
    const toastTop = targetCenterY - toastRect.height / 2;

    // 5. 应用计算后的位置，改用 top/left 定位
    this.zoraToastEl.style.position = 'fixed'; // 确保定位基准是视口
    this.zoraToastEl.style.left = toastLeft + 'px';
    this.zoraToastEl.style.top = toastTop + 'px';

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
            password: '账号密码或验证码错误',
            params: '缺少必要参数',
            socket_connect_failed: 'Zora聊天服务不可用'
          },
          msg_status:{
            READ: '已读',
            DELIVERED: '未读'
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
            password: 'incorrect password or code',
            params:'missing required params',
            socket_connect_failed: 'Zora chat service is unavailable'
          },
          msg_status:{
            READ: 'read',
            DELIVERED: 'unread'
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
    return this.localeCache[this.locale].title[type] || ''
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
    return this.localeCache[this.locale].message[type][msgType] || ''
  }
}
