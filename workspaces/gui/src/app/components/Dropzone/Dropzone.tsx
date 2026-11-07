import {useContext, useState} from 'react';
import './Dropzone.scss';
import {observer} from 'mobx-react-lite';
import {useDropzone} from 'react-dropzone';
import {runInAction} from 'mobx';
import DropzoneStore from '../../store/DropzoneStore';
import {AppContext} from "../../../shared/Contexts.tsx";
import {parseSnapshot, SnapshotImportError} from "../../util/Snapshot.ts";
import ContextStore from "@/app/store/ContextStore";
import {debugPacket} from "../../store/DebugStoreClass.tsx";

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
        accept: '.puth',
        onDropAccepted,
        noDragEventsBubbling: true,
    });
    
    return (
        <>
            <div {...getRootProps({className: `dropzone-wrapper ${DropzoneStore.active > 0 ? 'active' : null}`})}>
                <input {...getInputProps()} />
                {importing ? (
                    <div>Importing snapshot...</div>
                ) : (
                    <div className={'dropzone'}>
                        <p>Drag and drop a snapshot</p>
                        <em>(only accepts .puth files)</em>
                    </div>
                )}
            </div>
            {app.importErrors.length > 0 && (
                <div
                    {...{puth: 'import-errors'}}
                    role={'alert'}
                    className={'fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 rounded-md text-xs bg-red-950 text-red-100'}
                    onClick={() => runInAction(() => (app.importErrors = []))}
                >
                    {app.importErrors.map((error, index) => <div key={index}>{error}</div>)}
                </div>
            )}
        </>
    );
});

export default Dropzone;
