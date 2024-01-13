import {useContext, useState} from 'react';
import './Dropzone.scss';
import {observer} from 'mobx-react-lite';
import {useDropzone} from 'react-dropzone';
import {runInAction} from 'mobx';
import DropzoneStore from '../../store/DropzoneStore';
import {decode} from "@msgpack/msgpack";
import {PUTH_EXTENSION_CODEC} from "@/app/store/ConnectionStore.ts";
import ContextStore from "@/app/store/ContextStore.tsx";
import {AppContext} from "@/App.tsx";

const Dropzone = observer(() => {
    const {app} = useContext(AppContext);
    const [importing, setImporting] = useState(false);
    
    let onDropAccepted = (files: any) => {
        console.log('drop accepted', files);
        setImporting(true);
        
        let reader = new FileReader();
        reader.readAsArrayBuffer(files[0]);
        
        reader.addEventListener('load', (event) => {
            const packets: any = decode(event.target?.result as ArrayBuffer, {extensionCodec: PUTH_EXTENSION_CODEC});
            
            if (packets[0]?.type === 'context') {
                let context = new ContextStore(packets[0], this);
                for (let i = 1; i < packets.length; i++) {
                    context.received(packets[i]);
                }
                app.dragAndDropped.contexts.push(context);
            } else {
                // TODO display error
            }
            
            setImporting(false);
            runInAction(() => (DropzoneStore.active = 0));
        });
    };
    
    const {getRootProps, getInputProps} = useDropzone({
        accept: '.puth',
        maxFiles: 1,
        onDropAccepted,
    });
    
    return (
        <div className={`dropzone-wrapper ${DropzoneStore.active > 0 ? 'active' : null}`}>
            {importing ? (
                <div>Importing snapshot...</div>
            ) : (
                <div {...getRootProps({className: 'dropzone'})}>
                    <input {...getInputProps()} />
                    <p>Drag and drop a snapshot here</p>
                    <em>(Only *.puth files will be accepted)</em>
                </div>
            )}
        </div>
    );
});

export default Dropzone;
