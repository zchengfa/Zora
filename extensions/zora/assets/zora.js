
const zoraResponse = new ZoraResponse(document.querySelector('.zora-main').dataset.locale)
const zoraToast = new ZoraToast()
const renderMessage = new RenderMessage()

// 未读消息计数
let unreadMessageCount = 0

// 更新未读消息计数显示
function updateUnreadCount(count) {
  unreadMessageCount = count
  const indicator = document.querySelector('.zora-new-message-indicator')
  if (indicator) {
    if (count > 0) {
      indicator.classList.remove('hidden')
      // 如果数量大于99，显示99+
      indicator.textContent = count > 99 ? '99+' : count
      // 调整indicator样式以显示数字
      indicator.style.width = count > 9 ? '1rem' : '.8rem'
      indicator.style.height = count > 9 ? '1rem' : '.8rem'
    } else {
      indicator.classList.add('hidden')
      indicator.textContent = ''
    }
  }
}

function markMessagesAsRead() {
  const conversationId = sessionStorage.getItem('zora_conversation_id');
  if (!conversationId) return;

  // 获取所有客服发送的消息
  const messageItems = document.querySelectorAll('.zora-message-item[data-msg-unique]');
  const agentMessages = [];

  messageItems.forEach(item => {
    const msgId = item.getAttribute('data-msg-unique');
    const isAgentMessage = item.classList.contains('zora-message-left');
    if (isAgentMessage && msgId) {
      agentMessages.push(msgId);
    }
  });
  if (agentMessages.length > 0) {
    // 获取最新的客服消息ID
    const latestAgentMsgId = agentMessages[agentMessages.length - 1];

    // 发送批量消息已读请求到后端
    socket.emit('mark_messages_as_read', {
      conversationId: conversationId,
      msgId: latestAgentMsgId,
      senderType: 'AGENT',
      msgStatus: 'READ',
      readAllBefore: true
    });
  }
}

// 请求最新消息状态
function requestLatestMessageStatus() {
  const conversationId = sessionStorage.getItem('zora_conversation_id');
  if (!conversationId) return;

  // 获取所有客户发送的消息
  const messageItems = document.querySelectorAll('.zora-message-item[data-msg-unique]');
  const unreadCustomerMessages = [];

  messageItems.forEach(item => {
    const msgId = item.getAttribute('data-msg-unique');
    const isCustomerMessage = item.classList.contains('zora-message-right');
    const msgStatus = item.getAttribute('data-status');

    // 只处理客户发送的消息
    if (isCustomerMessage && msgId) {
      // 检查消息状态是否为未读（DELIVERED或SENT状态）
      const isUnread = msgStatus === 'DELIVERED' || msgStatus === 'SENT';

      // 只有未被读取的消息才需要更新状态
      if (isUnread) {
        unreadCustomerMessages.push(msgId);
      }
    }
  });

  if (unreadCustomerMessages.length > 0) {
    // 发送请求获取这些未读消息的最新状态
    socket.emit('get_message_status', {
      conversationId: conversationId,
      msgIds: unreadCustomerMessages
    });
  }
}

