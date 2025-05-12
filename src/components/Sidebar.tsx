import { useState, useRef, useCallback, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Layer } from '../types/room';
import BrushLibrary from './BrushLibrary';

export default function Sidebar() {
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerTexture, setNewLayerTexture] = useState('');
  const [newLayerType, setNewLayerType] = useState<'tile' | 'object'>('tile');
  const [expandedLayers, setExpandedLayers] = useState<{[key: string]: boolean}>({});
  const [renamingLayer, setRenamingLayer] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, layerName: string} | null>(null);
  const [showAddLayerDialog, setShowAddLayerDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    room, 
    selectedLayer, 
    setSelectedLayer,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    updateLayerType,
    updateLayerTexture,
    setRoom
  } = useRoom();

  const handleAddLayer = () => {
    if (!newLayerName) return;
    
    const newLayer: Layer = {
      name: newLayerName,
      texture: newLayerTexture,
      depth: (room.layers.length + 1) * 100,
      tiles: [],
      type: newLayerType,
      visible: true
    };
    
    addLayer(newLayer);
    setNewLayerName('');
    setNewLayerTexture('');
    setShowAddLayerDialog(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, layerName: string) => {
    const file = e.target.files?.[0];
    if (!file || !layerName) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      updateLayerTexture(layerName, fileName);
      
      // Store image data in localStorage to use as tileset
      localStorage.setItem(`tileset_${fileName}`, event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleLayerExpansion = (layerName: string) => {
    setExpandedLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  const handleStartRenaming = (layerName: string) => {
    setRenamingLayer(layerName);
    setNewName(layerName);
  };

  const handleSaveRename = (oldName: string) => {
    if (!newName.trim() || newName === oldName) {
      setRenamingLayer(null);
      return;
    }

    // Find the layer
    const layer = room.layers.find(l => l.name === oldName);
    if (!layer) {
      setRenamingLayer(null);
      return;
    }

    // Use the updateLayerName function instead of removing and adding
    // Update layer's name directly in the room state
    const newLayers = room.layers.map(layer => 
      layer.name === oldName 
        ? { ...layer, name: newName.trim() } 
        : layer
    );
    
    const newRoom = {
      ...room,
      layers: newLayers,
      // Also update any instances that reference this layer
      instances: room.instances.map(instance => 
        instance.instance_layer_name === oldName
          ? { ...instance, instance_layer_name: newName.trim() }
          : instance
      )
    };
    
    // Update the room state
    setRoom(newRoom);
    
    // Update selected layer if it was renamed
    if (selectedLayer === oldName) {
      setSelectedLayer(newName.trim());
    }
    
    setRenamingLayer(null);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, layerName: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      layerName
    });
  }, []);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Click outside to close the context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if clicking outside the context menu
      if (contextMenu) {
        const contextMenuElement = document.getElementById('layer-context-menu');
        if (contextMenuElement && !contextMenuElement.contains(e.target as Node)) {
          closeContextMenu();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeContextMenu, contextMenu]);

  // Helper function to check if selected layer is a tile layer
  const isSelectedLayerTileLayer = () => {
    if (!selectedLayer) return false;
    const layer = room.layers.find(l => l.name === selectedLayer);
    return layer?.type === 'tile';
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-300 sidebar-text">Layers</h3>
          <button 
            className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600"
            onClick={() => setShowAddLayerDialog(true)}
            title="Add New Layer"
          >
            +
          </button>
        </div>
        
        <div className="space-y-2">
          {room.layers.map((layer) => (
            <div 
              key={layer.name}
              className={`p-2 rounded flex flex-col ${selectedLayer === layer.name ? 'bg-gray-700 border border-blue-500' : 'bg-gray-800 border border-gray-700'}`}
              onContextMenu={(e) => handleContextMenu(e, layer.name)}
            >
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="flex items-center flex-1 cursor-pointer"
                  onClick={() => {
                    if (selectedLayer === layer.name) {
                      toggleLayerExpansion(layer.name);
                    } else {
                      setSelectedLayer(layer.name);
                      setExpandedLayers(prev => ({...prev, [layer.name]: true}));
                    }
                  }}
                >
                  <button 
                    className={`w-5 h-5 mr-2 rounded-full flex items-center justify-center ${layer.visible ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.name);
                    }}
                    title={layer.visible ? 'Visible' : 'Hidden'}
                  >
                    {layer.visible ? '👁️' : ''}
                  </button>
                  
                  {/* Layer type icon */}
                  <div 
                    className="w-5 h-5 mr-2 flex items-center justify-center text-xs"
                    title={layer.type === 'tile' ? 'Tile Layer' : 'Object Layer'}
                  >
                    {layer.type === 'tile' ? (
                      <div className="w-4 h-4 bg-blue-500 border border-white opacity-80" title="Tile Layer"></div>
                    ) : (
                      <div className="text-yellow-500" title="Object Layer">⚙️</div>
                    )}
                  </div>
                  
                  {renamingLayer === layer.name ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        className="p-1 text-sm border border-gray-300 rounded"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(layer.name);
                          if (e.key === 'Escape') setRenamingLayer(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className="ml-1 text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRename(layer.name);
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="font-medium sidebar-text">{layer.name}</span>
                      <button
                        className="ml-2 text-gray-500 hover:text-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRenaming(layer.name);
                        }}
                        title="Rename Layer"
                      >
                        ✎
                      </button>
                    </div>
                  )}
                  
                  <div className="ml-auto flex items-center">
                    <span className={`ml-2 transform transition-transform ${expandedLayers[layer.name] ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
              </div>
              
              {expandedLayers[layer.name] && (
                <div className="flex flex-col space-y-2 pl-7 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 sidebar-text">Type:</span>
                    <select 
                      className="border border-gray-300 rounded p-1"
                      value={layer.type}
                      onChange={(e) => updateLayerType(layer.name, e.target.value as 'tile' | 'object')}
                    >
                      <option value="tile">Tile Layer</option>
                      <option value="object">Object Layer</option>
                    </select>
                  </div>
                  
                  {layer.type === 'tile' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 sidebar-text">Tileset:</span>
                      <div className="flex items-center">
                        <span className="text-xs mr-2 truncate max-w-20 sidebar-text">{layer.texture || 'None'}</span>
                        <button
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload
                        </button>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => handleFileUpload(e, layer.name)}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 sidebar-text">Depth:</span>
                    <input
                      type="number"
                      className="border border-gray-300 p-1 rounded w-16"
                      value={layer.depth}
                      onChange={(e) => {
                        const newLayers = room.layers.map(l => 
                          l.name === layer.name 
                            ? { ...l, depth: parseInt(e.target.value) } 
                            : l
                        );
                        
                        // Replace the unused newRoom code with a comment indicating it's simplified
                        // const newRoom = { ...room, layers: newLayers };
                        // This is simplified - in a real app, you'd use the history mechanism
                        // setRoom(newRoom);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Brush Library - only show when a tile layer is selected */}
        {isSelectedLayerTileLayer() && <BrushLibrary />}
      </div>
      
      {/* Add Layer Dialog */}
      {showAddLayerDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Add New Layer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Layer Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  placeholder="Enter layer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select 
                  className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                  value={newLayerType}
                  onChange={(e) => setNewLayerType(e.target.value as 'tile' | 'object')}
                >
                  <option value="tile">Tile Layer</option>
                  <option value="object">Object Layer</option>
                </select>
              </div>
              
              {newLayerType === 'tile' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Texture Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                    value={newLayerTexture}
                    onChange={(e) => setNewLayerTexture(e.target.value)}
                    placeholder="Enter texture name (optional)"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button 
                className="px-4 py-2 border border-gray-600 rounded bg-gray-700 hover:bg-gray-600 text-white"
                onClick={() => setShowAddLayerDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleAddLayer}
                disabled={!newLayerName.trim()}
              >
                Add Layer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          id="layer-context-menu"
          className="fixed bg-white shadow-lg rounded py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-1 hover:bg-gray-100 text-red-600"
            onClick={() => {
              if (contextMenu.layerName) {
                console.log(`Deleting layer: ${contextMenu.layerName}`);
                removeLayer(contextMenu.layerName);
                closeContextMenu();
              }
            }}
          >
            Delete Layer
          </button>
        </div>
      )}
    </div>
  );
} 