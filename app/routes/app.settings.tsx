import {usePersistStorage} from '../hooks/usePersistStorage'
export default function AppSettings (){
  const LOCALSTORAGE_KEY = 'YCChat_application_theme'
  const [theme,setPersistTheme] = usePersistStorage(LOCALSTORAGE_KEY,'light')
  const changeSwitch = ()=>{
    const state = theme === 'dark' ? 'light' : 'dark'

    setPersistTheme(state)
    const htmlEl = document.getElementsByTagName('html')[0]
    htmlEl.setAttribute('data-theme',state)
  }

  return <div>
    <s-switch label={'change application theme'} defaultChecked={false} checked={ theme === 'dark'} onChange={changeSwitch}></s-switch>
  </div>
}
