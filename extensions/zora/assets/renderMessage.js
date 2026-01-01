
class RenderMessage {
  constructor(SENDING_THRESHOLD = 1000,MAX_WAITING_THRESHOLD = 10000) {
    this.zoraMessageContainer = document.getElementsByClassName('zora-message-item-component').item(0)
    this.zoraMsgStateTimer = new Map()
    this.zoraMaxWaitingTimer = new Map()
    this.msgStatusMap = new Map()
    this.SENDING_THRESHOLD = SENDING_THRESHOLD
    this.MAX_WAITING_THRESHOLD = MAX_WAITING_THRESHOLD
    this.intersection = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        const targetEl = this.zoraMessageContainer.querySelector(`[data-msg-unique=${entry.target.dataset['msgUnique']}]`)
        if(entry.isIntersecting){
          targetEl?.classList.remove('is-not-intersecting')
        }
        else{
          targetEl?.classList.add('is-not-intersecting')
        }
      })
    },{
      rootMargin: '0px 0px -50px 0px',
    })
    this.mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          //如果是node节点添加了，就把这个节点交给IntersectionObserver进行监听
          if (node.nodeType === 1) {
            this.intersection.observe(node);
          }
        });
      });
    });
    //监听父容器中的子节点变化
    this.mutationObserver.observe(this.zoraMessageContainer , { childList: true, subtree: true })
  }
  addMessage = (payload)=>{
    const elData = this.getElData(payload.senderType,payload.msgStatus)
    const messageHtml = `
      <div class="zora-message-item ${elData.itemClass}" data-msg-unique="${payload.msgId}">
        <div class="zora-message-avatar">
          <img class="zora-avatar" width="32px" height="32px" src="${elData.avatar}" alt="zora_avatar" />
        </div>
        <div class="zora-msg-box">
          <span class="zora-user">${elData.username}</span>
          <div class="zora-msg-content">
              <span class="zora-msg">${payload.contentBody}</span>
              ${elData.statusSvg}
              ${elData.stateEl}
          </div>
        </div>
      </div>
    `
    this.zoraMessageContainer.insertAdjacentHTML('beforeend',messageHtml)
    const parentEl = this.zoraMessageContainer.parentNode
    const msgBoxEl = document.querySelector('.zora-message-box-active')
    if(msgBoxEl){
      parentEl.scrollTo({
        top: parentEl.scrollHeight,
        behavior: 'smooth'
      })
    }
    if(payload.senderType === 'CUSTOMER'){
      this.setMessageStatus(payload.msgId, 'SENDING');
      let sendingTimer = setTimeout(()=>{
        this.zoraMsgStateTimer.delete(payload.msgId)
        if(this.getMessageStatus(payload.msgId) === 'SENDING'){
          this.updateMessageStatus(payload.msgId,payload.msgStatus)
        }
      },this.SENDING_THRESHOLD)

      //兜底，防止消息长时间没有回执
      let msgMaxTimer = setTimeout(()=>{
        this.zoraMaxWaitingTimer.delete(payload.msgId)
        if (this.getMessageStatus(payload.msgId) === 'SENDING') {
          this.updateMessageStatus(payload.msgId, 'FAILED')
        }
      },this.MAX_WAITING_THRESHOLD)
      this.zoraMsgStateTimer.set(payload.msgId,sendingTimer)
      this.zoraMaxWaitingTimer.set(payload.msgId,msgMaxTimer)
    }
  }
  getMessageStatus(msgId) {
    return this.msgStatusMap.get(msgId) || 'SENDING';
  }
  setMessageStatus(msgId, status) {
    this.msgStatusMap.set(msgId, status);
  }
  getElData = (senderType,msgStatus)=>{
    //`<span class="zora-msg-read-state hidden">${zoraResponse.responseMessage('msg_status','READ')}</span>`
    const {avatar,username,agentInfo} = JSON.parse(sessionStorage.getItem('zora_userInfo'))
    if(senderType === 'CUSTOMER'){
      return {
        itemClass: 'zora-message-right',
        stateEl: `<span class="zora-msg-read-state hidden">${zoraResponse.responseMessage('msg_status',msgStatus)}</span>`,
        username,
        avatar,
        statusSvg: `<div class="msg-status-svg-box"></div>`
      }
    }
    return {
      itemClass: 'zora-message-left',
      stateEl: '',
      username: agentInfo.name,
      avatar: agentInfo.avatarUrl,
      statusSvg: ''
    }
  }
  updateMessageStatus = (msgId,status)=>{
    const el = document.querySelector(`[data-msg-unique="${msgId}"]`)
    if(!el) return ;
    const svgBoxEl = el.querySelector('.msg-status-svg-box')
    const msgTimer = this.zoraMsgStateTimer.get(msgId)
    const msgMaxTimer = this.zoraMaxWaitingTimer.get(msgId)
    //清除之前的定时器
    if(msgTimer){
      clearTimeout(msgTimer)
      this.zoraMsgStateTimer.delete(msgId)
    }
    if(msgMaxTimer && this.getMessageStatus(msgId) !== 'SENDING'){
      clearTimeout(msgMaxTimer)
      this.zoraMaxWaitingTimer.delete(msgId)
    }

    svgBoxEl.innerHTML = this.getRenderStatusSvg(status,msgId)
  }
  getRenderStatusSvg = (status,msgId)=>{
    const readStateEl = document.querySelector(`[data-msg-unique="${msgId}"] .zora-msg-read-state`)
    if(!readStateEl) return '';
    switch (status){
      case 'FAILED':
        readStateEl.classList.add('hidden')
        return `<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"><path d="M533.333333 640a21.333333 21.333333 0 0 1 21.333334 21.333333v42.666667a21.333333 21.333333 0 0 1-21.333334 21.333333h-42.666666a21.333333 21.333333 0 0 1-21.333334-21.333333v-42.666667a21.333333 21.333333 0 0 1 21.333334-21.333333h42.666666z m-2.986666-341.333333a21.333333 21.333333 0 0 1 21.290666 22.4l-13.013333 256a21.333333 21.333333 0 0 1-21.333333 20.266666h-12.501334a21.333333 21.333333 0 0 1-21.333333-20.266666l-12.970667-256a21.333333 21.333333 0 0 1 20.224-22.357334L530.346667 298.666667z" fill="#d81e06"></path></svg>
           `
      case 'SENDING':
        readStateEl.classList.add('hidden')
        return ` <svg class="icon loading-icon loading" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"><path d="M515.698303 969.127499c-97.187972 0-191.279691-31.134554-270.406182-90.479422-96.67193-72.245926-159.45708-178.206619-176.658492-297.928439s13.245087-238.9276 85.663027-335.59953C304.120947 45.239711 588.288258 4.644381 787.99664 154.124643c83.770872 62.78515 143.459768 153.092558 168.2298 254.580884 4.300353 17.373425-6.364522 34.918864-23.737947 39.047203-17.373425 4.128339-34.918864-6.364522-39.047203-23.737947-21.157736-86.867126-72.417941-164.44549-144.147825-218.285906C578.139425 77.750378 334.395431 112.669242 206.244919 283.823282c-62.097094 82.910801-88.243239 185.087183-73.450025 287.607593s68.461616 193.34386 151.372417 255.440954c171.326054 128.322526 414.898035 93.403662 543.220561-77.922392 33.542752-44.895683 56.592642-95.123803 68.289602-149.308248 3.78431-17.373425 21.157736-28.554342 38.359147-24.770032 17.373425 3.78431 28.554342 20.985721 24.770032 38.359147-13.761129 63.473207-40.59533 122.130018-79.814547 174.422308-72.417941 96.67193-178.378633 159.45708-298.100454 176.658492C559.217873 967.579372 537.372081 969.127499 515.698303 969.127499z" fill="#8a8a8a"></path></svg>
          `
      case 'READ':
        readStateEl.classList.remove('hidden')
        readStateEl.textContent = `${zoraResponse.responseMessage('msg_status',status)}`
        return ''
      case 'DELIVERED':
        readStateEl.classList.remove('hidden')
        readStateEl.textContent = `${zoraResponse.responseMessage('msg_status',status)}`
        return ''
      default:
        readStateEl.classList.add('hidden')
        return ''
    }
  }
}

