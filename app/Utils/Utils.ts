/**
 * 处理给定时间与当前时间的间隔时间（五分钟前、当天几点几分、昨天几时几分、前天几时几分、星期一到七几时几分、几年几月几日几时几分）
 * @param time { number } 给定时间
 * @param separator { string | string[] | undefined } 时间分割符
 * @return { string } 返回处理后的时间
 */
export function dealMsgTime (time:number,separator:string | string[] = ['/',':']): string{

  //返回处理后的时间
  let showTime: string,YS = '',HS = ''
  const S = Object.prototype.toString.call(separator)

  if( S === '[object String]' ){
    YS = `YYYY` + separator + `MM` + separator + `DD`
    HS = `hh` + separator + `mm`
  }
  else if(Array.isArray(separator) ){
    if(Array.isArray(separator[0]) && Array.isArray(separator[1])){
      YS = `YYYY` + separator[0][0] + `MM` + separator[0][1] + `DD` + separator[0][2]
      HS = `hh` + separator[1][0] + `mm` + separator[1][1]
    }
    else{
      separator[0].length ? YS = `YYYY` + separator[0].toString() + `MM` + separator[0].toString() + `DD` : YS = `YYYY-MM-DD`
      separator[1].length ? HS = `hh` + separator[1] + `mm` : HS = `hh:mm`
    }

  }
  else if( S === '[object Undefined]' ){
    YS = 'YYYY-MM-DD'
    HS = `hh:mm`
  }


  //获取当前时间(年月日)
  const nowDate = new Date()
  const NY = nowDate.getFullYear(),NM = nowDate.getMonth(),ND = nowDate.getDate()

  //获取给定的时间属于哪年哪月哪日
  const timeDate = new Date(time)
  const TY = timeDate.getFullYear(),TM = timeDate.getMonth(),TD = timeDate.getDate()

  //给定时间的几时几分
  let HM = timeFormatting(HS,new Date(time))

  //判断给定时间与当前时间是否是同年同月
  if( NY === TY && NM === TM ){
    let str = ''
    const interval = ND - TD

    //再判断间隔天数(1.是否同一天、2.间隔一天、3.间隔两天、4.间隔三到七天、5.超过七天)
    if( ND === TD){
      //同一天（判断间隔是否超过5分钟）
      const fiveMinutes = 5*60*1000
      if(nowDate.getTime() - time >= fiveMinutes && nowDate.getTime() - time <= 7*60*1000){
        HM = '五分钟前'
      }
      str = ''

      //时间为及时几分格式时，处理小时（去掉小时前的0）
      if(Number(HM.substring(0,1)) === 0){
        HM = HM.substring(1,HM.length)
      }

    }
    else if( interval === 1 ){
      //间隔一天
      str = '昨天'
    }
    else if( interval === 2){
      //间隔两天
      str = '前天'
    }
    else if(interval >= 3 && interval <= 7){
      //间隔三道七天获取给定时间是在星期几
      const week = new Date(time).getDay()
      switch (week) {
        case 0:
          str = '星期天';
          break;
        case 1:
          str = '星期一';
          break;
        case 2:
          str = '星期二';
          break;
        case 3:
          str = '星期三';
          break;
        case 4:
          str = '星期四';
          break;
        case 5:
          str = '星期五';
          break;
        case 6:
          str = '星期六';
          break;
      }
    }
    else if(interval > 7){
      str = timeFormatting(YS,new Date(time))
      HM = timeFormatting(HS,new Date(time))
    }

    showTime = str + HM

  }
  else{
    //异年同月或同年异月
    //showTime = timeFormatting(YS + ' ' + HS,new Date(time))
    //只显示年月日
    showTime = timeFormatting(YS,new Date(time))
  }

  return showTime
}

declare global {
  interface Date {
    format(fmt:string):string
  }
}

export function timeFormatting (fm:string,time?:Date | number | string){
  //拓展Date的时间格式化函数
  // eslint-disable-next-line no-extend-native
  Date.prototype.format = function (fmt:string):string{
    const formatObject:{[key:string]: any} = {
      "M+": this.getMonth() + 1,                   //月份
      "D+": this.getDate(),                        //日
      "h+": this.getHours(),                       //小时
      "m+": this.getMinutes(),                     //分
      "s+": this.getSeconds(),                     //秒
      "q+": Math.floor((this.getMonth() + 3) / 3), //季度
      "S": this.getMilliseconds()                  //毫秒
    };

    //  获取年份
    // ①
    if (/(y+)/i.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (const k in formatObject) {
      // ②
      if (new RegExp("(" + k + ")", "g").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1, (RegExp.$1.length === 1) ? (formatObject[k]) : (("00" + formatObject[k]).substr(("" + formatObject[k]).length)));

      }

    }
    return fmt;
  }
  if (time){
    return time.format(fm)
  }
  else {
    return new Date().format(fm)
  }

}
