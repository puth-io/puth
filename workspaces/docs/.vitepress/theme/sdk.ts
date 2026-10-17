import { inject, type InjectionKey, type Ref } from 'vue';
import type { Sdk } from '../lib/sdk';

export const sdkKey: InjectionKey<Ref<Sdk>> = Symbol('puth-sdk');
export function useSdk(): Ref<Sdk> {
  const sdk = inject(sdkKey);
  if (!sdk) throw new Error('SDK components must be rendered within SdkLayout.');
  return sdk;
}