// 聊天盒自定义组件
if(!customElements.get('zora-button')){
    class ZoraButton extends HTMLElement {
        constructor() {
            super();
            this.isBtnState = false
            this.defaultBtnEl = this.querySelector('.zora-default-btn-box')
            this.activeBtnEl = this.querySelector('.zora-active-btn-box')
            this.addEventListener('click', this.changeBtnState)
        }
        changeBtnState = ()=> {
            //修改按钮状态
            this.isBtnState = !this.isBtnState
            this.className = this.isBtnState ? 'zora-main-btn-active' : 'zora-main-btn'
            const bodyEl = document.querySelector('body')
            //根据按钮状态改变类型变换样式
            if(this.isBtnState){
               bodyEl.style.overflow = 'hidden'
               this.defaultBtnEl.className = 'zora-default-btn-box btn-box-hidden'
               this.activeBtnEl.className = 'zora-active-btn-box'
               document.querySelector('.' + this.dataset.targetClass).className = this.dataset.activeClass
               // 打开聊天窗口时，清除未读消息指示器
               updateUnreadCount(0)
              //打开内容盒子后，判断当前是否已登录，并且聊天窗口是否处于激活状态，满足条件即可进行发送消息已读回执
              if(sessionStorage.getItem('zora_token') && document.querySelector('.zora-message-box-active')){
                markMessagesAsRead()
                // 请求最新消息状态
                requestLatestMessageStatus()
              }
            }
            else{
               bodyEl.style.overflowY = 'scroll'
               this.defaultBtnEl.className = 'zora-default-btn-box'
               this.activeBtnEl.className = 'zora-active-btn-box btn-box-hidden'
               document.querySelector('.' + this.dataset.activeClass).className = this.dataset.targetClass
               document.querySelector('.zora-auth-container').classList.add('hidden')
            }
        }
    }

    customElements.define('zora-button', ZoraButton);
}

// 聊天盒自定义组件
if(!customElements.get('zora-message-component')){
    class ZoraMessageComponent extends HTMLElement {
        constructor() {
            super();
            console.log(this)
        }

    }

    customElements.define('zora-message-component', ZoraMessageComponent);
}

// 聊天框自定义组件
if(!customElements.get('zora-input-component')){
    class ZoraInputComponent extends HTMLElement {
        constructor() {
            super();
            this.msg = undefined
            this.inputEl = this.querySelector('#zora-input')
            this.inputEl.addEventListener('input', this.listenInput)
            this.inputEl.addEventListener('keydown',this.listenKeydownEnter)
        }
        listenInput = (e)=>{
            this.msg = e.target.value
            if(this.msg.trim().length){
                document.querySelector('.'+ this.dataset.target).classList.add('hidden')
                document.querySelector('.'+ this.dataset.targetActive).classList.remove('hidden')
            }
            else{
                document.querySelector('.'+ this.dataset.target).className = `${this.dataset.target} zora_icon_box`
                document.querySelector('.'+ this.dataset.targetActive).className = `${this.dataset.targetActive} hidden zora_icon_box `
            }
        }
        listenKeydownEnter = (e)=>{
            //监听键盘是否按下enter键
            if(e.keyCode == 13){
                console.log(this.msg)
                //TODO:发送消息（待开发）
                //清空输入框内容
                this.inputEl.value = ''
                this.msg = ''
            }
        }
    }

    customElements.define('zora-input-component', ZoraInputComponent);
}

// 表情自定义组件
if(!customElements.get('zora-emoji-component')){
    class ZoraEmojiComponent extends HTMLElement {
        constructor() {
            super();
            this.toggleState = false
            this.addEventListener('click', this.toggleEmoji)
        }

        toggleEmoji = () =>{
            this.toggleState = !this.toggleState

        }

    }

    customElements.define('zora-emoji-component', ZoraEmojiComponent);
}

// 立即聊天按钮自定义组件
if(!customElements.get('zora-chat-btn-component')){
    class ZoraChatBtnComponent extends HTMLElement {
        constructor() {
            super();
            this.addEventListener('click', this.btnClick)
        }
        btnClick = async () =>{
            //先进行登录判断，未登录就执行登录注册流程
          const token = sessionStorage.getItem(ZORA_TOKEN)
          if(token){
            const response = await zoraFetch('/validateToken').then(response=> response.json())
            if(!response.result){
              this.showAuthBox()
            }
             //改变聊天框高度
            document.querySelector('.'+ this.dataset.targetMsg).className = this.dataset.targetMsgActive
            //输入框显示
            document.querySelector('.'+ this.dataset.input).classList.remove('hidden')
            //隐藏联系按钮
            this.classList.add('hidden')
            //隐藏标题
            document.querySelector('.'+ this.dataset.header).classList.add('hidden')
            //显示返回元素
            document.querySelector('.'+ this.dataset.headerActive).classList.remove('hidden')

            // 发送消息已读请求
            markMessagesAsRead()
          }
          else{
            this.showAuthBox()
          }
        }

        showAuthBox = () =>{
            document.querySelector('.'+ this.dataset.container).classList.add('hidden')
            document.querySelector('.'+ this.dataset.authContainer).classList.remove('hidden')
        }
    }

    customElements.define('zora-chat-btn-component', ZoraChatBtnComponent);
}

