import {zoraSocket} from "@Utils/socket.ts";

function WithHook(WrapperComponent:any){
  function ComponentProps(props:any){

    const socket = zoraSocket('wss://zora-5fc1.onrender.com');

    return <WrapperComponent {...props} socket = { socket }></WrapperComponent>
  }
  return ComponentProps
}

export default WithHook
