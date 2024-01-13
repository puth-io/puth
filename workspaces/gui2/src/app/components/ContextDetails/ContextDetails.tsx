import {observer} from 'mobx-react-lite';
import {useContext} from "react";
import {AppContext} from "@/App.tsx";

export const ContextDetails = observer(function ContextDetails() {
    const {app} = useContext(AppContext);
    
    if (!app.activeContext) {
        return <></>;
    }
    
    return (
        <div className={'d-flex flex-column border-left border-default bg-dark-5'}>
            <div className={'footer'}>
                <div className={'ml-auto'}>Context: {app.activeContext.id}</div>
            </div>
        </div>
    );
});
