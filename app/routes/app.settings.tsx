
import { usePersistStorage } from '@hooks/usePersistStorage';

export default function AppSettings() {
  const LOCALSTORAGE_KEY = 'YCChat_application_theme';
  const [theme, setPersistTheme] = usePersistStorage(LOCALSTORAGE_KEY, 'light');

  const changeSwitch = () => {
    const newState = theme === 'dark' ? 'light' : 'dark';
    setPersistTheme(newState);
    const htmlEl = document.getElementsByTagName('html')[0]
    htmlEl.setAttribute('data-theme',newState)
  };

  return (
    <div>
      <s-switch
        label="change application theme"
        checked={theme === 'dark'}
        onChange={changeSwitch}
      />
    </div>
  );
}
