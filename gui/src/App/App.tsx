import React from 'react';
import './App.scss';
import Sidebar from './Components/Sidebar/Sidebar';
import { Preview } from './Components/Preview/Preview';
import Dropzone from './Components/Dropzone/Dropzone';

function App() {
  console.log('Render app');

  return (
    <>
      <div
        className={'d-flex'}
        style={{
          minHeight: 0,
          flex: 1,
        }}
      >
        <Sidebar />
        <Preview />
      </div>

      <Dropzone />
    </>
  );
}

export default App;
