import BadgeStyle from '../../styles/componentStyles/Badge.module.scss'
export default function Badge({count}:{count:number}) {
  return <div className={BadgeStyle.badgeBox}>
    <span className={BadgeStyle.count}>{count < 99 ? count : '99'}</span>
  </div>
}
