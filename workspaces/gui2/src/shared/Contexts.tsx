import {createContext} from "react";
import {AppStoreClass} from "@/app/overwrites/store/AppStore";

export const AppContext = createContext<{app: AppStoreClass}>(undefined as any);
