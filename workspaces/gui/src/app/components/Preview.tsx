import {observer} from 'mobx-react-lite';
import {runInAction} from 'mobx';
import {useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AppContext} from '../../shared/Contexts.tsx';
import {domPointKey, FRAME_URL, type ReplayHighlight, ReplayView, replayWorker} from '../replay/Replay.ts';
import type PreviewStore from '@/app/store/PreviewStore';

export const Preview = observer(function Preview() {
    const {app} = useContext(AppContext);
    const preview = app.previewStore;

    if (preview?.showsDom) {
        return <DomPreview preview={preview} darken={app.settings.preview.darken} marks={app.settings.preview.highlight}/>;
    }
    return <FramePreview/>;
});

const FramePreview = observer(function FramePreview() {
    const {app} = useContext(AppContext);
    if (! app.previewStore?.activeScreencastUrl) {
        return (
            <div className={'mt-16 font-mono text-xs text-ink-muted'}>No frame recorded for this step.</div>
        );
    }

    // Frames are stored as Chrome sends them and can be taller than the viewport, so the viewport is cut from the top.
    const viewport = app.previewStore?.visibleScreencast.page.viewport;
    return (
        <div
            className={'relative w-full overflow-hidden rounded-lg border border-white/18 shadow-[0_24px_60px_rgba(0,0,0,0.5)]'}
            style={{maxWidth: viewport ? `${viewport.width}px` : undefined}}
        >
            <img
                src={app.previewStore?.activeScreencastUrl}
                alt={'Page at the selected step'}
                className={'block w-full object-cover object-top'}
                style={{aspectRatio: viewport ? `${viewport.width} / ${viewport.height}` : undefined}}
            />
            {app.settings.preview.darken && (
                <div className={'pointer-events-none absolute inset-0 bg-black/50'}/>
            )}
        </div>
    );
});

/**
 * The recorded DOM, rebuilt in a sandboxed frame without scripts. The replay worker answers all of its requests
 * from the recording; a frame it doesn't control is never built, and the preview falls back to frames.
 */
const DomPreview = observer(function DomPreview({preview, darken, marks}: {preview: PreviewStore, darken: boolean, marks: boolean}) {
    const container = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const view = useRef<ReplayView|null>(null);
    const [loaded, setLoaded] = useState(false);
    const [viewport, setViewport] = useState<[number, number]>([1280, 720]);
    const [width, setWidth] = useState(0);
    const [highlight, setHighlight] = useState<ReplayHighlight|null>(null);
    const point = preview.domPoint;
    const pointKey = point === null ? null : domPointKey(point);
    const target = preview.domTarget;
    const targetKey = target === null ? null : JSON.stringify(target);

    // The worker has to control the frame from its first request, so the frame loads once it is active.
    const [src, setSrc] = useState<string|undefined>(undefined);
    useEffect(() => {
        let cancelled = false;
        void replayWorker.ready().then((worker) => {
            if (cancelled) {
                return;
            }
            if (worker === null) {
                runInAction(() => preview.replayUnavailable = true);
            } else {
                setSrc(FRAME_URL);
            }
        });
        return () => { cancelled = true; };
    }, [preview]);

    const onLoad = () => {
        const element = frame.current;
        if (element === null) {
            return;
        }
        if (! ReplayView.controlled(element)) {
            runInAction(() => preview.replayUnavailable = true);
            return;
        }
        view.current = new ReplayView(element, (shown, found) => {
            setViewport(shown);
            setHighlight(found);
        });
        setLoaded(true);
    };

    useEffect(() => {
        if (loaded && point !== null) {
            view.current?.show(preview.context, point, target ?? undefined);
        }
    }, [loaded, pointKey, targetKey, preview.context]);

    useLayoutEffect(() => {
        const element = container.current;
        if (element === null) {
            return;
        }
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const [viewportWidth, viewportHeight] = viewport;
    const scale = width > 0 && viewportWidth > 0 ? Math.min(1, width / viewportWidth) : 1;

    return (
        <div ref={container} className={'w-full'} style={{maxWidth: `${viewportWidth}px`}}>
            <div
                className={'relative overflow-hidden rounded-lg border border-white/18 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.5)]'}
                style={{height: `${viewportHeight * scale}px`}}
            >
                <iframe
                    ref={frame}
                    src={src}
                    onLoad={src === undefined ? undefined : onLoad}
                    // Same origin, so the GUI can build the document; no scripts, forms, popups or navigation.
                    sandbox={'allow-same-origin'}
                    title={'Page at the selected step'}
                    {...{puth: 'replay-frame'}}
                    data-point={pointKey ?? undefined}
                    className={'absolute left-0 top-0 origin-top-left border-0'}
                    style={{width: `${viewportWidth}px`, height: `${viewportHeight}px`, transform: `scale(${scale})`}}
                />
                {darken && (
                    <div className={'pointer-events-none absolute inset-0 bg-black/50'}/>
                )}
                {marks && highlight !== null && (
                    // In the replay frame's own coordinates, scaled with it.
                    <div
                        className={'pointer-events-none absolute left-0 top-0 origin-top-left'}
                        style={{width: `${viewportWidth}px`, height: `${viewportHeight}px`, transform: `scale(${scale})`}}
                    >
                        {highlight.box && (
                            <div
                                {...{puth: 'replay-target'}}
                                className={'absolute rounded-[2px] border-2 border-accent-blue bg-accent-blue/15'}
                                style={{left: `${highlight.box[0]}px`, top: `${highlight.box[1]}px`, width: `${highlight.box[2]}px`, height: `${highlight.box[3]}px`}}
                            />
                        )}
                        {highlight.point && (
                            <div
                                {...{puth: 'replay-point'}}
                                className={'absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-blue shadow-[0_0_0_1px_rgba(0,0,0,0.4)]'}
                                style={{left: `${highlight.point[0]}px`, top: `${highlight.point[1]}px`}}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
