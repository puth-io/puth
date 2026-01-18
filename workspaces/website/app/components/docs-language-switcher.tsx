import { ChevronDown } from 'lucide-react';
import { useSdkLanguage } from '@/lib/sdk-language';

export default function DocsLanguageSwitcher() {
  const { language, setLanguage, options } = useSdkLanguage();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold tracking-[0.12em] text-fd-muted-foreground uppercase">
        Client SDK
      </span>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fd-muted-foreground" />
      </div>
    </div>
  );
}
