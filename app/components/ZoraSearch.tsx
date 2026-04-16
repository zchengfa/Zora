import ZoraSearchStyle from '@styles/componentStyles/ZoraSearch.module.scss'
import {useState, useEffect, forwardRef, useImperativeHandle, useRef} from "react";
import {useAppTranslation} from "@hooks/useAppTranslation.ts";

interface ZoraSearchProps {
  placeholder?: string;
  onSearch?: (keyword: string) => void;
  searchResult?: any[];
  onSearchResultClick?: (customer: any) => void;
}

interface ZoraSearchRef {
  focus: () => void;
}

const ZoraSearch = forwardRef<ZoraSearchRef, ZoraSearchProps>((props, ref) => {
  const {translation} = useAppTranslation();
  const ct = translation.components.chat;
  const [mouseEntered, setInputStatus] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null);

  // 暴露focus方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef?.current?.focus();
    }
  }));

  const mouseEvent = () => {
    setInputStatus(!mouseEntered)
  }

  const inputChange = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const value = e.target.value.trim();
    setInputValue(value);

    // 防抖处理
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (props.onSearch) {
        props.onSearch(value);
      }
    }, 300);

    setDebounceTimer(timer);
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const {placeholder, searchResult} = props
  return <div className={ZoraSearchStyle.container}>
    <input ref={inputRef} name={'searchInput'} value={inputValue} onChange={inputChange} onMouseEnter={mouseEvent} onMouseLeave={mouseEvent} className={mouseEntered ? ZoraSearchStyle.inputActive : ZoraSearchStyle.input} placeholder={placeholder} />
    <div className={mouseEntered ? ZoraSearchStyle.searchIconActive : ZoraSearchStyle.searchIcon}>
      <s-icon type={'search'}></s-icon>
    </div>
    {
      inputValue?.length ? <div className={ZoraSearchStyle.searchResult}>
        {
          searchResult?.length ? (
            <div className={ZoraSearchStyle.resultList}>
              {searchResult.map((customer: any) => (
                <div
                  key={customer.id}
                  className={ZoraSearchStyle.resultItem}
                  onClick={() => props.onSearchResultClick?.(customer)}
                >
                  <img
                    src={customer.avatar || '/assets/default_avatar.jpg'}
                    alt={customer.firstName}
                    className={ZoraSearchStyle.resultAvatar}
                  />
                  <div className={ZoraSearchStyle.resultInfo}>
                    <span className={ZoraSearchStyle.resultName}>
                      {customer.last_name + ' ' + customer.first_name}
                    </span>
                    <span className={ZoraSearchStyle.resultEmail}>
                      {customer.email}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className={ZoraSearchStyle.emptyBox}>
            <span>{ct.noResult}</span>
          </div>
        }
      </div> : null
    }
  </div>
});

export default ZoraSearch;
