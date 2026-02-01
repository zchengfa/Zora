import { useState, useEffect, useMemo } from "react";
import language from "@Utils/language.ts";
import { useAppBridge } from "@shopify/app-bridge-react";

export type Language = typeof language;
export type Locale = keyof Language;

const DEFAULT_LOCALE: Locale = 'en';

export const useAppTranslation = () => {
  const appBridge = useAppBridge();
  const [translation, setTranslation] = useState<Language[Locale]>(language[DEFAULT_LOCALE]);

  useEffect(() => {
    try {
      const locale = (appBridge.config.locale || DEFAULT_LOCALE) as Locale;
      const currentTranslation = language[locale] || language[DEFAULT_LOCALE];
      setTranslation(currentTranslation);
    } catch (error) {
      console.error('Failed to load translation:', error);
      setTranslation(language[DEFAULT_LOCALE]);
    }
  }, [appBridge]);

  const memoizedTranslation = useMemo(() => translation, [translation]);

  return {
    translation: memoizedTranslation
  };
};

