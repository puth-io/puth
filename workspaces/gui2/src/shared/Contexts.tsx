import {createContext} from "react";
import {AppStoreClass} from "@/app/store/AppStore.tsx";

export const AppContext = createContext<{app: AppStoreClass}>(undefined as any);
