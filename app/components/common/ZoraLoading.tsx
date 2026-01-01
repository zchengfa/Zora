import ZoraLoadingStyle from "@styles/componentStyles/ZoraMessageItem.module.scss";
import React from "react";

const ZoraLoading = ()=> {
  return <svg className={'icon' + ' ' + ZoraLoadingStyle.loadingIcon + ' ' + ZoraLoadingStyle.loading}
              viewBox="0 0 1024 1024" version="1.1"
              xmlns="http://www.w3.org/2000/svg" width="1em" height="1em">
    <path
      d="M512 0a512.170667 512.170667 0 0 1 504.917333 426.666667H930.133333A426.837333 426.837333 0 0 0 85.333333 512a426.666667 426.666667 0 0 0 844.8 85.418667h86.784A512.170667 512.170667 0 0 1 0 512a512 512 0 0 1 512-512z"
      fill="#bfbfbf"></path>
  </svg>
}

export default ZoraLoading;
