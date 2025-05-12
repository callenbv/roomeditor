import { useState, useRef, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Room, Layer, Instance } from '../types/room';

export default function Header() {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isRecentDialogOpen, setIsRecentDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isRoomPropertiesDialogOpen, setIsRoomPropertiesDialogOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomWidth, setNewRoomWidth] = useState('800');
  const [newRoomHeight, setNewRoomHeight] = useState('600');
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomWidth, setEditRoomWidth] = useState('');
  const [editRoomHeight, setEditRoomHeight] = useState('');
  const [editRoomType, setEditRoomType] = useState<string | undefined>(undefined);
  const [editRoomBiome, setEditRoomBiome] = useState<string | undefined>(undefined);
  const [editRoomChance, setEditRoomChance] = useState<string>('');
  const [exportFileName, setExportFileName] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [exportGameEngine, setExportGameEngine] = useState('gamemaker');
  const exportJsonRef = useRef<HTMLTextAreaElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const [dimensionsError, setDimensionsError] = useState('');
  const [chanceError, setChanceError] = useState('');
  
  const { 
    room, 
    setRoomName, 
    saveRoom, 
    loadRoom, 
    recentRooms, 
    updateRoomSize,
    updateRoomType,
    updateRoomBiome,
    updateRoomChance,
    // Tab-related props
    tabs,
    activeTabId,
    switchToTab,
    closeTab,
    addTab,
    objectDefinitions
  } = useRoom();

  // Handle clicks outside the file menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getAllSavedRooms = (): string[] => {
    const rooms: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('room_')) {
        rooms.push(key.replace('room_', ''));
      }
    }
    return rooms.sort();
  };

  const createNewRoom = () => {
    if (!newRoomName) return;
    
    // Import the createNewRoom helper function from RoomContext
    // to ensure default layers are included
    const newRoom = {
      instances: [],
      layers: [
        {
          name: "TilesForest",
          depth: 0,
          type: "tile" as const,
          visible: true,
          tiles: [],
          texture: "tileset_forest" // Default texture
        },
        {
          name: "Objects",
          depth: 100,
          type: "object" as const,
          visible: true,
          tiles: []
        }
      ],
      width: parseInt(newRoomWidth),
      height: parseInt(newRoomHeight),
      name: newRoomName,
      index: `@ref room(${newRoomName})`,
      type: undefined,
      biome: undefined
    };
    
    // Create a new tab for this room
    addTab(newRoom);
    
    setIsNewDialogOpen(false);
    setNewRoomName('');
  };

  const handleEditRoomProperties = () => {
    setEditRoomName(room.name);
    setEditRoomWidth(room.width.toString());
    setEditRoomHeight(room.height.toString());
    setEditRoomType(room.type);
    setEditRoomBiome(room.biome);
    setEditRoomChance(room.chance?.toString() || '');
    setIsRoomPropertiesDialogOpen(true);
  };

  const applyRoomPropertiesChange = () => {
    // Reset error states
    setDimensionsError('');
    setChanceError('');
    
    // Validate dimensions
    const width = parseInt(editRoomWidth);
    const height = parseInt(editRoomHeight);
    const chance = parseInt(editRoomChance);
    
    if (isNaN(width) || isNaN(height) || width < 100 || height < 100) {
      setDimensionsError('Please enter valid dimensions (minimum 100x100)');
      return;
    }

    if (editRoomChance && (isNaN(chance) || chance < 0 || chance > 100)) {
      setChanceError('Chance must be a number between 0 and 100');
      return;
    }
    
    // Create a new room object with all changes
    const newRoom = {
      ...room,
      width,
      height,
      name: editRoomName.trim() || room.name,
      type: editRoomType,
      biome: editRoomBiome,
      chance: editRoomChance ? chance : undefined
    };
    
    // Update room size first
    updateRoomSize(width, height);
    
    // Then update other properties if they've changed
    if (editRoomName.trim() && editRoomName !== room.name) {
      setRoomName(editRoomName.trim());
    }
    
    if (editRoomType !== room.type) {
      updateRoomType(editRoomType);
    }
    
    if (editRoomBiome !== room.biome) {
      updateRoomBiome(editRoomBiome);
    }

    if (editRoomChance !== (room.chance?.toString() || '')) {
      updateRoomChance(editRoomChance ? chance : undefined);
    }
    
    // Save the room to persist changes
    saveRoom();
    
    // Close the dialog
    setIsRoomPropertiesDialogOpen(false);
  };

  const exportRoomAsJson = () => {
    setExportFileName(room.name);
    setIsExportDialogOpen(true);
  };

  const copyToClipboard = () => {
    if (!exportJsonRef.current) return;
    
    exportJsonRef.current.select();
    document.execCommand('copy');
  };

  const downloadJson = () => {
    // Prepare the data based on the selected game engine
    let roomData;
    
    switch (exportGameEngine) {
      case 'unity':
        roomData = formatForUnity(room);
        break;
      case 'godot':
        roomData = formatForGodot(room);
        break;
      case 'gamemaker':
        roomData = formatForGameMaker(room);
        break;
      case 'generic':
      default:
        roomData = JSON.stringify(room, null, 2);
    }
    
    // Create the appropriate MIME type based on the format
    const mimeType = exportFormat === 'json' ? 'application/json' : 'text/plain';
    
    // Create a blob with the data
    const blob = new Blob([roomData], { type: mimeType });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${exportFileName || room.name}.${exportFormat}`;
    
    // Append to body, click, and clean up
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Revoke the URL to free up memory
    URL.revokeObjectURL(url);
    
    // Close the dialog
    setIsExportDialogOpen(false);
  };

  // Format converters for different game engines with proper typing
  const formatForUnity = (roomData: Room) => {
    // Unity prefers a specific structure for importing level data
    const unityData = {
      layers: roomData.layers.map((layer: Layer) => ({
        name: layer.name,
        type: layer.type,
        depth: layer.depth,
        visible: layer.visible,
        tiles: layer.tiles.map((tile: { x: number, y: number, index: number }) => ({
          x: tile.x / 16, // Convert to Unity units (assuming 16px tiles)
          y: tile.y / 16,
          id: tile.index // Changed from index to id for consistency
        }))
      })),
      objects: roomData.instances.map((instance: Instance) => {
        // Find object definition for height
        const objectDef = objectDefinitions.find((o: any) => o.name === instance.obj_name) || { height: 16 };
        return {
          prefabName: instance.obj_name,
          id: instance.obj_name.replace(/^o/, '') + '_' + Math.floor(Math.random() * 10000), // Add a unique ID
          position: {
            x: instance.x / 16, // Convert to Unity units
            y: (instance.y + objectDef.height) / 16, // Adjust Y to bottom
            z: 0
          },
          layerName: instance.instance_layer_name
        };
      }),
      roomSize: {
        width: roomData.width / 16,
        height: roomData.height / 16
      },
      name: roomData.name,
      id: roomData.index || `room_${roomData.name.replace(/\s+/g, '_').toLowerCase()}`,
      type: roomData.type,
      biome: roomData.biome,
      chance: roomData.chance
    };
    
    return JSON.stringify(unityData, null, 2);
  };
  
  const formatForGodot = (roomData: Room) => {
    // Godot format for scenes
    const godotData = {
      name: roomData.name,
      id: roomData.index || `room_${roomData.name.replace(/\s+/g, '_').toLowerCase()}`,
      size: {
        width: roomData.width,
        height: roomData.height
      },
      type: roomData.type,
      biome: roomData.biome,
      chance: roomData.chance,
      layers: roomData.layers.map((layer: Layer) => ({
        name: layer.name,
        id: `layer_${layer.name.replace(/\s+/g, '_').toLowerCase()}`,
        type: layer.type,
        z_index: layer.depth / 100, // Convert depth to Godot z-index
        visible: layer.visible,
        tiles: layer.tiles.map((tile: { x: number, y: number, index: number }) => ({
          position: { x: tile.x, y: tile.y },
          id: tile.index // Changed from tile_id to id for consistency
        }))
      })),
      objects: roomData.instances.map((instance: Instance) => {
        const objectDef = objectDefinitions.find((o: any) => o.name === instance.obj_name) || { height: 16 };
        return {
          type: instance.obj_name,
          id: `${instance.obj_name}_${Math.floor(Math.random() * 10000)}`,
          position: { x: instance.x, y: instance.y + objectDef.height },
          layer: instance.instance_layer_name
        };
      })
    };
    
    return JSON.stringify(godotData, null, 2);
  };
  
  const formatForGameMaker = (roomData: Room) => {
    // GameMaker Studio 2 format
    const gmData = {
      name: roomData.name,
      index: roomData.index || `room_${roomData.name.replace(/\s+/g, '_').toLowerCase()}`,
      width: roomData.width,
      height: roomData.height,
      type: roomData.type,
      biome: roomData.biome,
      chance: roomData.chance,
      layers: roomData.layers.map((layer: Layer) => {
        if (layer.type === 'tile') {
          return {
            name: layer.name,
            index: `layer_${layer.name.replace(/\s+/g, '_').toLowerCase()}`,
            type: "tile",
            depth: layer.depth,
            visible: layer.visible,
            tiles: layer.tiles.map((tile: { x: number, y: number, index: number }) => ({
              x: tile.x,
              y: tile.y,
              id: tile.index
            }))
          };
        } else {
          return {
            name: layer.name,
            id: `layer_${layer.name.replace(/\s+/g, '_').toLowerCase()}`,
            type: "object",
            depth: layer.depth,
            visible: layer.visible
          };
        }
      }),
      instances: roomData.instances.map((instance: Instance) => {
        const objectDef = objectDefinitions.find((o: any) => o.name === instance.obj_name) || { height: 16 };
        return {
          obj_name: instance.obj_name,
          x: instance.x,
          y: instance.y + objectDef.height,
          instance_layer_name: instance.instance_layer_name,
        };
      })
    };
    
    return JSON.stringify(gmData, null, 2);
  };

  // Update preview when format changes
  const getPreviewData = () => {
    switch (exportGameEngine) {
      case 'unity':
        return formatForUnity(room);
      case 'godot':
        return formatForGodot(room);
      case 'gamemaker':
        return formatForGameMaker(room);
      case 'generic':
      default:
        return JSON.stringify(room, null, 2);
    }
  };

  return (
    <div className="bg-gray-900 text-white flex flex-col">
      <div className="p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">Earthward Forge</h1>
            <span className="text-gray-400">|</span>
            
            {/* Room name and properties */}
            <div className="flex items-center ml-2">
              <span className="text-white font-medium">{room.name}</span>
              
              <div className="ml-4 flex items-center text-gray-300">
                <span>{room.width}×{room.height}</span>
                
                {room.type && (
                  <span className="ml-4 px-2 py-0.5 bg-gray-700 rounded text-xs">
                    Type: {room.type}
                  </span>
                )}
                
                {room.biome && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded text-xs">
                    Biome: {room.biome}
                  </span>
                )}
                
                <button 
                  className="ml-3 text-gray-400 hover:text-white"
                  onClick={handleEditRoomProperties}
                  title="Edit Properties"
                >
                  ✎
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 text-white"
              onClick={() => setIsNewDialogOpen(true)}
            >
              New
            </button>

            {/* Replace Open with dropdown */}
            <div className="relative" ref={fileMenuRef}>
              <button 
                className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 text-white flex items-center"
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
              >
                Open
                <span className="ml-1">▼</span>
              </button>
              
              {isFileMenuOpen && (
                <div className="absolute right-0 mt-1 bg-gray-800 rounded shadow-lg z-50 w-52 border border-gray-700">
                  <div className="py-1">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-200 flex items-center"
                      onClick={() => {
                        setIsFileMenuOpen(false);
                        setIsOpenDialogOpen(true);
                      }}
                    >
                      <span className="mr-2">📂</span> All Saved Rooms...
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <div className="px-4 py-1 text-xs text-gray-500">Recent</div>
                    {recentRooms.length > 0 ? (
                      recentRooms.slice(0, 5).map((roomName) => (
                        <button
                          key={roomName}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-200 text-sm"
                          onClick={() => {
                            loadRoom(roomName);
                            setIsFileMenuOpen(false);
                          }}
                        >
                          {roomName}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500 text-sm italic">No recent rooms</div>
                    )}
                    {recentRooms.length > 5 && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-blue-400 text-sm"
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          setIsRecentDialogOpen(true);
                        }}
                      >
                        See all recent rooms...
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 text-white"
              onClick={() => saveRoom()}
            >
              Save
            </button>
            <button 
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-white"
              onClick={exportRoomAsJson}
            >
              Export
            </button>
            <button 
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-white"
              onClick={handleEditRoomProperties}
            >
              Properties
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Bar */}
      <div className="flex overflow-x-auto bg-gray-800 border-t border-gray-700">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={`flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer ${
              tab.id === activeTabId ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
            }`}
          >
            <div 
              className="mr-2"
              onClick={() => switchToTab(tab.id)}
            >
              {tab.room.name}
            </div>
            {tabs.length > 1 && (
              <button
                className="ml-2 text-gray-500 hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close Tab"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Room Properties Dialog */}
      {isRoomPropertiesDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Room Properties</h2>
            
            <div className="space-y-4">
              <div className="mb-4">
                <label className="block mb-1 font-medium">Room Name:</label>
                <input
                  type="text"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium">Width:</label>
                  <input
                    type="number"
                    value={editRoomWidth}
                    onChange={(e) => setEditRoomWidth(e.target.value)}
                    className={`w-full px-3 py-2 border rounded ${dimensionsError ? 'border-red-500' : 'border-gray-300'}`}
                    min="100"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Height:</label>
                  <input
                    type="number"
                    value={editRoomHeight}
                    onChange={(e) => setEditRoomHeight(e.target.value)}
                    className={`w-full px-3 py-2 border rounded ${dimensionsError ? 'border-red-500' : 'border-gray-300'}`}
                    min="100"
                  />
                </div>
              </div>
              {dimensionsError && (
                <div className="text-red-500 text-sm">{dimensionsError}</div>
              )}
              
              <div className="mb-4">
                <label className="block mb-1 font-medium">Room Type:</label>
                <input
                  type="text"
                  value={editRoomType || ''}
                  onChange={(e) => setEditRoomType(e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Optional"
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-1 font-medium">Biome:</label>
                <input
                  type="text"
                  value={editRoomBiome || ''}
                  onChange={(e) => setEditRoomBiome(e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Optional"
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-1 font-medium">Chance (0-100):</label>
                <input
                  type="number"
                  value={editRoomChance}
                  onChange={(e) => setEditRoomChance(e.target.value)}
                  className={`w-full px-3 py-2 border rounded ${chanceError ? 'border-red-500' : 'border-gray-300'}`}
                  min="0"
                  max="100"
                  placeholder="Optional"
                />
              </div>
              {chanceError && (
                <div className="text-red-500 text-sm">{chanceError}</div>
              )}
              
              <p className="text-sm text-gray-500">Note: Changing room size won't affect existing tiles and objects.</p>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsRoomPropertiesDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={applyRoomPropertiesChange}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Room Dialog */}
      {isNewDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create New Room</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Width:</label>
                  <input
                    type="number"
                    value={newRoomWidth}
                    onChange={(e) => setNewRoomWidth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height:</label>
                  <input
                    type="number"
                    value={newRoomHeight}
                    onChange={(e) => setNewRoomHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    min="100"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsNewDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={createNewRoom}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!newRoomName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Rooms Dialog */}
      {isRecentDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Recent Rooms</h2>
            
            {recentRooms.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentRooms.map((roomName) => (
                  <div 
                    key={roomName}
                    className="p-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                    onClick={() => {
                      loadRoom(roomName);
                      setIsRecentDialogOpen(false);
                    }}
                  >
                    <span>{roomName}</span>
                    <span className="text-xs text-gray-500">Recently used</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent rooms</p>
            )}
            
            <div className="flex justify-end mt-6">
              <button 
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                onClick={() => setIsRecentDialogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Room Dialog - All Saved Rooms */}
      {isOpenDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Open Room</h2>
            
            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Search rooms..."
                onChange={(e) => {
                  // Would implement search functionality here
                }}
              />
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getAllSavedRooms().length > 0 ? (
                getAllSavedRooms().map((roomName) => (
                  <div 
                    key={roomName}
                    className="p-2 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      loadRoom(roomName);
                      setIsOpenDialogOpen(false);
                    }}
                  >
                    {roomName}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No saved rooms found</p>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                onClick={() => setIsOpenDialogOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Dialog */}
      {isExportDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white rounded-lg p-6 w-[600px]">
            <h2 className="text-xl font-bold mb-4">Export Room Data</h2>
            
            <div className="space-y-4">
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">File Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    placeholder="Enter file name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Format</label>
                  <select 
                    className="p-2 border border-gray-600 rounded bg-gray-700 text-white"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="json">JSON</option>
                    <option value="txt">Text</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Game Engine Format</label>
                <select 
                  className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                  value={exportGameEngine}
                  onChange={(e) => setExportGameEngine(e.target.value)}
                >
                  <option value="gamemaker">GameMaker Studio</option>
                  <option value="unity">Unity</option>
                  <option value="godot">Godot</option>
                  <option value="generic">Generic (Raw JSON)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Selecting a game engine will format the data specifically for that engine.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Preview</label>
                <textarea
                  ref={exportJsonRef}
                  className="w-full h-64 p-2 border border-gray-600 rounded bg-gray-700 text-white font-mono text-sm"
                  value={getPreviewData()}
                  readOnly
                />
              </div>
              
              <div className="flex justify-between pt-2">
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={copyToClipboard}
                >
                  Copy to Clipboard
                </button>
                <div className="space-x-2">
                  <button 
                    className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-700"
                    onClick={() => setIsExportDialogOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={downloadJson}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 