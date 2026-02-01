import React,{FormEvent,useRef, useState} from "react";
import ZoraChatStyle from '@styles/componentStyles/ZoraChat.module.scss'
import ZoraPopover from "@components/common/ZoraPopover.tsx";
import ZoraProduct from "@components/ZoraProduct.tsx";

interface ZoraChatProps {
  sendMessage: (msg:string) => void
}
const ZoraChat:React.FC<ZoraChatProps> = (
  {sendMessage}
)=>{
  const [inputChatMsg,setInputChatMsg] = useState('')
  const inputChatRef = useRef<HTMLInputElement>(null)
  const [isOpenRec,setOpenRec] = useState(false)

  const chatInputHandler = (e:FormEvent)=>{
    setInputChatMsg(e.target?.value.trim())
  }
  const listenEnterKey = (e:KeyboardEvent)=>{
    if(e.keyCode === 13 && inputChatMsg.length >= 1){
      sendMessage(inputChatMsg)
      setInputChatMsg('')
    }
  }

  const openProductRecommend = ()=>{
    setOpenRec(!isOpenRec)
  }

  return <div className={ZoraChatStyle.zoraChatContainer} onKeyDown={listenEnterKey}>
    <div className={ZoraChatStyle.zoraContent}>
      <div className={ZoraChatStyle.zoraRecBox} onClick={openProductRecommend}>
        <svg  className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
              width="1em" height="1em">
          <path
            d="M922.802087 223.321043L556.699826 11.976348a89.266087 89.266087 0 0 0-89.266087 0L101.286957 223.232a89.622261 89.622261 0 0 0-44.52174 77.467826v422.689391a89.488696 89.488696 0 0 0 44.52174 77.334261l366.10226 211.389218a89.755826 89.755826 0 0 0 89.266087 0l366.102261-211.344696a89.622261 89.622261 0 0 0 44.521739-77.378783V300.699826a89.35513 89.35513 0 0 0-44.521739-77.378783z m-14.870261 500.023653a29.918609 29.918609 0 0 1-14.870261 25.778087l-366.102261 211.344695a29.918609 29.918609 0 0 1-29.740521 0l-366.146783-211.389217a29.785043 29.785043 0 0 1-14.870261-25.733565V300.699826a29.918609 29.918609 0 0 1 14.870261-25.778087l366.102261-211.389217a29.918609 29.918609 0 0 1 29.785043 0l366.191305 211.389217a29.785043 29.785043 0 0 1 14.870261 25.778087v422.64487z"
            fill="currentColor" ></path>
          <path
            d="M817.997913 302.970435l-305.241043 172.521739-305.241044-172.521739a30.141217 30.141217 0 1 0-29.651478 52.446608l304.172522 171.942957v356.574609a30.141217 30.141217 0 0 0 60.282434 0V528.027826l305.374609-172.566261a30.141217 30.141217 0 1 0-29.651478-52.446608z"
            fill="currentColor" ></path>
        </svg>
        {
          isOpenRec ? <ZoraPopover>
            <ZoraProduct></ZoraProduct>
          </ZoraPopover> : null
        }
      </div>
      <div className={ZoraChatStyle.zoraInputBox}>
        <input name={'chatInput'} ref={inputChatRef} value={inputChatMsg}
               onInput={(event: FormEvent) => chatInputHandler(event)}
               className={ZoraChatStyle.zoraInputChat} type="text"
               placeholder={'type something'}/>
      </div>
      <div className={ZoraChatStyle.zoraEmojiBox}>
        <svg className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
             width="1em" height="1em" fill={'currentColor'}>
          <path
            d="M512 64.5c-247.4 0-448 200.6-448 448s200.6 448 448 448 448-200.6 448-448-200.6-448-448-448z m0 864c-229.4 0-416-186.6-416-416s186.6-416 416-416 416 186.6 416 416-186.6 416-416 416z m-224-576c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z m448 0c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z m-48 192c-8.8 0-16 7.2-16 16 0 60.7-73.3 112-160 112s-160-51.3-160-112c0-8.8-7.2-16-16-16s-16 7.2-16 16c0 79.5 86 144 192 144s192-64.5 192-144c0-8.8-7.2-16-16-16z"
          ></path>
        </svg>
      </div>
      <div className={ZoraChatStyle.zoraAddBox}>
        <svg className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
             width="1em" height="1em" fill={'currentColor'}>
          <path
            d="M741.546667 493.037037 494.933333 493.037037 494.933333 246.423704c0-13.463704-8.533333-24.272593-18.962963-24.272593-10.42963 0-18.962963 10.808889-18.962963 24.272593L457.007407 493.037037 210.394074 493.037037c-13.368889 0-24.272593 8.533333-24.272593 18.962963 0 10.42963 10.903704 18.962963 24.272593 18.962963L457.007407 530.962963l0 246.613333c0 13.368889 8.533333 24.272593 18.962963 24.272593 10.42963 0 18.962963-10.903704 18.962963-24.272593L494.933333 530.962963l246.613333 0c13.463704 0 24.272593-8.533333 24.272593-18.962963C765.819259 501.57037 755.01037 493.037037 741.546667 493.037037z"
          ></path>
        </svg>
      </div>
    </div>
  </div>
}

export default ZoraChat
