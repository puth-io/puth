'use client';

import { CodeBlockTabs } from 'fumadocs-ui/components/codeblock';
import { useSdkLanguage } from '@/lib/sdk-language';
import type { ComponentProps } from 'react';

export default function SdkCodeBlockTabs(props: ComponentProps<typeof CodeBlockTabs>) {
  const { language, setLanguage } = useSdkLanguage();

  return <CodeBlockTabs {...props} value={language} onValueChange={setLanguage} />;
}
