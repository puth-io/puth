import {observer} from 'mobx-react-lite';
import {useContext} from 'react';
import {AppContext} from '../../shared/Contexts.tsx';

export const Preview = observer(function ScreencastPreview() {
    const {app} = useContext(AppContext);
    if (! app.previewStore?.activeScreencastUrl) {
        return (
            <div className={'mt-16 font-mono text-xs text-ink-muted'}>No frame recorded for this step.</div>
        );
    }

    return (
        <div
            className={'relative w-full overflow-hidden rounded-lg border border-white/[0.18] shadow-[0_24px_60px_rgba(0,0,0,0.5)]'}
            style={{maxWidth: `${app.previewStore?.visibleScreencast.page.viewport.width}px`}}
        >
            <img
                src={app.previewStore?.activeScreencastUrl}
                alt={'Page at the selected step'}
                className={'block w-full'}
            />
            {app.settings.preview.darken && (
                <div className={'pointer-events-none absolute inset-0 bg-black/50'}/>
            )}
        </div>
    );
});
