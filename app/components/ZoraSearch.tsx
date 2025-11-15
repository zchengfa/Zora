import ZoraSearchStyle from '../styles/componentStyles/ZoraSearch.module.scss'
import {useState} from "react";

export default function ZoraSearch(props:any){

  const [mouseEntered, setInputStatus] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const mouseEvent = () => {
    setInputStatus(!mouseEntered)
  }

  const inputChange = (e:any)=>{
    setInputValue(e.target.value.trim())
  }

  const {placeholder,searchResult} = props
  return <div className={ZoraSearchStyle.container}>
    <input value={inputValue} onChange={inputChange} onMouseEnter={mouseEvent} onMouseLeave={mouseEvent} className={mouseEntered ? ZoraSearchStyle.inputActive : ZoraSearchStyle.input} placeholder={placeholder} />
    <div className={mouseEntered ? ZoraSearchStyle.searchIconActive : ZoraSearchStyle.searchIcon}>
      <s-icon type={'search'}></s-icon>
    </div>
    {
      inputValue?.length ? <div className={ZoraSearchStyle.searchResult}>
        {
          searchResult?.length ? null : <div className={ZoraSearchStyle.emptyBox}>
            <span>no result</span>
          </div>
        }
      </div> : null
    }
  </div>
}
