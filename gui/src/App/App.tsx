import React from 'react';
import './App.scss';
import Header from './Components/Header';
import Sidebar from './Components/Sidebar/Sidebar';
import { Preview } from './Components/Preview/Preview';

function App() {
  return (
    <>
      <Header />

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
    </>
  );
}

export default App;
