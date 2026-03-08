import React,{FormEvent,useRef, useState} from "react";
import ZoraChatStyle from '@styles/componentStyles/ZoraChat.module.scss'
import ZoraPopover from "@components/common/ZoraPopover.tsx";
import ZoraProduct from "@components/ZoraProduct.tsx";
import {useAppTranslation} from "@hooks/useAppTranslation.ts";

// 表情数据
const EMOJIS = [
  { icon: '😀', name: 'grinning_face' },
  { icon: '😂', name: 'joy' },
  { icon: '😍', name: 'heart_eyes' },
  { icon: '🤔', name: 'thinking_face' },
  { icon: '😎', name: 'sunglasses' },
  { icon: '🥳', name: 'hugging_face' },
  { icon: '😢', name: 'cry' },
  { icon: '😡', name: 'angry' },
  { icon: '👍', name: 'thumbs_up' },
  { icon: '👎', name: 'party_popper' },
  { icon: '❤️', name: 'heart' },
  { icon: '🔥', name: 'fire' },
  { icon: '✨', name: 'sparkles' },
  { icon: '🎉', name: 'tada' },
  { icon: '💯', name: '100' },
  { icon: '🚀', name: 'rocket' },
  { icon: '💪', name: 'muscle' },
  { icon: '👏', name: 'clap' },
  { icon: '🤝', name: 'handshake' },
  { icon: '🙏', name: 'pray' },
  { icon: '⭐', name: 'star' },
  { icon: '🌟', name: 'glowing_star' },
  { icon: '💕', name: 'two_hearts' },
  { icon: '💋', name: 'kiss_mark' },
];

interface ZoraChatProps {
  sendMessage: (msg:string) => void
}

const ZoraChat:React.FC<ZoraChatProps> = (
  {sendMessage}
)=>{
  const {translation} = useAppTranslation();
  const ct = translation.components.chat;
  const [inputChatMsg,setInputChatMsg] = useState('')
  const inputChatRef = useRef<HTMLInputElement>(null)
  const [isOpenRec,setOpenRec] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

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

  const toggleEmojiPicker = ()=>{
    setShowEmojiPicker(!showEmojiPicker)
  }

  const insertEmoji = (emoji:string)=>{
    setInputChatMsg(prev => prev + emoji)
    setShowEmojiPicker(false)
    inputChatRef.current?.focus()
  }

  // 点击外部关闭表情选择器
  const handleClickOutside = (e: MouseEvent)=>{
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
      setShowEmojiPicker(false)
    }
  }

  React.useEffect(()=>{
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return ()=>{
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  return <div className={ZoraChatStyle.zoraChatContainer} onKeyDown={listenEnterKey}>
    <div className={ZoraChatStyle.zoraContent}>
      <div className={ZoraChatStyle.zoraRecBox} onClick={openProductRecommend}>
        <svg  className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
              width="1em" height="1em">
          <path
            d="M922.802087 223.321043L556.699826 11.976348a89.266087 89.266087 0 0 0-89.266087 0L101.286957 223.232a89.622261 89.622261 0 0 0-44.52174 77.467826v422.689391a89.488696 89.488696 0 0 0 44.52174 77.334261l366.10226 211.389218a89.755826 89.755826 0 0 0-44.521739-77.378783V300.699826a89.35513 89.35513 0 0 0-44.521739-77.378783z m-14.870261 500.023653a29.918609 29.918609 0 0 1-14.870261 25.778087l-366.102261-211.344696a29.918609 29.918609 0 0 1-14.870261-25.733565V300.699826a29.918609 29.918609 0 0 1 14.870261-25.778087l366.102261-211.389217a29.785043 29.785043 0 0 1 29.785043 0l366.191305 211.389217a29.785043 29.785043 0 0 1 14.870261 25.778087v422.64487z"
            fill="currentColor" ></path>
          <path
            d="M817.997913 302.970435l-305.241043 172.521739-305.241044-172.521739a30.141217 30.141217 0 1 0-29.651478 52.446608l304.172522 171.942957v356.574609a30.141217 30.141217 0 0 0-29.651478-52.446608z"
            fill="currentColor" ></path>
        </svg>
        {
          isOpenRec ? <ZoraPopover>
            <ZoraProduct></ZoraProduct>
          </ZoraPopover> : null
        }
      </div>
      <div className={ZoraChatStyle.zoraInputBox}>
        <div className={ZoraChatStyle.inputWrapper}>
          <input
            name={'chatInput'}
            ref={inputChatRef}
            value={inputChatMsg}
            onInput={(event: FormEvent) => chatInputHandler(event)}
            className={ZoraChatStyle.zoraInputChat}
            type="text"
            placeholder={ct.inputPlaceholder}
          />
          <div
            className={ZoraChatStyle.emojiButton}
            onClick={toggleEmojiPicker}
          >
            😊
          </div>
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className={ZoraChatStyle.emojiPicker}
            >
              <div className={ZoraChatStyle.emojiGrid}>
                {EMOJIS.map((emoji, index) => (
                  <div
                    key={index}
                    className={ZoraChatStyle.emojiItem}
                    onClick={() => insertEmoji(emoji.icon)}
                  >
                    {emoji.icon}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
}

export default ZoraChat
