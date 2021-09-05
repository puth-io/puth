import React, { useState } from 'react';
import './Dropzone.scss';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { runInAction } from 'mobx';
import DropzoneStore from '../../Mobx/DropzoneStore';

const Dropzone = observer(() => {
  const [importing, setImporting] = useState(false);

  let onDropAccepted = (files) => {
    setImporting(true);

    let reader = new FileReader();
    reader.readAsArrayBuffer(files[0]);

    reader.addEventListener('load', (event) => {
      WebsocketHandler.receivedBinaryData(event.target.result as ArrayBuffer, { returnIfExists: true });

      setImporting(false);
      runInAction(() => (DropzoneStore.active = 0));
    });
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: '.puth',
    maxFiles: 1,
    onDropAccepted,
  });

  return (
    <div className={`dropzone-wrapper ${DropzoneStore.active > 0 ? 'active' : null}`}>
      {importing ? (
        <div>Importing snapshot...</div>
      ) : (
        <div {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          <p>Drag and drop a snapshot here</p>
          <em>(Only *.puth files will be accepted)</em>
        </div>
      )}
    </div>
  );
});

export default Dropzone;
