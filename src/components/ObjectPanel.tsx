import { useState, useRef } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { ObjectDefinition } from '../types/room';

export default function ObjectPanel() {
  const [objectToEdit, setObjectToEdit] = useState<ObjectDefinition | null>(null);
  const [showObjectEditor, setShowObjectEditor] = useState(false);
  const objectImageRef = useRef<HTMLInputElement>(null);
  
  const { 
    objectDefinitions,
    selectedObject,
    setSelectedObject,
    setObjectDefinitions,
    setSelectedTool
  } = useRoom();
  
  // Handle object image upload
  const handleObjectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !objectToEdit) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (objectToEdit) {
        setObjectToEdit({
          ...objectToEdit,
          sprite: event.target?.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };
  
  const openObjectEditor = (obj: ObjectDefinition) => {
    setObjectToEdit({ ...obj });
    setShowObjectEditor(true);
  };
  
  const saveObjectChanges = (obj: ObjectDefinition) => {
    if (!obj) return;
    
    const updatedObjects = objectDefinitions.map(o => 
      o.name === obj.name ? obj : o
    );
    
    setObjectDefinitions(updatedObjects);
    localStorage.setItem('objectDefinitions', JSON.stringify(updatedObjects));
    
    setShowObjectEditor(false);
    setObjectToEdit(null);
  };
  
  // Handle selecting an object
  const handleObjectSelect = (obj: ObjectDefinition) => {
    setSelectedObject(obj);
    setSelectedTool('place');
  };

  return (
    <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <h3 className="font-medium text-gray-300 sidebar-text">Objects</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {objectDefinitions.map((obj) => (
            <div 
              key={obj.name}
              className={`p-2 rounded border cursor-pointer ${selectedObject?.name === obj.name ? 'bg-gray-700 border-blue-500' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => handleObjectSelect(obj)}
              onContextMenu={(e) => {
                e.preventDefault();
                openObjectEditor(obj);
              }}
            >
              {obj.sprite ? (
                <div 
                  className="w-full h-10 mb-1 rounded bg-cover bg-center" 
                  style={{ backgroundImage: `url(${obj.sprite})` }}
                />
              ) : (
                <div 
                  className="w-full h-10 mb-1 rounded" 
                  style={{ backgroundColor: obj.color }}
                />
              )}
              <div className="text-xs font-medium truncate sidebar-text">{obj.name}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-xs text-gray-400">
          <p>Select an object and click on the canvas to place it</p>
          <p className="mt-1">Right-click an object to edit properties or add a sprite</p>
        </div>
      </div>
      
      {/* Object Editor Dialog */}
      {showObjectEditor && objectToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Edit Object: {objectToEdit.name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  type="color"
                  className="w-full p-2 border border-gray-600 rounded h-10"
                  value={objectToEdit.color}
                  onChange={(e) => setObjectToEdit({...objectToEdit, color: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <div className="flex space-x-4">
                  <div>
                    <label className="block text-xs mb-1">Width</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                      value={objectToEdit.width}
                      onChange={(e) => setObjectToEdit({...objectToEdit, width: Math.max(16, parseInt(e.target.value))})}
                      min="16"
                      step="16"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Height</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                      value={objectToEdit.height}
                      onChange={(e) => setObjectToEdit({...objectToEdit, height: Math.max(16, parseInt(e.target.value))})}
                      min="16"
                      step="16"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Sprite</label>
                {objectToEdit.sprite ? (
                  <div className="relative w-full h-32 mb-2">
                    <div 
                      className="w-full h-full bg-cover bg-center border border-gray-600 rounded" 
                      style={{ backgroundImage: `url(${objectToEdit.sprite})` }}
                    />
                    <button 
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center"
                      onClick={() => setObjectToEdit({...objectToEdit, sprite: undefined})}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center border border-gray-600 rounded mb-2 bg-gray-700">
                    <span className="text-gray-400">No sprite</span>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  ref={objectImageRef}
                  onChange={handleObjectImageUpload}
                />
                
                <button
                  className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => objectImageRef.current?.click()}
                >
                  Upload Sprite
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button 
                className="px-4 py-2 border border-gray-600 rounded bg-gray-700 hover:bg-gray-600 text-white"
                onClick={() => {
                  setShowObjectEditor(false);
                  setObjectToEdit(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => saveObjectChanges(objectToEdit)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 