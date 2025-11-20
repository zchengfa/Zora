const startSocket = ()=>{
  const ws = new WebSocket('ws://localhost:8080');
  ws.onopen = () => {
    console.log('Connection opened');
  }
}
startSocket();

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
        btnClick = () =>{
             //改变聊天框高度
            document.querySelector('.'+ this.dataset.targetMsg).className = this.dataset.targetMsgActive
            //输入框显示
            document.querySelector('.'+ this.dataset.input).className = this.dataset.input
            //隐藏联系按钮
            this.className = 'zora-chat-btn-component hidden'
            //隐藏标题
            document.querySelector('.'+ this.dataset.header).className = `${this.dataset.header} hidden`
            //显示返回元素
            document.querySelector('.'+ this.dataset.headerActive).className = this.dataset.headerActive
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
