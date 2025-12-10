import {zoraSocket} from "@Utils/socket.ts";

function WithHook(WrapperComponent:any){
  function ComponentProps(props:any){

    const socket = zoraSocket('wss://163d6c873351.ngrok-free.app');

    return <WrapperComponent {...props} socket = { socket }></WrapperComponent>
  }
  return ComponentProps
}

export default WithHook
