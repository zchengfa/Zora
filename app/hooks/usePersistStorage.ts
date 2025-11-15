import {useState,useEffect} from "react";

export const usePersistStorage = (key:string,defaultValue:string):[string,(value:string)=> void] => {
  const [theme,changeTheme] = useState(defaultValue)

  useEffect(()=>{
    const themeStorage = (localStorage.getItem(key)) as string;
    changeTheme(themeStorage);
  },[key])

  const setPersistTheme = (value:string)=>{
    changeTheme(value)
    localStorage.setItem(key,value)
  }

  return [theme,setPersistTheme]
}
