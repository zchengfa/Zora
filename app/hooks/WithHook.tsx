import {zoraSocket} from "@Utils/socket.ts";

function WithHook(WrapperComponent:any){
  function ComponentProps(props:any){

    const socket = zoraSocket('wss://cc7a5f1b2dad.ngrok-free.app');

    return <WrapperComponent {...props} socket = { socket }></WrapperComponent>
  }
  return ComponentProps
}

export default WithHook