// 返回按钮自定义组件
if(!customElements.get('zora-back-component')){
    class ZoraBackComponent extends HTMLElement {
        constructor() {
            super();
            this.addEventListener('click', this.btnClick)
        }
        btnClick = () =>{
             //改变聊天框高度
            document.querySelector('.'+ this.dataset.targetMsgActive).className = this.dataset.targetMsg
            //输入框隐藏
            document.querySelector('.'+ this.dataset.input).classList.add('hidden')
            //隐藏返回头部
            document.querySelector('.zora-header-active-box').classList.add('hidden')
            //显示标题
            document.querySelector('.'+ this.dataset.header).classList.remove('hidden')
            //显示联系按钮
            document.querySelector('.zora-chat-btn-component').classList.remove('hidden')
        }
    }

    customElements.define('zora-back-component', ZoraBackComponent);
}


if(!customElements.get('zora-auth-form-component')){
    class ZoraAuthFormComponent extends HTMLElement {
      constructor() {
        super();
        this.formData = {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          authCode: '',
          marketEmail: false,
          marketSms: false,
        }
        this.verifyCode = ''
        this.endTime = undefined
        this.zoraTimer = null
        this.validateStatus = false
        this.switchAuth = false
        this.form = this.querySelector('#zora-auth-form')
        //阻止表单的默认行为
        this.form.addEventListener('submit', function (e) {
          e.preventDefault();
        })

        this.switchCode = this.querySelector(`${'.'+this.dataset['switchCode']}`)
        this.switchPwd = this.querySelector(`${'.'+this.dataset['switchPwd']}`)
        this.authSend = this.querySelector('.auth-send')
        //监听input的输入事件
        this.listenInput()

        //监听提交按钮
        this.querySelector('#' + this.dataset.submit).addEventListener('click', this.btnSubmit)

        //监听验证码输入框
        this.querySelector('#zora-verify-code').addEventListener('input', this.verifyCodeInput)

        //监听验证码发送按钮
        this.querySelector('.zora-code-send').addEventListener('click', this.sendVerifyCode)

        //监听验证按钮
        this.querySelector('.zora-code-verify').addEventListener('click', this.verifyCodeBtn)

        //监听验证方式按钮
        this.switchCode.addEventListener('click',this.changeAuth)
        this.switchPwd.addEventListener('click',this.changeAuth)
        this.authSend.addEventListener('click', this.sendAuthCode)
      }

      /**
       * @description 发送验证码用于登录验证
       */
      sendAuthCode = ()=>{
        if(!this.formData.email.length){
          zoraToast.showZoraToast({
            message:zoraResponse.responseMessage('error','params'),
            type:'error',
            title:zoraResponse.responseTitle('error')
          })
          return;
        }
        this.authSend.setAttribute('disabled','disabled')
        this.authSend.classList.add('zora-disabled-btn')
        this.sendVerifyCode()
      }
      /**
       * @description 改变验证方式（验证码\密码）
       */
      changeAuth = () => {
        const pwdEl = this.querySelector('#zora-password')
        const codeEl = this.querySelector('#zora-verify-auth')
        const authSendEl = this.querySelector('.auth-send')
        //切换验证方式时需要将输入框恢复到空状态
        pwdEl.value = '';
        codeEl.value = '';
        this.formData.password = ''
        this.formData.authCode = ''
        this.switchAuth = !this.switchAuth
        this.checkAllInputValue()
        if(this.switchAuth){
          pwdEl.classList.add('hidden')
          codeEl.classList.remove('hidden')
          authSendEl.classList.remove('hidden')
          this.switchCode.classList.remove('hidden')
          this.switchPwd.classList.add('hidden')
          this.triggerErrPwdEl(true) //密码框已隐藏，无需显示密码校验错误
          return;
        }
        pwdEl.classList.remove('hidden')
        codeEl.classList.add('hidden')
        authSendEl.classList.add('hidden')
        this.switchCode.classList.add('hidden')
        this.switchPwd.classList.remove('hidden')
      }

      /**
       * @description 提交表单数据
       * @returns {Promise<void>}
       */
      btnSubmit = async () => {
        //禁用表单按钮，防止重复提交
        const submitBtn = this.querySelector('#' + this.dataset.submit)
        submitBtn.setAttribute('disabled','disabled')
        submitBtn.classList.add('zora-disabled-btn')
        submitBtn.classList.remove('zora-auth-btn')
        const hashPwd = await this.hashPassword(this.formData.password)
        const submitData = {
          ...this.formData,
          password: hashPwd,
        }

        fetch(FETCH_BASE_URL + '/authenticator', {
          method: 'POST',
          headers: setHeaders(),
          body: JSON.stringify(submitData)
        }).then(response=>{
          if(response.status === 500){
            zoraToast.showZoraToast({
              message: zoraResponse.responseMessage('error','server'),
              type:'info',
              title: zoraResponse.responseTitle('error')
            })
          }
          return response.json()
        }).then(res=>{
          if(!res.result){
            zoraToast.showZoraToast({
              message: zoraResponse.responseMessage('error','password'),
              type:'info',
              title: zoraResponse.responseTitle('error')
            })
          }
          else{
            this.loginSuccess(res.token,{
              ...res.userInfo,
              shop:document.querySelector('.zora-main').dataset['shop']
            })
          }
        })
      }
      /**
       * @description 登录成功：1.重置表单 2.回到上一步的元素状态
       */
      loginSuccess = (token,info) => {
        sessionStorage.setItem(ZORA_TOKEN, token)
        sessionStorage.setItem('zora_userInfo',JSON.stringify(info))
        socket.emit('online',JSON.stringify(info))
        // 发送获取未读消息的事件
        socket.emit('get_unread_messages', {
          userId: info.userId,
          shop: info.shop
        });
        this.querySelector('#zora-auth-form').reset()
        document.querySelector('.zora-auth-container').classList.add('hidden')
        document.querySelector('.zora-container-active').classList.remove('hidden')
        document.querySelector('.zora-input-box').classList.remove('hidden')
        document.querySelector('.zora-header-active-box').classList.remove('hidden')
        document.querySelector('.zora-message-box').className = 'zora-message-box-active'
        document.querySelector('.zora-chat-btn-component').classList.add('hidden')
        document.querySelector('.zora-header').classList.add('hidden')

      }
      /**
       * @description 监听输入框
       */
      listenInput = () => {
        const targets = [this.dataset.email, this.dataset.firstName, this.dataset.lastName, this.dataset.pwd,this.dataset.authCode, this.dataset.marketEmail, this.dataset.marketSms]
        targets.forEach(target => {
          this.querySelector('#' + target).addEventListener('input', (e) => {
            switch (target) {
              case this.dataset.email:
                this.formData.email = e.target.value.trim()
                this.debounceEmailInputValue()
                break;
              case this.dataset.firstName:
                this.formData.firstName = e.target.value.trim()
                break;
              case this.dataset.lastName:
                this.formData.lastName = e.target.value.trim()
                break;
              case this.dataset.pwd:
                this.formData.password = e.target.value.trim()
                this.debouncePwdInputValue()
                break;
              case this.dataset.marketEmail:
                this.formData.marketEmail = e.target.checked
                break;
              case this.dataset.marketSms:
                this.formData.marketSms = e.target.checked
                break;
              case this.dataset.authCode:
                this.formData.authCode = e.target.value.trim()
                break;
              default:
                break;
            }
            this.checkAllInputValue()
          })
        })

      }

      /**
       * @description 判断对应输入框是否有值
       * @returns {boolean} 返回true获取false
       */
      checkAllFilled() {
        //检查所有输入框都是否有值
        let targets = []
        if(this.validateStatus){
          targets = this.switchAuth ? ['email','authCode'] : ['email','password']
        }
        else{
          targets = ['email', 'firstName', 'lastName','password']
        }
        return targets.every(target => this.formData[target])
      }

      /**
       * @description 检测监听的输入框是否都通过
       */
      checkAllInputValue = () => {
        this.triggerErrInfoEl(this.checkAllFilled())
        if(this.switchAuth){
         return this.triggerSubmit(this.checkAllFilled() && this.formData.authCode.length >= 6 && this.validateEmail(this.formData.email) && this.validateStatus)

        }
        this.triggerSubmit(this.checkAllFilled() && this.checkPasswordStrength(this.formData.password) && this.validateEmail(this.formData.email) && this.validateStatus)
      }
      /**
       * @description 防抖监听密码输入框
       */
      debouncePwdInputValue = debounce(() => {
        // 检查密码强度
        this.triggerErrPwdEl(this.checkPasswordStrength(this.formData.password))
      })
      /**
       * @description 防抖监听邮箱输入框
       */
      debounceEmailInputValue = debounce(() => {
        // 检查邮箱格式
        this.triggerErrEmailEl(this.validateEmail(this.formData.email))
        if(!this.validateEmail(this.formData.email)){
         //隐藏验证元素
         this.querySelector('.zora-verify-box').classList.add('hidden')
        }
        else{
          this.changeEmailValidateBox().then()
        }
      })
      /**
       * @description 检测邮箱是否注册过：
       * 1.发送检测用户是否注册过的请求
       * 2.根据返回结果，显示不同的元素
       *   2.1 已注册则隐藏注册元素，可登录按钮显示
       *   2.2 未注册则显示注册元素，可登录按钮等验证通过后再显示
       */
      changeEmailValidateBox = async ()=>{
          const emailValidate = await fetch(`${FETCH_BASE_URL}/checkEmail`,{
              method: 'POST',
              headers: setHeaders(),
              body: JSON.stringify({
              email: this.formData.email
              })
             }).then(res=>res.json())
          this.validateStatus = emailValidate.result

          this.checkAllInputValue()
          this.triggerRegisterElements(emailValidate.result)
      }
      /**
       * @description 邮箱校验
       * @param email {string} 需要校验的邮箱
       * @returns {boolean} 返回校验结果true或者false
       * @example 使用示例：
       * this.validateEmail(email)
       */
      validateEmail = (email)=> {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email); // 返回 true 或 false
      }
      /**
       * @description 密码校验
       * @param password {string} 需要校验的密码
       * @returns {boolean} 返回校验结果true或者false
       * @example 使用示例：
       * this.checkPasswordStrength(password)
       */
      checkPasswordStrength = (password)=>{
        // 定义正则表达式
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,20}$/;

        // 测试密码是否符合规则
        return strongPasswordRegex.test(password);
      }
      /**
       * @description 获取验证码：
       * 1.发送验证码获取请求
       * 2.等待请求响应，响应发送成功，隐藏发送按钮，显示倒计时，响应失败，显示错误信息
       */
      sendVerifyCode = ()=>{
        fetch(`${FETCH_BASE_URL}/sendVerifyCodeToEmail`,{
          method:'POST',
          headers: setHeaders(),
          body: JSON.stringify({
            email:this.formData.email,
            isAuth: this.validateStatus
          })
        }).then(response => response.json()).then(res => {
          //收到验证码发送成功的响应
          if(res.success){
            zoraToast.showZoraToast({
              message:zoraResponse.responseMessage('success','code'),
              title:zoraResponse.responseTitle('success')
            })
            //清除之前的定时器
            if(this.zoraTimer){
              clearInterval(this.zoraTimer)
            }
            this.showVerifyTargetEl("ex")
            this.endTime = new Date().getTime() + res.code_expired * 1000
            this.countDown()
            //隐藏发送按钮，显示计时元素
             this.zoraTimer = setInterval(()=>{
              this.countDown()
            },1000)
          }
          else{
            zoraToast.showZoraToast({
              message:zoraResponse.responseMessage('error','server'),
              type: 'error',
              title:zoraResponse.responseTitle('error')
            })
          }
        })
      }
      /**
       * @description 倒计时
       */
      countDown = ()=>{
        const now = new Date().getTime()
        const leftTime = this.endTime - now
        if(leftTime <= 0){
          //倒计时结束，清除定时器，元素恢复到初始状态
          clearInterval(this.zoraTimer)
          this.zoraTimer = null
          this.verifyCodeElementsDefaultStatus()
        }
        this.querySelector('.zora-ex').innerHTML = `${Math.floor(leftTime/1000)}s`
      }
      /**
       * @description 验证码输入框
       */
      verifyCodeInput = (e)=>{
          if(this.zoraTimer){
            this.showVerifyTargetEl('verify')
            const value = e.target.value.trim()
            this.verifyCode = value.substr(0,6)
            this.querySelector('#zora-verify-code').value = this.verifyCode
            this.triggerCodeVerifyEl(this.verifyCode.length < 6)
          }
      }
      /**
       * @description 比对验证码：
       * 1.发送验证请求
       * 2.根据验证响应进行操作,清空之前的验证码
       *    2.1 验证成功，修改验证状态，特定输出框值都验证通过提交按钮变为可点击状态,清除定时器,元素恢复到初始状态
       *    2.2 验证失败，提示错误信息，并且修改验证状态
       */
      verifyCodeBtn = ()=>{
        fetch(`${FETCH_BASE_URL}/verifyCode`,{
          method: 'POST',
          headers: setHeaders(),
          body: JSON.stringify({code:this.verifyCode,email: this.formData.email})
        }).then(response => response.json()).then(res=>{
          if(res.result){
            zoraToast.showZoraToast({
              message:zoraResponse.responseMessage('success','validate_email'),
              title:zoraResponse.responseTitle('success')
            })
            this.validateStatus = true
            this.verifyCodeElementsDefaultStatus()
            clearInterval(this.zoraTimer)
            this.triggerSubmit(this.checkAllFilled())
          }
          else{
            this.validateStatus = false
            //没有验证次数了或者验证码过期，清除定时器，元素恢复到初始状态
            if(!res.left_attempt){
              zoraToast.showZoraToast({
                message:zoraResponse.responseMessage('error','no_attempt_expired'),
                type:'error',
                title:zoraResponse.responseTitle('error')
              })
              this.verifyCodeElementsDefaultStatus()
              clearInterval(this.zoraTimer)
            }
            else{
              zoraToast.showZoraToast({
                message:zoraResponse.responseMessage('error','code_error'),
                type:'error',
                title:zoraResponse.responseTitle('error')
              })
            }
            this.verifyCode = ''
            this.querySelector('#zora-verify-code').value = ''
            this.triggerCodeVerifyEl(true)
          }
          console.log(res)
        }).catch(err=>{
          console.log(err)
        })
      }
      /**
       * @description 显示特定元素、其它元素隐藏（发送按钮、倒计时元素、验证按钮）
       * @param target {'send' | 'ex' | 'verify'} send：发送按钮、ex：倒计时元素、verify：验证按钮
       * @example 使用示例：
       * this.showVerifyTargetEl('send') //显示发送按钮，倒计时元素和验证按钮隐藏
       */
      showVerifyTargetEl = (target)=>{
        const exEl = this.querySelector('.zora-ex')
        const sendEl = this.querySelector('.zora-code-send')
        const verifyEl = this.querySelector('.zora-code-verify')
        switch (target) {
          case "ex":
            exEl.classList.remove('hidden')
            sendEl.classList.add('hidden')
            verifyEl.classList.add('hidden')
            break;
          case "send":
            exEl.classList.add('hidden')
            sendEl.classList.remove('hidden')
            verifyEl.classList.add('hidden')
            break;
          case "verify":
            exEl.classList.add('hidden')
            sendEl.classList.add('hidden')
            verifyEl.classList.remove('hidden')
            break;
        }
      }
      /**
       * @description 邮箱错误提示元素
       * @param state {boolean} true表示需要隐藏、false表示需要显示
       * @example 使用示例：
       * this.triggerErrEmailEl(true) //邮箱错误提示元素隐藏
       */
      triggerErrEmailEl = (state)=>{
        const errEmailEl = this.querySelector('.zora-err-item.err-email')
        state ? errEmailEl.classList.add('hidden') : errEmailEl.classList.remove('hidden')
      }
      /**
       * @description 内容提示元素
       * @param state {boolean} true表示需要隐藏、false表示需要显示
       * @example 使用示例：
       * this.triggerErrInfoEl(true) //内容提示元素隐藏
       */
      triggerErrInfoEl = (state)=>{
        const errInfoEl = this.querySelector('.zora-err-item.err-info')
        state ? errInfoEl.classList.add('hidden') : errInfoEl.classList.remove('hidden')
      }
      /**
       * @description 表单提交按钮
       * @param state {boolean} true表示可提交、false表示禁用提交
       * @example 使用示例：
       * this.triggerSubmit(true) //表单按钮可提交
       */
      triggerSubmit = (state)=>{
        const submitEl = this.querySelector('#'+ this.dataset.submit)
        state ? submitEl.className = "zora-btn zora-auth-btn" : submitEl.className = "zora-btn zora-disabled-btn"
        submitEl.disabled = !state
      }
      /**
       * @description trigger验证码验证按钮
       * @param state {boolean} 根据状态调整验证码验证按钮，true表示按钮禁用、false表示按钮可用
       * @example 使用示例：
       * this.triggerCodeVerifyEl(true) //验证码验证按钮禁用
       */
      triggerCodeVerifyEl = (state)=>{
        const codeVerifyEl = this.querySelector('.zora-code-verify')
        state ? codeVerifyEl.classList.add('zora-disabled') : codeVerifyEl.classList.remove('zora-disabled')
        codeVerifyEl.disabled = state
      }
      /**
       * @description trigger密码校验提示元素显隐
       * @param state {boolean} 根据状态调整密码校验提示元素，true表示需要隐藏、false表示需要显示
       * @example 使用示例：
       * this.triggerErrPwdEl(true) //隐藏密码校验提示元素
       */
      triggerErrPwdEl = (state)=>{
        const errPwdEl = this.querySelector('.zora-err-item.err-pwd')
        state ? errPwdEl.classList.add('hidden') : errPwdEl.classList.remove('hidden')
      }
      /**
       * @description trigger显隐注册相关元素（昵称、验证元素、营销元素）
       * @param state {boolean} 根据状态调整注册相关元素，true表示需要隐藏、false表示显示
       * @example 使用示例：
       * this.triggerRegisterElements(true) //隐藏注册相关元素
       */
      triggerRegisterElements = (state)=>{
        const firstNameEl = this.querySelector('#zora-firstName')
        const lastNameEl = this.querySelector('#zora-lastName')
        const checkBoxEl = this.querySelector('.zora-check-box')
        const verifyEl = this.querySelector('.zora-verify-box')
        //若是邮箱已存在，说明需要登录，需要隐藏注册时需要的验证码相关元素，反之则隐藏登录时的验证码登录相关元素
        const pwdCodeEl = this.querySelector('.zora-form-pwd-box .zora-auth-way-box')
        state ? firstNameEl.classList.add('hidden') : firstNameEl.classList.remove('hidden')
        state ? lastNameEl.classList.add('hidden') : lastNameEl.classList.remove('hidden')
        state ? checkBoxEl.classList.add('hidden') : checkBoxEl.classList.remove('hidden')
        state ? verifyEl.classList.add('hidden') : verifyEl.classList.remove('hidden')
        state ? pwdCodeEl.classList.remove('hidden') : pwdCodeEl.classList.add('hidden')
      }
      /**
       * @description 验证码相关元素状态初始化（验证码倒计时隐藏、验证码验证按钮禁用与隐藏、验证码发送按钮显示）
       */
      verifyCodeElementsDefaultStatus = ()=>{
        this.querySelector('.zora-code-verify').classList.add('hidden')
        this.querySelector('.zora-code-verify').disabled = true
        this.querySelector('.zora-code-send').classList.remove('hidden')
        this.querySelector('.zora-ex').classList.add('hidden')
      }
      /**
       * @description 使用 Web Crypto API 进行 SHA-256 哈希
       * @param password {string} 需要加密的密码
       * @returns {Promise<*>} 返回加密后的结果（带加密密码）
       * @example 使用示例：
       * this.hashPassword(password).then(res=>{})
       * //or
       * const hashPwd = await this.hashPassword(password)
       */
      hashPassword = async (password) =>{
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    }
    customElements.define('zora-auth-form-component', ZoraAuthFormComponent);
}

