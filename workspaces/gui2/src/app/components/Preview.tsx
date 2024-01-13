import {observer} from "mobx-react-lite";
import {useContext} from "react";
import {AppContext} from "@/App.tsx";

export const Preview = observer(function ScreencastPreview() {
    const {app} = useContext(AppContext);
    
    if (! app.preview?.activeScreencastUrl) {
        return <></>;
    }
    
    return (
        <>
            <img
                src={app.preview?.activeScreencastUrl}
                style={{
                    position: 'relative',
                    top: 0,
                    left: 0,
                    maxWidth: `${app.preview?.visibleScreencast.page.viewport.width}px`,
                }}
                className={'w-100'}
            />
            
            {/*<div className={'flex flex-wrap space-x-1'}>*/}
            {/*    {app.active.connection?.preview.screencast.inBetween.map((sc, idx) => {*/}
            {/*        return <img*/}
            {/*            key={idx}*/}
            {/*            src={URL.createObjectURL(new Blob([sc.frame], {type: 'image/jpeg'}))}*/}
            {/*            style={{width: '150px'}}*/}
            {/*        />*/}
            {/*    })}*/}
            {/*</div>*/}
        </>
    );
});
