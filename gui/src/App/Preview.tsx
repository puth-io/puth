import {observer} from 'mobx-react';
import React, {useEffect, useRef} from 'react';
import {ICommand, ISnapshot} from './Command';
import {action, makeAutoObservable} from 'mobx';
import {Events} from '../index';
import {loadHighlights} from './Highlight';

function calculateIframeSize(snapshot: ISnapshot | undefined, iframeContainer: any) {
    let size = {
        container: {
            width: '',
            height: '',
        },
        width: '100%',
        height: '100%',
        scale: 1,
    };
    
    if (!snapshot?.viewport || !iframeContainer.current) {
        return size;
    }
    
    let {width, height} = snapshot.viewport;
    let {offsetWidth, offsetHeight} = iframeContainer.current;
    
    let scaleFactorX = offsetWidth / width;
    let scaleFactorY = offsetHeight / height;
    
    let smallestFactor = scaleFactorX < scaleFactorY ? scaleFactorX : scaleFactorY;
    
    size.container.width = offsetWidth + 'px';
    size.container.height = offsetHeight + 'px';
    
    size.width = width + 'px';
    size.height = height + 'px';
    
    if (smallestFactor < 1) {
        size.scale = smallestFactor;
        size.container.width = width * smallestFactor + 'px';
        size.container.height = height * smallestFactor + 'px';
    }
    
    return size;
}

const IframeHandler = (
    {
        iframe,
        iframeContainer,
        size,
    }: {
        iframe: any,
        iframeContainer: any,
        size: any,
    },
) => {
    return (
        <div
            className={'d-flex bg-striped'}
            style={{flex: 1}}
        >
            <div
                ref={iframeContainer}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    width: size.container.width,
                    height: size.container.height,
                }}
            >
                <iframe
                    title={'Preview'}
                    frameBorder='0'
                    ref={iframe}
                    sandbox={'allow-same-origin'}
                    onLoad={() => loadHighlights(iframe, previewStore.visibleCommand, previewStore.visibleHighlightState)}
                    style={{
                        transformOrigin: '0 0',
                        transform: 'scale(' + size.scale + ')',
                        width: size.width,
                        height: size.height,
                        background: 'white',
                    }}
                />
            </div>
        </div>
    );
};

export type SnapshotState = 'before' | 'after';

class PreviewStore {
    activeCommand: ICommand | undefined;
    activeState: SnapshotState = 'before';
    highlightCommand: ICommand | undefined;
    highlightState: SnapshotState = 'before';
    private highlightInterval: number;
    
    constructor() {
        makeAutoObservable(this);
        
        this.highlightInterval = window.setInterval(() => this.toggleHighlightState(), 1000);
    }
    
    toggleHighlightState() {
        this.highlightState = this.highlightState === 'before' ? 'after' : 'before';
    }
    
    get visibleCommand() {
        return this.highlightCommand ?? this.activeCommand;
    }
    
    get visibleHighlightState() {
        if (!this.visibleCommand?.snapshots?.before) {
            return 'after';
        }
        if (!this.visibleCommand?.snapshots?.after) {
            return 'before';
        }
        return this.highlightCommand ? this.highlightState : this.activeState;
    }
    
    get visibleSnapshot() {
        return this.visibleCommand?.snapshots[this.visibleHighlightState];
    }
    
    get visibleHasBefore() {
        return this.visibleCommand?.snapshots && 'before' in this.visibleCommand.snapshots;
    }
    
    get visibleHasAfter() {
        return this.visibleCommand?.snapshots && 'after' in this.visibleCommand.snapshots;
    }
    
    get visibleHasSnapshots() {
        return Array.isArray(this.visibleCommand?.snapshots);
    }
    
    get isVisibleHighlight() {
        return this.highlightCommand !== undefined;
    }
}

export const previewStore = new PreviewStore();

