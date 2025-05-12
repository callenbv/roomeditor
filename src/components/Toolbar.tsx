import { useRoom } from '../contexts/RoomContext';

export default function Toolbar() {
  const { 
    selectedTool, 
    setSelectedTool,
    scale,
    setScale
  } = useRoom();

  return (
    <div className="flex items-center justify-between p-2 bg-gray-800 text-white">
      <div className="flex space-x-1">
        <ToolButton 
          title="Select" 
          active={selectedTool === 'select'} 
          onClick={() => setSelectedTool('select')}
          icon="🔍"
        />
        <ToolButton 
          title="Place" 
          active={selectedTool === 'place'} 
          onClick={() => setSelectedTool('place')}
          icon="✚"
        />
        <ToolButton 
          title="Erase" 
          active={selectedTool === 'erase'} 
          onClick={() => setSelectedTool('erase')}
          icon="🗑️"
        />
        <ToolButton 
          title="Pan" 
          active={selectedTool === 'pan'} 
          onClick={() => setSelectedTool('pan')}
          icon="✋"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <button 
          className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
          onClick={() => setScale(Math.max(0.1, scale - 0.1))}
        >
          -
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button 
          className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
          onClick={() => setScale(Math.min(3, scale + 0.1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  title: string;
  active: boolean;
  onClick: () => void;
  icon: string;
}

function ToolButton({ title, active, onClick, icon }: ToolButtonProps) {
  return (
    <button
      title={title}
      className={`p-2 rounded ${active ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
      onClick={onClick}
    >
      <span className="text-lg">{icon}</span>
    </button>
  );
} 