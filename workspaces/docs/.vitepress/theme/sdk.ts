import { inject, type InjectionKey, type Ref } from 'vue';
import type { Sdk } from '../lib/sdk';

export interface SdkState {
  /** The client the current page is shown for. */
  sdk: Ref<Sdk>;
  /** The client the reader chose, kept on client-only pages and the homepage. */
  preferred: Ref<Sdk>;
  /** The client the current page is fixed to, such as Laravel for the Laravel integration. */
  fixed: Ref<Sdk | undefined>;
  select(sdk: Sdk): void;
}

export const sdkKey: InjectionKey<SdkState> = Symbol('puth-sdk');

export function useSdkState(): SdkState {
  const state = inject(sdkKey);
  if (!state) throw new Error('SDK components must be rendered within SdkLayout.');
  return state;
}

export function useSdk(): Ref<Sdk> {
  return useSdkState().sdk;
}