export const Preview = observer(() => {
    const iframe = useRef<any>(null);
    const iframeContainer = useRef(null);
    
    useEffect(() => {
        const eventToggle = action((cmd: ICommand | undefined) => {
            if (previewStore.activeCommand === cmd) {
                previewStore.activeCommand = undefined;
                return;
            }
            
            if (previewStore.highlightCommand === cmd) {
                previewStore.highlightCommand = undefined;
            }
            
            previewStore.activeCommand = cmd;
            previewStore.activeState = 'after';
        });
        
        const eventHighlightShow = action((cmd: ICommand | undefined) => {
            if (previewStore.visibleCommand === cmd) {
                return;
            }
            previewStore.highlightCommand = cmd;
        });
        
        const eventHighlightHide = action((cmd: ICommand | undefined) => {
            if (previewStore.highlightCommand === cmd) {
                previewStore.highlightCommand = undefined;
            }
        });
        
        Events.on('preview:toggle', eventToggle);
        Events.on('preview:highlight:show', eventHighlightShow);
        Events.on('preview:highlight:hide', eventHighlightHide);
        
        return () => {
            Events.off('preview:toggle', eventToggle);
            Events.off('preview:highlight:show', eventHighlightShow);
            Events.off('preview:highlight:hide', eventHighlightHide);
        };
    }, []);
    
    const stickSnapshotState = (state: 'before' | 'after') => {
        previewStore.activeState = state;
    };
    
    let snapshot = previewStore.visibleSnapshot;
    let size = calculateIframeSize(snapshot, iframeContainer);
    
    let element: any = iframe?.current;
    let doc = element?.contentWindow?.document;
    let html = snapshot?.html;
    
    // cleans iframe
    if (element && !snapshot) {
        element.src = 'about:blank';
        doc.open();
        doc.write('');
        doc.close();
    }
    
    if (html) {
        element.src = 'about:blank';
        doc.open();
        doc.write(html ?? '');
        doc.close();
        
        // Trying to remove every smooth scroll effect.
        doc.documentElement.style.scrollBehavior = 'unset';
        doc.querySelector('body').addEventListener('wheel', function (event: any) {
            event.stopPropagation();
        }, true);
    }
    
    return (
        <div
            className='d-flex flex-column'
            style={{
                flex: 1,
                overflow: 'hidden',
            }}
        >
            <div
                className='py-2 d-flex'
                style={{background: '#3e4247', borderBottom: '2px solid #737373'}}
            >
                <div
                    className='btn-group btn-group-sm'
                    role='group'
                >
                    <button
                        type='button'
                        className={`btn m-0 btn-outline-warning ${previewStore.visibleHighlightState === 'before' && 'active'}`}
                        onClick={_ => stickSnapshotState('before')}
                        disabled={!previewStore.isVisibleHighlight && !previewStore.visibleHasBefore}
                    >
                        Before
                    </button>
                    <button
                        type='button'
                        className={`btn m-0 btn-outline-warning ${previewStore.visibleHighlightState === 'after' && 'active'}`}
                        onClick={_ => stickSnapshotState('after')}
                        disabled={!previewStore.isVisibleHighlight && !previewStore.visibleHasAfter}
                    >
                        After
                    </button>
                </div>
                <div className='input-group input-group-sm ms-2'>
                  <span
                      className='input-group-text'
                      id='basic-addon1'
                  >
                      Url
                  </span>
                    <input
                        type='text'
                        className='form-control'
                        defaultValue={snapshot?.url}
                        readOnly
                        disabled
                    />
                </div>
                <button
                    type='button'
                    className='btn m-0 btn-outline-warning text-nowrap ms-2 me-2'
                    disabled
                >
                    {snapshot?.viewport.width}x{snapshot?.viewport.height} ({(size.scale * 100).toFixed(0)}%)
                </button>
            </div>
            <IframeHandler
                iframe={iframe}
                iframeContainer={iframeContainer}
                size={size}
            />
        </div>
    );
});