import {zoraSocket} from "@Utils/socket.ts";

function WithHook(WrapperComponent:any){
  function ComponentProps(props:any){

    const socket = zoraSocket('wss://d32df8d4e015.ngrok-free.app');

    return <WrapperComponent {...props} socket = { socket }></WrapperComponent>
  }
  return ComponentProps
}

export default WithHook
