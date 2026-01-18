import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SdkLanguageOption = {
  id: string;
  label: string;
};

const STORAGE_KEY = 'puth-sdk-language';

const SDK_LANGUAGE_OPTIONS: SdkLanguageOption[] = [
  { id: 'php', label: 'PHP' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
];

type SdkLanguageContextValue = {
  language: string;
  setLanguage: (language: string) => void;
  options: SdkLanguageOption[];
};

const SdkLanguageContext = createContext<SdkLanguageContextValue | null>(null);

export function SdkLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<string>(() => SDK_LANGUAGE_OPTIONS[0]?.id ?? 'javascript');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SDK_LANGUAGE_OPTIONS.some((option) => option.id === stored)) {
      setLanguage(stored);
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (next: string) => {
        if (!SDK_LANGUAGE_OPTIONS.some((option) => option.id === next)) return;
        setLanguage(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      options: SDK_LANGUAGE_OPTIONS,
    }),
    [language],
  );

  return <SdkLanguageContext.Provider value={value}>{children}</SdkLanguageContext.Provider>;
}

export function useSdkLanguage() {
  const context = useContext(SdkLanguageContext);
  if (!context) {
    throw new Error('useSdkLanguage must be used within SdkLanguageProvider');
  }
  return context;
}
