import {AppLayout} from "./app/layouts/MainLayout.tsx";
import {MainBottom, MainTop} from "./app/components/Main.tsx";
import {Sidebar} from "./app/components/Sidebar.tsx";
import {Preview} from "./app/components/Preview.tsx";
import Dropzone from "./app/components/Dropzone/Dropzone.tsx";

const App = () => (
    <>
        <AppLayout
            sidebar={<Sidebar/>}
            preview={<Preview/>}
            mainTop={<MainTop/>}
            // mainBottom={<MainBottom/>}
        />
        <Dropzone/>
    </>
);
export default App;
