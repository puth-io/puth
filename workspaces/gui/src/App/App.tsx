import './App.scss';
import Sidebar from './Components/Sidebar/Sidebar';
import { Preview } from './Components/Preview/Preview';
import Dropzone from './Components/Dropzone/Dropzone';
import Header from './Components/Header/Header';
import WebsocketConnectionViewer from './Components/WebsocketConnectionViewer/WebsocketConnectionViewer';
import './Components/Header/Header.scss';

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
        {/*<Header />*/}
        <div
          className="d-flex"
          style={{
            minHeight: 0,
            flex: 1,
          }}
        >
          <Sidebar />
          <Preview />
        </div>
      </div>

      <Dropzone />
      <WebsocketConnectionViewer />
    </>
  );
}

export default App;
