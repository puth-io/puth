import './App.scss';
import Header from './Components/Header';
import Sidebar from './Components/Sidebar/Sidebar';
import { Preview } from './Components/Preview/Preview';
import Dropzone from './Components/Dropzone/Dropzone';

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
        <Header />
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
    </>
  );
}

export default App;
