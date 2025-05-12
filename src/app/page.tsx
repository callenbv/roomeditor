'use client';

import { RoomProvider } from '../contexts/RoomContext';
import Header from '../components/Header';
import Toolbar from '../components/Toolbar';
import Sidebar from '../components/Sidebar';
import Canvas from '../components/Canvas';

export default function Home() {
  return (
    <RoomProvider>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Toolbar />
            <Canvas />
          </div>
          {/* ObjectPanel will be conditionally rendered in the Canvas component */}
        </div>
      </div>
    </RoomProvider>
  );
}