if(!customElements.get('zora-send-component')){
  class ZoraSendComponent extends HTMLElement {
    constructor() {
      super();
      this.activeSendEl = this.querySelector('.zora_icon_box.active-send')
      this.normalSendEl = this.querySelector('.zora_icon_box.normal-send')
      this.msg = undefined
      this.inputEl = document.querySelector('.zora-message-input')
      this.inputEl.addEventListener('input', this.listenInput)
      this.inputEl.addEventListener('keyup',this.enterKey)
      this.activeSendEl.addEventListener('click', this.sendMessage)
    }
    sendMessage = ()=>{
      if(this.msg.length){
        const {agentInfo,userId} = JSON.parse(sessionStorage.getItem('zora_userInfo'))
        const messageBody = {
          senderId: userId,
          senderType: 'CUSTOMER',
          contentType: 'TEXT',
          msgStatus: 'SENDING',
          recipientType: 'AGENT',
          recipientId: agentInfo.id,
          contentBody: this.msg,
          msgId: 'msg_'+ new Date().getTime(),
          conversationId: sessionStorage.getItem('zora_conversation_id'),
          timestamp: new Date().getTime(),
        }
        socket.emit('sendMessage',JSON.stringify(messageBody))
        renderMessage.addMessage(messageBody,0)
        this.inputEl.value = ''
        this.msg = ''
        this.activeSendEl.classList.add('hidden')
        this.normalSendEl.classList.remove('hidden')
      }
    }
    listenInput = (e)=>{
      this.msg = e.target.value.trim()
    }
    enterKey = (e)=>{
      if(e.keyCode === 13){
        this.sendMessage()
      }
    }
  }

  customElements.define('zora-send-component', ZoraSendComponent);
}

/**
 * 气泡框
 */
if(!customElements.get('zora-bubble')){
  customElements.define('zora-bubble', class extends HTMLElement {
    constructor(){
      super();
      this.close = this.querySelector(`.${this.dataset['close']}`)
      this.container = this.querySelector(`.${this.dataset['container']}`)
      this.close.addEventListener('click',this.closeBubble)
    }
    closeBubble = ()=>{
      this.container.classList.add('hidden')
    }
  })
}

