// @hooks/usePersistStorage.ts
import { useState, useEffect } from "react";

export const usePersistStorage = (
  key: string,
  defaultValue: string
): [string, (value: string) => void] => {
  // 初始状态始终为 defaultValue（保证 SSR/客户端一致）
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    // 仅在客户端运行
    const storedValue = localStorage.getItem(key);
    // 只有当 localStorage 有有效值时才更新
    if (storedValue !== null) {
      setValue(storedValue);
    }
  }, [key]);

  const setPersistedValue = (newValue: string) => {
    setValue(newValue);
    localStorage.setItem(key, newValue);
  };

  return [value, setPersistedValue];
};
