import {useContext, useState} from 'react';
import './Dropzone.scss';
import {observer} from 'mobx-react-lite';
import {useDropzone} from 'react-dropzone';
import {runInAction} from 'mobx';
import DropzoneStore from '../../store/DropzoneStore';
import {decode} from "@msgpack/msgpack";
import {AppContext} from "../../../shared/Contexts.tsx";
import {PUTH_EXTENSION_CODEC} from "../../store/ConnectionStore.ts";
import ContextStore from "@/app/store/ContextStore";
import {debugPacket} from "../../store/DebugStoreClass.tsx";

const Dropzone = observer(() => {
    const {app} = useContext(AppContext);
    const [importing, setImporting] = useState(false);
    
    let onDropAccepted = (files: any) => {
        setImporting(true);
        
        Promise.allSettled(
            files.map((file: Blob) => new Promise<void>((resolve, reject) => {
                let reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.addEventListener('load', (event) => {
                    const packets: any = decode(event.target?.result as ArrayBuffer, {extensionCodec: PUTH_EXTENSION_CODEC});
                    debugPacket(packets);
                    
                    if (packets[0]?.type !== 'context') {
                        console.warn('Tried to import non context packet.');
                        reject('Tried to import non context packet.');
                        return;
                    }
                    
                    let exists = app.dragAndDropped.contexts.find(item => item.id === packets[0].context.id);
                    if (exists) {
                        console.warn('Can\'t add same context multiple times.');
                        reject('Can\'t add same context multiple times.');
                        return;
                    }
                    let context = new ContextStore(packets[0], app);
                    for (let i = 1; i < packets.length; i++) {
                        context.received(packets[i]);
                    }
                    app.dragAndDropped.contexts.unshift(context);
                    resolve();
                });
            })),
        )
            .then(() => {
                runInAction(() => {
                    app.setView('local');
                    app.dragAndDropped.active = app.dragAndDropped.contexts[0];
                    setImporting(false);
                    runInAction(() => (DropzoneStore.active = 0));
                });
            });
    };
    
    const {getRootProps, getInputProps} = useDropzone({
        accept: '.puth',
        onDropAccepted,
        noDragEventsBubbling: true,
    });
    
    return (
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
    );
});

export default Dropzone;
