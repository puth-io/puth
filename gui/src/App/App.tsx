import React from 'react';
import './App.scss';
import Header from './Header';
import Sidebar from './Sidebar';
import { Preview } from './Preview';

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
