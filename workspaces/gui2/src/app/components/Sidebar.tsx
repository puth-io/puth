import {observer} from "mobx-react-lite";
import {Context} from "@/app/components/Context.tsx";
import {History} from "@/app/components/History.tsx";

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
