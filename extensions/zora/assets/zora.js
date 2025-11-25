

const FETCH_BASE_URL = "http://localhost:8080";
const ZORA_TOKEN = "zora_auth_token"

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
            //根据按钮状态改变类型变换样式
            if(this.isBtnState){
               this.defaultBtnEl.className = 'zora-default-btn-box btn-box-hidden'
               this.activeBtnEl.className = 'zora-active-btn-box'
               document.querySelector('.' + this.dataset.targetClass).className = this.dataset.activeClass
            }
            else{
               this.defaultBtnEl.className = 'zora-default-btn-box'
               this.activeBtnEl.className = 'zora-active-btn-box btn-box-hidden'
               document.querySelector('.' + this.dataset.activeClass).className = this.dataset.targetClass
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
                document.querySelector('.'+ this.dataset.target).className = `${this.dataset.target} zora_icon_box hidden`
                document.querySelector('.'+ this.dataset.targetActive).className = `${this.dataset.targetActive} zora_icon_box`
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
                //发送消息（待开发）
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
                const response = await fetch(`${FETCH_BASE_URL}/auth`,{
                    method: 'POST',
                    headers: setHeaders(),
                    body:JSON.stringify({token})
                })
                console.log(response)
            }
            else{
                this.showAuthBox()
            }
            //  //改变聊天框高度
            // document.querySelector('.'+ this.dataset.targetMsg).className = this.dataset.targetMsgActive
            // //输入框显示
            // document.querySelector('.'+ this.dataset.input).className = this.dataset.input
            // //隐藏联系按钮
            // this.className = 'zora-chat-btn-component hidden'
            // //隐藏标题
            // document.querySelector('.'+ this.dataset.header).className = `${this.dataset.header} hidden`
            // //显示返回元素
            // document.querySelector('.'+ this.dataset.headerActive).className = this.dataset.headerActive
        }
        showAuthBox = () =>{
            document.querySelector('.'+ this.dataset.container).className = `${this.dataset.container} hidden`
            document.querySelector('.'+ this.dataset.authContainer).className =  this.dataset.authContainer
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
            document.querySelector('.'+ this.dataset.input).className = `${this.dataset.input} hidden`
            //隐藏返回头部
            document.querySelector('.zora-header-active-box').className = 'zora-header-active-box hidden'
            //显示标题
            document.querySelector('.'+ this.dataset.header).className = this.dataset.header
            //显示联系按钮
            document.querySelector('.zora-chat-btn-component.hidden').className = 'zora-chat-btn-component'
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
          marketEmail: false,
          marketSms: false,
        }
        this.verifyCode = ''
        this.endTime = undefined
        this.zoraTimer = null
        this.validateStatus = undefined
        //阻止表单的默认行为
        this.querySelector('#zora-auth-form').addEventListener('submit', function (e) {
          e.preventDefault();
        })
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
      }

      btnSubmit = async () => {
        const hashPwd = await this.hashPassword(this.formData.password)
        this.formData.password = hashPwd
        fetch(FETCH_BASE_URL + '/auth', {
            method: 'POST',
            headers: setHeaders(),
            body: JSON.stringify(this.formData)
        })
      }
      listenInput = () => {
        const targets = [this.dataset.email, this.dataset.firstName, this.dataset.lastName, this.dataset.pwd, this.dataset.marketEmail, this.dataset.marketSms]
        targets.forEach(target => {
          this.querySelector('#' + target).addEventListener('input', (e) => {
            switch (target) {
              case this.dataset.email:
                this.formData.email = e.target.value.trim()
                break;
              case this.dataset.firstName:
                this.formData.firstName = e.target.value.trim()
                break;
              case this.dataset.lastName:
                this.formData.lastName = e.target.value.trim()
                break;
              case this.dataset.pwd:
                this.formData.password = e.target.value.trim()
                break;
              case this.dataset.marketEmail:
                this.formData.marketEmail = e.target.checked
                break;
              case this.dataset.marketSms:
                this.formData.marketSms = e.target.checked
                break;
              default:
                break;
            }
            this.debounceCheckInputValue()
          })
        })

      }
      checkAllFilled() {
        //检查所有输入框都是否有值
        const targets = ['email', 'firstName', 'lastName','password']
        return targets.every(target => this.formData[target])
      }
      debounceCheckInputValue = debounce(() => {
        const isAllFilled = this.checkAllFilled()
        // 检查密码强度
        if(!this.checkPasswordStrength(this.formData.password)){
          this.querySelector('.zora-err-item.err-pwd').className = "zora-err-item err-pwd"
        }
        else{
          this.querySelector('.zora-err-item.err-pwd').className = "zora-err-item err-pwd hidden"
        }

        // 检查邮箱格式
        if(!this.validateEmail(this.formData.email)){
         this.querySelector('.zora-err-item.err-email').className = "zora-err-item err-email"
         //隐藏验证元素
         this.querySelector('.zora-verify-box').className = "zora-verify-box hidden"
        }
        else{
          this.querySelector('.zora-err-item.err-email').className = "zora-err-item err-email hidden"
          this.changeEmailValidateBox()
        }

        if(isAllFilled){
            this.querySelector('.zora-err-item.err-info').className = "zora-err-item err-info hidden"
            console.log(isAllFilled,'hidden')
        }

        if (isAllFilled && this.checkPasswordStrength(this.formData.password) && this.validateEmail(this.formData.email)) {
           //再加一层判断，判断邮箱是否验证通过，不需要验证的直接显示验证通过
          if(this.validateStatus){
            this.querySelector('#'+ this.dataset.submit).className = "zora-btn zora-auth-btn"
            this.querySelector('#'+ this.dataset.submit).disabled = false
          }
        }
        else{
            this.querySelector('#'+ this.dataset.submit).className = "zora-btn zora-disabled-btn"
            this.querySelector('#'+ this.dataset.submit).disabled = true
            this.querySelector('.zora-err-item.err-info').className = "zora-err-item err-info"
            console.log(isAllFilled,'show')
        }
      })
      changeEmailValidateBox = ()=>{
        /*
          * 邮箱格式验证通过后
          * 1.发送检测用户是否注册过的请求
          * 2.根据返回结果，显示不同的元素
          *   2.1 已注册则不显示邮箱验证，可登录按钮显示
          *   2.2 未注册则显示邮箱验证，可登录按钮等验证通过后再显示
          */
        //发起请求前先判断当前的验证元素是否为隐藏状态，如果是则不发起请求
        if( window.getComputedStyle(this.querySelector('.zora-verify-box')).display === 'none'){
            fetch(`${FETCH_BASE_URL}/checkEmail`,{
              method: 'POST',
              headers: setHeaders(),
              body: JSON.stringify({
              email: this.formData.email
            })
         }).then(res=>res.json()).then(res=>{
            //如果邮箱已注册，则不显示验证元素
            if(res.isExist){
              //直接将验证状态变为true
              this.validateStatus = true
              this.querySelector('.zora-verify-box').className = "zora-verify-box hidden"
            }
            //如果邮箱未注册，则显示验证元素
            else{
              this.querySelector('.zora-verify-box').className = "zora-verify-box"
            }
          })
        }

      }
      validateEmail = (email)=> {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email); // 返回 true 或 false
      }
      checkPasswordStrength = (password)=>{
        // 定义正则表达式
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,20}$/;

        // 测试密码是否符合规则
        return strongPasswordRegex.test(password);
      }
      sendVerifyCode = ()=>{
        /**
         * 点击按钮发送验证码获取请求
         * 1.发送验证码获取请求
         * 2.等待请求响应，响应发送成功，隐藏发送按钮，显示倒计时，响应失败，显示错误信息
         */
        fetch(`${FETCH_BASE_URL}/sendVerifyCodeToEmail`,{
          method:'POST',
          headers: setHeaders(),
          body: JSON.stringify({
            email:this.formData.email
          })
        }).then(response => response.json()).then(res => {
          //收到验证码发送成功的响应
          if(res.success){
            //清除之前的定时器
            if(this.zoraTimer){
              clearInterval(this.zoraTimer)
            }
            this.querySelector('.zora-code-send').classList.add('hidden')
            this.querySelector('.zora-ex').classList.remove('hidden')
            this.endTime = new Date().getTime() + res.code_expired * 1000
            this.countDown()
            //隐藏发送按钮，显示计时元素
             this.zoraTimer = setInterval(()=>{
              this.countDown()
            },1000)
          }
        })
      }
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
      verifyCodeInput = (e)=>{
          if(this.zoraTimer){
            this.querySelector('.zora-ex').className = "zora-ex hidden"
            this.querySelector('.zora-code-send').className = 'zora-code-send hidden'
            this.querySelector('.zora-code-verify').classList.remove('hidden')
            const value = e.target.value.trim()
            this.verifyCode = value.substr(0,6)
            this.querySelector('#zora-verify-code').value = this.verifyCode
             if(this.verifyCode.length < 6){
              this.querySelector('.zora-code-verify').disabled = true
              this.querySelector('.zora-code-verify').classList.add('zora-disabled')
            }
            else{
              this.querySelector('.zora-code-verify').disabled = false
              this.querySelector('.zora-code-verify').classList.remove('zora-disabled')
            }
          }
      }
      verifyCodeBtn = ()=>{
        /**
         * 点击验证按钮
         * 1.发送验证请求
         * 2.根据验证响应进行操作,清空之前的验证码
         *    2.1 验证成功，修改验证状态，特定输出框值都验证通过提交按钮变为可点击状态,清除定时器,元素恢复到初始状态
         *    2.2 验证失败，提示错误信息，并且修改验证状态
         */
        fetch(`${FETCH_BASE_URL}/verifyCode`,{
          method: 'POST',
          headers: setHeaders(),
          body: JSON.stringify({code:this.verifyCode,email: this.formData.email})
        }).then(response => response.json()).then(res=>{

          if(res.result){
            this.validateStatus = true
            this.verifyCodeElementsDefaultStatus()
            clearInterval(this.zoraTimer)
            if(this.checkAllFilled()){
              this.querySelector('#'+ this.dataset.submit).className = "zora-btn zora-auth-btn"
              this.querySelector('#'+ this.dataset.submit).disabled = false
            }
          }
          else{
            this.validateStatus = false
            //没有验证次数了或者验证码过期，清除定时器，元素恢复到初始状态
            if(!res.left_attempt){
              this.verifyCodeElementsDefaultStatus()
              clearInterval(this.zoraTimer)
            }
            this.verifyCode = ''
            this.querySelector('#zora-verify-code').value = ''
          }
          console.log(res)
        }).catch(err=>{
          console.log(err)
        })

      }
      verifyCodeElementsDefaultStatus = ()=>{
        this.querySelector('.zora-code-verify').className = "zora-code-verify zora-disabled hidden"
        this.querySelector('.zora-code-verify').disabled = true
        this.querySelector('.zora-code-send').className = 'zora-code-send'
        this.querySelector('.zora-ex').className = "zora-ex hidden"
      }
      //使用 Web Crypto API 进行 SHA-256 哈希
      hashPassword = async (password) =>{
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    }
    customElements.define('zora-auth-form-component', ZoraAuthFormComponent);
}
