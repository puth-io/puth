import {observer} from "mobx-react-lite";
import {useContext} from "react";
import {AppContext} from "@/App.tsx";

export const Preview = observer(function ScreencastPreview() {
    const {app} = useContext(AppContext);
    
    if (! app.active.connection?.preview.activeScreencastUrl) {
        return <></>;
    }
    
    return (
        <img
            src={app.active.connection?.preview.activeScreencastUrl}
            style={{
                position: 'relative',
                top: 0,
                left: 0,
                maxWidth: `${app.active.connection?.preview.visibleScreencast.page.viewport.width}px`,
            }}
            className={'w-100'}
        ></img>
    );
});
