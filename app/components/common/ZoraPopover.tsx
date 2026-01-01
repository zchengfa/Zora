import React, {ReactElement} from 'react'
import ZoraPopoverStyle from '@styles/componentStyles/ZoraPopover.module.scss'
interface ZoraPopoverProps{
  children?: ReactElement
}
const ZoraPopover:React.FC<ZoraPopoverProps> = ({children})=>{
  return <div className={ZoraPopoverStyle.container}>
    {
      children ? children : <div>popover</div>
    }
  </div>
}

export default ZoraPopover
