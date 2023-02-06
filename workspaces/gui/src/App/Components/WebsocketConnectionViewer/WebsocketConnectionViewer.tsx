import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';

export const Spinner = () => (
  <div className="spinner-grow spinner-grow-sm text-warning ms-2" role="status">
    <span className="visually-hidden">Loading...</span>
  </div>
);

export default observer(function WebsocketConnectionViewer() {
  const [url, setUrl] = useState('');

  let connect = (url: string) => WebsocketHandler.try(url);

  if (WebsocketHandler.isConnected) {
    return <></>;
  }

  let disabled = WebsocketHandler.connectionState === WebSocket.CONNECTING;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        aria-labelledby="exampleModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">
                Connect to a Puth instance
              </h5>
            </div>
            <div className="modal-body">
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={'Url: e.g. ws://127.0.0.1:7345/websocket'}
                  disabled={disabled}
                />
                <button className="btn btn-outline-warning" type="button" disabled={disabled}>
                  Connect
                  {url === WebsocketHandler.getWebsocket()?.url && <Spinner />}
                </button>
              </div>

              <hr />

              <div className="d-grid gap-2">
                {WebsocketHandler.connectionSuggestions.map((con, idx) => (
                  <button
                    key={idx}
                    className={'btn btn-block btn-outline-secondary'}
                    onClick={(_) => connect(con)}
                    disabled={disabled}
                  >
                    {con}

                    {con === WebsocketHandler.getWebsocket()?.url && <Spinner />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
