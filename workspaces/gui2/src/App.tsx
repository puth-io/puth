import AppStore, {AppStoreClass} from "@/app/store/AppStore.tsx";
import {AppLayout} from "./app/layouts/MainLayout.tsx";
import {MainBottom, MainTop} from "./app/components/Main.tsx";
import {Sidebar} from "./app/components/Sidebar.tsx";
import {createContext} from "react";
import {Preview} from "@/app/components/Preview.tsx";
import Dropzone from "@/app/components/Dropzone/Dropzone.tsx";

// tailwind include: da
// @ts-ignore
export const AppContext = createContext<{app: AppStoreClass}>();

const App = () => (
    <AppContext.Provider value={{
        app: AppStore,
    }}>
        <AppLayout
            sidebar={<Sidebar/>}
            preview={<Preview/>}
            mainTop={<MainTop/>}
            // mainBottom={<MainBottom/>}
        />
        <Dropzone/>
    </AppContext.Provider>
);
export default App;
