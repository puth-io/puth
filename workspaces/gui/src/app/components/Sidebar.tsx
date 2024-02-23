import {observer} from "mobx-react-lite";
import {Context} from "./Context.tsx";
import {History} from "./History.tsx";

export const Sidebar = observer(function Sidebar({
    content,
}: any) {
    return (
        <>
            {content ? content : (<>
                <Context/>
                <History/>
            </>)}
        </>
    );
});
