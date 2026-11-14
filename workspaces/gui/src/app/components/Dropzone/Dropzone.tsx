import {useContext, useState} from 'react';
import './Dropzone.css';
import {observer} from 'mobx-react-lite';
import {useDropzone} from 'react-dropzone';
import {runInAction} from 'mobx';
import DropzoneStore from '../../store/DropzoneStore';
import {AppContext} from "../../../shared/Contexts.tsx";
import {parseSnapshot, SnapshotImportError} from "../../util/Snapshot.ts";
import ContextStore from "@/app/store/ContextStore";
import {debugPacket} from "../../store/DebugStoreClass.tsx";
import {Icon} from "../../../components/icon.tsx";

const Dropzone = observer(() => {
    const {app} = useContext(AppContext);
    const [importing, setImporting] = useState(false);
    
    const importFile = async (file: File) => {
        const packets = parseSnapshot(await file.arrayBuffer());
        debugPacket(packets);
        
        if (app.dragAndDropped.contexts.some(item => item.id === packets[0].context.id)) {
            throw new SnapshotImportError('This snapshot is already imported.');
        }
        
        let context = new ContextStore(packets[0], app);
        for (let i = 1; i < packets.length; i++) {
            context.received(packets[i]);
        }
        runInAction(() => app.dragAndDropped.contexts.unshift(context));
    };
    
    let onDropAccepted = async (files: File[]) => {
        setImporting(true);
        runInAction(() => (app.importErrors = []));
        
        const results = await Promise.allSettled(files.map(importFile));
        const errors = results.flatMap((result, index) => {
            if (result.status === 'fulfilled') {
                return [];
            }
            
            console.warn('Could not import snapshot', result.reason);
            const message = result.reason instanceof SnapshotImportError
                ? result.reason.message
                : 'This snapshot contains packets that could not be read.';
            
            return [`${files[index].name}: ${message}`];
        });
        
        runInAction(() => {
            app.importErrors = errors;
            if (errors.length !== files.length) {
                app.setView('local');
                app.dragAndDropped.active = app.dragAndDropped.contexts[0];
            }
            DropzoneStore.active = 0;
        });
        setImporting(false);
    };
    
    const {getRootProps, getInputProps} = useDropzone({
        // Snapshots have no MIME type of their own, so their extension matches.
        accept: { 'application/octet-stream': ['.puth'] },
        onDropAccepted,
        noDragEventsBubbling: true,
    });
    
    return (
        <>
            <div {...getRootProps({className: `dropzone-wrapper ${DropzoneStore.active > 0 ? 'active' : ''}`})}>
                <input {...getInputProps()} />
                <div className={'dropzone shell-hero relative overflow-hidden'}>
                    <div aria-hidden={true} className={'shell-hero-dots absolute inset-0'}/>
                    <div aria-hidden={true} className={'shell-hero-grain absolute inset-0'}/>
                    <div aria-hidden={true} className={'shell-hero-scrim absolute inset-0'}/>
                    <div className={'relative flex flex-col items-center gap-3.5'}>
                    {importing ? (
                        <>
                            <Icon name={'progress_activity'} size={'2rem'} className={'animate-spin text-blue-100'}/>
                            <div role={'status'} className={'text-[22px] font-medium text-blue-50'}>Importing snapshot...</div>
                        </>
                    ) : (
                        <>
                            <span aria-hidden={true} className={'flex h-[60px] w-[60px] items-center justify-center rounded-[14px] border border-blue-200/45 bg-blue-950/50 text-blue-100'}>
                                <Icon name={'download'} size={'1.6rem'} className={'rotate-180'}/>
                            </span>
                            <p className={'text-[26px] font-medium tracking-[-0.01em] text-blue-50'}>Drag and drop a snapshot</p>
                            <em className={'font-mono text-[12.5px] not-italic text-blue-50'}>Only .puth files · stays on this machine</em>
                        </>
                    )}
                    </div>
                </div>
            </div>
            {app.importErrors.length > 0 && (
                <div className={'fixed left-1/2 top-4 z-110 w-[min(520px,calc(100%-32px))] -translate-x-1/2'}>
                    <button
                        type={'button'}
                        {...{puth: 'import-errors'}}
                        role={'alert'}
                        aria-label={'Import failed, click to dismiss'}
                        className={'flex w-full flex-col overflow-hidden rounded-[10px] border border-red-400/35 bg-linear-to-b from-[#2a1414] to-[#1c1010] text-left shadow-[0_20px_50px_rgba(0,0,0,0.6)]'}
                        onClick={() => runInAction(() => (app.importErrors = []))}
                    >
                        <span className={'flex w-full justify-between border-b border-dashed border-red-400/25 px-3.5 py-2.5 font-mono text-xs'}>
                            <span className={'text-red-300'}>Import failed · {app.importErrors.length} {app.importErrors.length === 1 ? 'file' : 'files'}</span>
                            <span className={'text-ink-body'}>Dismiss</span>
                        </span>
                        <span className={'flex flex-col gap-1.5 px-3.5 py-3 text-[13px] leading-normal text-red-100'}>
                            {app.importErrors.map((error, index) => <span key={index}>{error}</span>)}
                        </span>
                    </button>
                </div>
            )}
        </>
    );
});

export default Dropzone;
