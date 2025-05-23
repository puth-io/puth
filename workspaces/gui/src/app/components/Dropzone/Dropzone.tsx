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

const Dropzone = observer(() => {
    const {app} = useContext(AppContext);
    const [importing, setImporting] = useState(false);
    
    let reset = () => {
        setImporting(false);
        runInAction(() => (DropzoneStore.active = 0));
    };
    
    let onDropAccepted = (files: any) => {
        setImporting(true);
        
        let reader = new FileReader();
        reader.readAsArrayBuffer(files[0]);
        
        reader.addEventListener('load', (event) => {
            const packets: any = decode(event.target?.result as ArrayBuffer, {extensionCodec: PUTH_EXTENSION_CODEC});
            
            if (packets[0]?.type === 'context') {
                let exists = app.dragAndDropped.contexts.find(item => item.id === packets[0].context.id);
                if (exists) {
                    console.warn('Can\'t add same context multiple times.');
                    reset();
                    app.setView('local');
                    app.dragAndDropped.active = exists;
                    return;
                }
                let context = new ContextStore(packets[0], app);
                for (let i = 1; i < packets.length; i++) {
                    context.received(packets[i]);
                }
                app.dragAndDropped.contexts.unshift(context);
                app.setView('local');
                app.dragAndDropped.active = context;
            } else {
                // TODO display error
                throw new Error('Tried to import non context packet.');
            }
            
            reset();
        });
    };
    
    const {getRootProps, getInputProps} = useDropzone({
        accept: '.puth',
        maxFiles: 1,
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
