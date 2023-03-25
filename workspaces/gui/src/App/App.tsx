import './App.scss';
import './Components/Header/Header.scss';
import Sidebar, {SidebarAction} from './Components/Sidebar/Sidebar';
import { Preview } from './Components/Preview/Preview';
import Dropzone from './Components/Dropzone/Dropzone';
import WebsocketConnectionViewer from './Components/WebsocketConnectionViewer/WebsocketConnectionViewer';
import {observer} from "mobx-react-lite";
import WebsocketHandler from "./Misc/WebsocketHandler";
import {Context} from "./Components/Context/Context";
import React from "react";

const LocalSidebar = observer(() => (
    <Sidebar suffix={<span style={{color: '#c7c7c7'}}>Pro</span>}>
        {WebsocketHandler.contextArray.map((context, idx) => {
            return <Context key={context.id} context={context} />;
        })}
    </Sidebar>
));

function App() {
  return (
    <>
      <div
        className={'d-flex flex-column'}
        style={{
          minHeight: 0,
          flex: 1,
        }}
      >
        <div
          className="d-flex"
          style={{
            minHeight: 0,
            flex: 1,
          }}
        >
          <LocalSidebar />
          <Preview />
        </div>
      </div>

      <Dropzone />
      <WebsocketConnectionViewer />
    </>
  );
}

export default App;
