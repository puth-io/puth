import AppStore from "@/app/store/AppStore.tsx";
import PreviewStore from "./app/store/PreviewStore.tsx";
import {AppLayout} from "./app/layouts/MainLayout.tsx";
import {MainBottom, MainTop} from "./app/components/Main.tsx";
import {Sidebar} from "./app/components/Sidebar.tsx";
import {createContext} from "react";
import {Preview} from "@/app/components/Preview.tsx";

// tailwind include: dark

// @ts-ignore
export const AppContext = createContext<any>();

const App = () => (
    <AppContext.Provider value={{
        app: AppStore,
        preview: PreviewStore,
    }}>
        <AppLayout
            sidebar={<Sidebar/>}
            preview={<Preview/>}
            mainTop={<MainTop/>}
            mainBottom={<MainBottom/>}
        />
    </AppContext.Provider>
);
export default App;
