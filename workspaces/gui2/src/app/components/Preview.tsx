import {observer} from "mobx-react-lite";
import PreviewStore from "@/app/store/PreviewStore.tsx";

export const Preview = observer(function ScreencastPreview() {
    if (! PreviewStore.activeScreencastUrl) {
        return <></>;
    }
    
    return (
        <img
            src={PreviewStore.activeScreencastUrl}
            style={{
                position: 'relative',
                top: 0,
                left: 0,
                maxWidth: `${PreviewStore.visibleScreencast.page.viewport.width}px`,
            }}
            className={'w-100'}
        ></img>
    );
});
