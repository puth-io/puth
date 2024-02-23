import {createContext} from "react";
import AppStore from "@/app/store/AppStore";

export const AppContext = createContext<{app: AppStore}>(undefined as any);
