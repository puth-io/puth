import { Check, ChevronsUpDown } from 'lucide-react';
import { useSdkLanguage } from '@/lib/sdk-language';
import { cn } from '@fumadocs/ui/cn';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { useMemo, useState } from 'react';

export default function DocsLanguageSwitcher() {
  const { language, setLanguage, options } = useSdkLanguage();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.id === language), [language, options]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold tracking-[0.12em] text-fd-muted-foreground uppercase">
        Client SDK
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex items-center gap-2 rounded-lg p-2 border bg-fd-secondary/50 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground',
          )}
          aria-label="Select client SDK"
        >
          <div>
            <p className="text-sm font-medium">{selected?.label ?? 'Select SDK'}</p>
          </div>
          <ChevronsUpDown className="shrink-0 ms-auto size-4 text-fd-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col gap-1 w-(--radix-popover-trigger-width) p-1 fd-scroll-container">
          {options.map((option) => {
            const isActive = option.id === language;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setLanguage(option.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg p-1.5 text-start hover:bg-fd-accent hover:text-fd-accent-foreground',
                )}
              >
                <p className="text-sm font-medium leading-none">{option.label}</p>
                <Check className={cn('shrink-0 ms-auto size-3.5 text-fd-primary', !isActive && 'invisible')} />
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
