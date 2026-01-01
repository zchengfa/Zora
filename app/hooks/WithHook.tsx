
function WithHook(WrapperComponent:any){
  function ComponentProps(props:any){

    return <WrapperComponent {...props} ></WrapperComponent>
  }
  return ComponentProps
}

export default WithHook
