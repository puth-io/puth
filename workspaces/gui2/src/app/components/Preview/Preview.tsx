import {observer} from 'mobx-react-lite';
import {useEffect} from 'react';
import {debounce, useForceUpdatePreview} from '../../util/Debugging';
import DevStore from "../../DebugStoreClass";
import PreviewStore from "../../store/PreviewStore";
import Events from '../../Events';
import {ContextDetails} from '../ContextDetails/ContextDetails';
import AppStore from "@/app/store/AppStore.tsx";

const PreviewOverlay = observer(() => <div className={`overlay ${PreviewStore.darken ? 'darken' : ''}`}></div>);

export const Split = () => <span className={'split'}> | </span>;

const FooterMetrics = observer(() => {
    if (!AppStore.active.connection) {
        return <></>;
    }
    
    let {contexts, events} = AppStore.active.connection.getMetrics();
    
    return (
        <div>
            {`${contexts} contexts`}
            <Split/>
            {`${events} events`}
        </div>
    );
});

export const SPACE = <>&nbsp;</>;

export const PreviewFooter = observer(() => {
    return (
        <div className={'footer border-left border-default z-10'}>
            <FooterMetrics/>
            <div className={'ml-auto checkbox-container'}>
                <input
                    type="checkbox"
                    className="form-check-input me-1"
                    id="darken-preview-checkbox"
                    checked={PreviewStore.darken}
                    onChange={() => (PreviewStore.darken = ! PreviewStore.darken)}
                />
                <label className="form-check-label" htmlFor="darken-preview-checkbox">
                    Darken preview
                </label>
            </div>
            <div className={'checkbox-container'}>
                <input
                    type="checkbox"
                    className="form-check-input me-1"
                    id="connect-automatically-checkbox"
                    checked={DevStore.connectAutomatically}
                    onChange={() => (DevStore.connectAutomatically = ! DevStore.connectAutomatically)}
                />
                <label className="form-check-label" htmlFor="connect-automatically-checkbox">
                    Connect automatically
                </label>
            </div>
            <div className={'checkbox-container'}>
                <input
                    type="checkbox"
                    className="form-check-input me-1"
                    id="debug-checkbox"
                    checked={DevStore.debug}
                    onChange={() => (DevStore.debug = ! DevStore.debug)}
                />
                <label className="form-check-label" htmlFor="debug-checkbox">
                    Debug
                </label>
            </div>
        </div>
    );
});

const ScreencastPreview = observer(() => {
    if (! PreviewStore.activeScreencastUrl) {
        return <></>;
    }
    
    return <img
        src={PreviewStore.activeScreencastUrl}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            maxWidth: `${PreviewStore.visibleScreencast.page.viewport.width}px`,
        }}
        className={'w-100'}
    ></img>;
});

export const Preview = observer(() => {
    const forceUpdatePreview = useForceUpdatePreview(true);
    const handleResize = debounce(forceUpdatePreview);
    
    // Handle window resize because preview iframe should scale to the minimum available space.
    useEffect(() => {
        window.addEventListener('resize', handleResize);
        Events.on('layout:resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            Events.off('layout:resize', handleResize);
        };
    }, []);
    
    const stickSnapshotState = (state: 'before'|'after') => {
        PreviewStore.activeState = state;
    };
    
    let snapshot = PreviewStore.visibleSnapshot;
    
    const PreviewInfo = observer(() => (
        <div className="d-flex flex-1 info me-2">
            <div className="input-group input-group-sm ms-2">
                <div className={'element url'}>{snapshot?.url}</div>
                <a
                    className="btn btn-outline-primary d-inline-flex align-items-center"
                    target={'_blank'}
                    href={snapshot?.url}
                >
                    Open
                </a>
            </div>
            
            <div className={'element ms-2'}>
                {snapshot?.viewport.width}x{snapshot?.viewport.height}
            </div>
        </div>
    ));
    
    return (
        <div
            className={'d-flex flex-column preview'}
            style={{flex: 1, overflow: 'hidden'}}
        >
            <div className={'quick-navigation-container mb-2'}>
                <PreviewInfo/>
            </div>
            
            <div
                className={'d-flex iframe-wrapper bg-striped pb-3 position-relative'}
                style={{flex: 1, overflow: 'hidden', position: 'relative'}}
            >
                <div
                    style={{
                        flex: 1,
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <ScreencastPreview/>
                    {/*{! html && <div className={'no-selected-preview'}>No preview selected</div>}*/}
                </div>
                <PreviewOverlay/>
            </div>
            
            <ContextDetails/>
            <PreviewFooter/>
        </div>
    );
});
