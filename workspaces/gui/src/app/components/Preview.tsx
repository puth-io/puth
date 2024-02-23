import {observer} from "mobx-react-lite";
import {useContext} from "react";
import {AppContext} from "../../shared/Contexts.tsx";

export const Preview = observer(function ScreencastPreview() {
    const {app} = useContext(AppContext);
    if (! app.previewStore?.activeScreencastUrl) {
        return <></>;
    }
    
    return (
        <div className={'relative inline-block'}>
            <img
                src={app.previewStore?.activeScreencastUrl}
                style={{
                    maxWidth: `${app.previewStore?.visibleScreencast.page.viewport.width}px`,
                }}
                className={'w-full'}
            />
            {app.settings.preview.darken && (
                <div className={'absolute top-0 left-0 bottom-0 right-0 pointer-events-none'} style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}/>
            )}
        </div>
    );
});
