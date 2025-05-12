import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Room, Layer, Instance, ObjectDefinition, TileBrush, Tile } from '../types/room';

interface RoomAction {
  type: string;
  payload: {
    previousRoom?: Room;
    instance?: Instance;
    index?: number;
    layer?: Layer;
    layerName?: string;
    x?: number;
    y?: number;
    tileIndex?: number;
    type?: 'tile' | 'object';
    visible?: boolean;
    texture?: string;
    width?: number;
    height?: number;
    previousWidth?: number;
    previousHeight?: number;
    previousType?: string | undefined;
    previousBiome?: string | undefined;
    biome?: string | undefined;
    previousTile?: Tile | null;
    removedTile?: Tile;
    removedInstances?: Instance[];
    tilesBeforePlacement?: Array<{ layerName: string; x: number; y: number; index: number | null }>;
    tilesBefore?: Tile[];
    tilesModified?: Array<{x: number, y: number, prevIndex: number | null}>;
    startX?: number;
    startY?: number;
    prefab?: { name: string };
    batchedTiles?: Array<{layerName: string, x: number, y: number, index: number | null}>;
    [key: string]: any; // Fallback for any other properties
  };
  description: string;
}

// Add tab interface
interface RoomTab {
  id: string;
  room: Room;
  undoStack: RoomAction[];
  redoStack: RoomAction[];
  scale: number;
  panOffset: { x: number; y: number };
  selectedLayer: string | null;
  selectedTool: 'select' | 'place' | 'erase' | 'pan';
}

// Add SavedBrush interface for the brush library
interface SavedBrush extends TileBrush {
  id: string;
  name: string;
}

// Update RoomContextType with tab related functions
interface RoomContextType {
  room: Room;
  setRoom: (room: Room) => void;
  setRoomName: (name: string) => void;
  objectDefinitions: ObjectDefinition[];
  setObjectDefinitions: (objects: ObjectDefinition[]) => void;
  selectedTool: 'select' | 'place' | 'erase' | 'pan';
  setSelectedTool: (tool: 'select' | 'place' | 'erase' | 'pan') => void;
  selectedLayer: string | null;
  setSelectedLayer: (layer: string | null) => void;
  selectedObject: ObjectDefinition | null;
  setSelectedObject: (object: ObjectDefinition | null) => void;
  scale: number;
  setScale: (scale: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  saveRoom: () => void;
  loadRoom: (name: string) => void;
  recentRooms: string[];
  addInstance: (instance: Instance) => void;
  removeInstance: (index: number) => void;
  addLayer: (layer: Layer) => void;
  removeLayer: (name: string) => void;
  toggleLayerVisibility: (name: string) => void;
  updateLayerType: (name: string, type: 'tile' | 'object') => void;
  addTile: (layerName: string, x: number, y: number, index: number) => void;
  removeTile: (layerName: string, x: number, y: number) => void;
  updateLayerTexture: (name: string, texture: string) => void;
  updateRoomSize: (width: number, height: number) => void;
  updateRoomType: (type: string | undefined) => void;
  updateRoomBiome: (biome: string | undefined) => void;
  updateRoomChance: (chance: number | undefined) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Tab functions
  tabs: RoomTab[];
  activeTabId: string;
  addTab: (room: Room) => void;
  closeTab: (tabId: string) => void;
  switchToTab: (tabId: string) => void;
  getTabIdForRoom: (roomName: string) => string | null;
  tileBrush: TileBrush | null;
  setTileBrush: (brush: TileBrush | null) => void;
  copyTilesToBrush: (tiles: Tile[], width: number, height: number, texture: string, offsetX: number, offsetY: number) => void;
  applyTileBrush: (layerName: string, x: number, y: number) => void;
  // Add new brush library functions
  savedBrushes: SavedBrush[];
  saveBrushToLibrary: (name: string) => void;
  loadBrushFromLibrary: (brushId: string) => void;
  deleteBrushFromLibrary: (brushId: string) => void;
  // New functions for export/import
  exportBrushLibrary: () => string;
  importBrushLibrary: (jsonData: string) => boolean;
  startPainting: () => void;
  endPainting: () => void;
  addToHistory: (action: RoomAction) => void;
}

// Update the defaultRoom to include default layers
const defaultRoom: Room = {
  instances: [],
  layers: [
    {
      name: "TilesForest",
      depth: 0,
      type: "tile",
      visible: true,
      tiles: [],
      texture: "tileset_forest" // Default texture, assuming this exists
    },
    {
      name: "Objects",
      depth: 100, // Higher depth means it will render on top
      type: "object",
      visible: true,
      tiles: [] // Even object layers need an empty tiles array
    }
  ],
  width: 800,
  height: 600,
  name: 'New Room',
  index: '@ref room(New Room)',
  type: undefined,
  biome: undefined,
  chance: 100
};

// Helper function to create a new room with default layers
const createNewRoom = (name: string = 'New Room'): Room => {
  return {
    instances: [],
    layers: [
      {
        name: "TilesForest",
        depth: 0,
        type: "tile",
        visible: true,
        tiles: [],
        texture: "tileset_forest" // Default texture
      },
      {
        name: "Objects",
        depth: 100,
        type: "object",
        visible: true,
        tiles: []
      }
    ],
    width: 800,
    height: 600,
    name: name,
    index: `@ref room(${name})`,
    type: undefined,
    biome: undefined,
    chance: 100
  };
};

const defaultObjectDefinitions: ObjectDefinition[] = [
  { name: 'oRandomEnemy', width: 16, height: 16, color: '#ef4444' },
  { name: 'oRandomSpawner', width: 16, height: 16, color: '#84cc16' },
  { name: 'oRandomFlower', width: 16, height: 16, color: '#ec4899' },
  { name: 'oRandomRock', width: 16, height: 16, color: '#6b7280' },
  { name: 'oTorch', width: 16, height: 16, color: '#de8800' },
  { name: 'oChestChance', width: 16, height: 16, color: '#ae8800' },
  { name: 'oChest', width: 16, height: 16, color: '#ae8800' },
  { name: 'oHouse', width: 64, height: 64, color: '#af7000' },
  { name: 'oMerchant', width: 16, height: 15, color: '#0070a0' },
  { name: 'oTree', width: 16, height: 16, color: '#84cc16' },
  { name: 'oRandomResource', width: 16, height: 16, color: '#a8cc16' },
  { name: 'oGaiaStatue', width: 16, height: 16, color: '#a8cc16' },
];

const RoomContext = createContext<RoomContextType | null>(null);

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const [room, setRoom] = useState<Room>(() => {
    // Initialize with a deep copy of the default room
    return JSON.parse(JSON.stringify(defaultRoom));
  });
  const [objectDefinitions, setObjectDefinitions] = useState<ObjectDefinition[]>(defaultObjectDefinitions);
  const [selectedTool, setSelectedTool] = useState<'select' | 'place' | 'erase' | 'pan'>('select');
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<ObjectDefinition | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [tileBrush, setTileBrush] = useState<TileBrush | null>(null);
  const [savedBrushes, setSavedBrushes] = useState<SavedBrush[]>([]);
  
  // Undo/redo history
  const [undoStack, setUndoStack] = useState<RoomAction[]>([]);
  const [redoStack, setRedoStack] = useState<RoomAction[]>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Add action to undo stack
  const addToHistory = useCallback((action: RoomAction) => {
    if (isUndoRedoAction) return;
    
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]);
  }, [isUndoRedoAction]);

  // Room updater with history tracking
  const updateRoomWithHistory = useCallback((newRoom: Room, action: RoomAction, description: string) => {
    if (!isUndoRedoAction) {
      // Create a deep copy of the current room state
      const previousRoom = JSON.parse(JSON.stringify(room));
      
      // Add to history with the previous state
      addToHistory({
        type: action.type,
        payload: { 
          ...action.payload,
          previousRoom
        },
        description
      });
      
      // Clear redo stack when new action is added
      setRedoStack([]);
    }
    
    // Update the room state
    setRoom(newRoom);
  }, [room, addToHistory, isUndoRedoAction]);

  useEffect(() => {
    // Load recent rooms from localStorage
    const storedRecent = localStorage.getItem('recentRooms');
    if (storedRecent) {
      setRecentRooms(JSON.parse(storedRecent));
    }
  }, []);

  useEffect(() => {
    // Initialize with a single example brush if no brushes exist
    if (savedBrushes.length === 0) {
      const exampleBrush: SavedBrush = {
        id: 'example_brush_1',
        name: 'Example 1x1 Brush',
        tiles: [{ x: 0, y: 0, index: 0 }],
        width: 1,
        height: 1,
        texture: 'default',
        offsetX: 0,
        offsetY: 0
      };
      setSavedBrushes([exampleBrush]);
    }
  }, []);

  const setRoomName = (name: string) => {
    const newRoom = {
      ...room,
      name,
      index: `@ref room(${name})`
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'RENAME_ROOM',
      payload: { name },
      description: `Renamed room to "${name}"`
    }, `Renamed room to "${name}"`);
  };

  const saveRoom = () => {
    if (!room.name) return;
    
    try {
      // Save room to localStorage
      localStorage.setItem(`room_${room.name}`, JSON.stringify(room));
      
      // Update recent rooms
      const updatedRecent = [room.name, ...recentRooms.filter(r => r !== room.name)].slice(0, 10);
      setRecentRooms(updatedRecent);
      localStorage.setItem('recentRooms', JSON.stringify(updatedRecent));
      
      // Show success alert
      alert(`Room "${room.name}" saved successfully!`);
    } catch (error) {
      console.error('Error saving room:', error);
      alert(`Error saving room: ${error}`);
    }
  };

  // Add tab state
  const [tabs, setTabs] = useState<RoomTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  
  // Initialize with default room if no tabs
  useEffect(() => {
    if (tabs.length === 0) {
      const defaultTab = {
        id: `tab-${Date.now()}`,
        room: defaultRoom,
        undoStack: [],
        redoStack: [],
        scale: 1,
        panOffset: { x: 0, y: 0 },
        selectedLayer: null,
        selectedTool: 'select' as const
      };
      
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
      setRoom(defaultTab.room);
    }
  }, [tabs.length]);
  
  // Tab management functions
  const getTabIdForRoom = useCallback((roomName: string): string | null => {
    const tab = tabs.find(tab => tab.room.name === roomName);
    return tab ? tab.id : null;
  }, [tabs]);
  
  const switchToTab = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    
    // Save current tab state
    if (activeTabId) {
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === activeTabId
            ? {
                ...tab,
                room,
                undoStack,
                redoStack,
                scale,
                panOffset,
                selectedLayer,
                selectedTool
              }
            : tab
        )
      );
    }
    
    // Switch to selected tab
    const targetTab = tabs.find(tab => tab.id === tabId);
    if (targetTab) {
      setActiveTabId(tabId);
      setRoom(targetTab.room);
      setUndoStack(targetTab.undoStack);
      setRedoStack(targetTab.redoStack);
      setScale(targetTab.scale);
      setPanOffset(targetTab.panOffset);
      setSelectedLayer(targetTab.selectedLayer);
      setSelectedTool(targetTab.selectedTool);
    }
  }, [activeTabId, room, undoStack, redoStack, scale, panOffset, selectedLayer, selectedTool, tabs]);
  
  const addTab = useCallback((newRoom: Room) => {
    // Check if room is already open in a tab
    const existingTab = tabs.find(tab => tab.room.name === newRoom.name);
    if (existingTab) {
      // Switch to existing tab instead of creating a new one
      switchToTab(existingTab.id);
      return;
    }
    
    // Ensure the room has default layers if no layers exist
    const roomWithLayers = {
      ...newRoom,
      layers: newRoom.layers && newRoom.layers.length > 0 
        ? newRoom.layers 
        : [
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
          ]
    };
    
    const newTabId = `tab-${Date.now()}`;
    
    const newTab: RoomTab = {
      id: newTabId,
      room: roomWithLayers,
      undoStack: [],
      redoStack: [],
      scale: 1,
      panOffset: { x: 0, y: 0 },
      selectedLayer: null,
      selectedTool: 'select'
    };
    
    // Save state of current tab before switching
    if (activeTabId) {
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === activeTabId
            ? {
                ...tab,
                room,
                undoStack,
                redoStack,
                scale,
                panOffset,
                selectedLayer,
                selectedTool
              }
            : tab
        )
      );
    }
    
    // Add new tab and switch to it
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTabId);
    
    // Update current state to reflect new tab
    setRoom(roomWithLayers);
    setUndoStack([]);
    setRedoStack([]);
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedLayer(null);
    setSelectedTool('select');
  }, [activeTabId, room, undoStack, redoStack, scale, panOffset, selectedLayer, selectedTool, tabs, switchToTab]);
  
  const closeTab = useCallback((tabId: string) => {
    // Can't close the last tab
    if (tabs.length <= 1) return;
    
    // If closing active tab, switch to another tab first
    if (tabId === activeTabId) {
      const tabIndex = tabs.findIndex(tab => tab.id === tabId);
      const newIndex = tabIndex === 0 ? 1 : tabIndex - 1;
      switchToTab(tabs[newIndex].id);
    }
    
    // Remove the tab
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
  }, [tabs, activeTabId, switchToTab]);

  // Update old load room function to use tabs
  const loadRoom = (name: string) => {
    const roomData = localStorage.getItem(`room_${name}`);
    if (roomData) {
      const loadedRoom = JSON.parse(roomData);
      
      // Ensure all layers have type and visibility properties
      if (loadedRoom.layers) {
        loadedRoom.layers = loadedRoom.layers.map((layer: Layer) => ({
          ...layer,
          type: layer.type || 'tile',
          visible: layer.visible !== undefined ? layer.visible : true
        }));
      }
      
      // Check if room is already open in a tab
      const existingTab = tabs.find(tab => tab.room.name === name);
      if (existingTab) {
        // Switch to existing tab
        switchToTab(existingTab.id);
      } else {
        // Add new tab with loaded room
        addTab(loadedRoom);
      }
      
      // Update recent rooms
      const updatedRecent = [name, ...recentRooms.filter(r => r !== name)].slice(0, 10);
      setRecentRooms(updatedRecent);
      localStorage.setItem('recentRooms', JSON.stringify(updatedRecent));
    }
  };

  const addInstance = (instance: Instance) => {
    // Check if layer is compatible with objects
    if (!canPlaceObjectOnLayer(instance.instance_layer_name as string)) {
      console.warn('Cannot place object on a tile layer');
      return; // Don't add the instance
    }
    
    const newRoom = {
      ...room,
      instances: [...room.instances, instance]
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'ADD_INSTANCE',
      payload: {
        instance,
        previousRoom: room
      },
      description: `Added instance "${instance.obj_name}"`
    }, `Added instance "${instance.obj_name}"`);
  };

  const removeInstance = (index: number) => {
    const removedInstance = room.instances[index];
    const newRoom = {
      ...room,
      instances: room.instances.filter((_, i) => i !== index)
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'REMOVE_INSTANCE',
      payload: {
        instance: removedInstance,
        index
      },
      description: `Removed instance "${removedInstance.obj_name}"`
    }, `Removed instance "${removedInstance.obj_name}"`);
  };

  const addLayer = (layer: Layer) => {
    // Ensure layer has type and visibility properties
    const completeLayer = {
      ...layer,
      type: layer.type || 'tile',
      visible: layer.visible !== undefined ? layer.visible : true
    };
    
    const newRoom = {
      ...room,
      layers: [...room.layers, completeLayer]
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'ADD_LAYER',
      payload: {
        layer: completeLayer
      },
      description: `Added layer "${layer.name}"`
    }, `Added layer "${layer.name}"`);
  };

  const removeLayer = (name: string) => {
    const layerToRemove = room.layers.find(layer => layer.name === name);
    if (!layerToRemove) return; // Layer not found
    
    const newRoom = {
      ...room,
      layers: room.layers.filter(layer => layer.name !== name),
      // Also remove any instances that are on this layer
      instances: room.instances.filter(instance => instance.instance_layer_name !== name)
    };
    
    // If the deleted layer was the selected layer, clear the selection
    if (selectedLayer === name) {
      setSelectedLayer(null);
    }
    
    updateRoomWithHistory(newRoom, {
      type: 'REMOVE_LAYER',
      payload: {
        layer: layerToRemove,
        removedInstances: room.instances.filter(instance => instance.instance_layer_name === name)
      },
      description: `Removed layer "${name}"`
    }, `Removed layer "${name}"`);
  };

  const toggleLayerVisibility = (name: string) => {
    const newLayers = room.layers.map(layer => 
      layer.name === name 
        ? { ...layer, visible: !layer.visible } 
        : layer
    );
    
    const layer = room.layers.find(l => l.name === name);
    const newVisibility = !layer?.visible;
    
    const newRoom = {
      ...room,
      layers: newLayers
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'TOGGLE_LAYER_VISIBILITY',
      payload: {
        layerName: name,
        visible: newVisibility
      },
      description: `${newVisibility ? 'Showed' : 'Hid'} layer "${name}"`
    }, `${newVisibility ? 'Showed' : 'Hid'} layer "${name}"`);
  };

  const updateLayerType = (name: string, type: 'tile' | 'object') => {
    const newLayers = room.layers.map(layer => 
      layer.name === name 
        ? { ...layer, type } 
        : layer
    );
    
    const newRoom = {
      ...room,
      layers: newLayers
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'UPDATE_LAYER_TYPE',
      payload: {
        layerName: name,
        type
      },
      description: `Changed layer "${name}" type to ${type}`
    }, `Changed layer "${name}" type to ${type}`);
  };

  const updateLayerTexture = (name: string, texture: string) => {
    const newLayers = room.layers.map(layer => 
      layer.name === name 
        ? { ...layer, texture } 
        : layer
    );
    
    const newRoom = {
      ...room,
      layers: newLayers
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'UPDATE_LAYER_TEXTURE',
      payload: {
        layerName: name,
        texture
      },
      description: `Updated layer "${name}" texture to "${texture}"`
    }, `Updated layer "${name}" texture to "${texture}"`);
  };

  const [isPainting, setIsPainting] = useState(false);
  const [paintedTiles, setPaintedTiles] = useState<Array<{layerName: string, x: number, y: number, index: number | null}>>([]);
  const [initialRoomState, setInitialRoomState] = useState<Room | undefined>(undefined);

  const addTile = useCallback((layerName: string, x: number, y: number, index: number) => {
    // Create a deep copy of the current room
    const newRoom = JSON.parse(JSON.stringify(room));
    const layer = newRoom.layers.find((l: Layer) => l.name === layerName);
    if (!layer || layer.type !== 'tile') return;

    // Check if a tile already exists at this position
    const existingTileIndex = layer.tiles.findIndex((t: Tile) => t.x === x && t.y === y);
    if (existingTileIndex !== -1) {
      // Update existing tile
      layer.tiles[existingTileIndex] = { x, y, index };
    } else {
      // Add new tile
      layer.tiles.push({ x, y, index });
    }

    // If we're painting, add to the batch instead of updating history
    if (isPainting) {
      setPaintedTiles(prev => [...prev, { layerName, x, y, index }]);
      setRoom(newRoom);
    } else {
      // Update room with history for single tile placement
      updateRoomWithHistory(newRoom, {
        type: 'ADD_TILE',
        payload: {
          layerName,
          x,
          y,
          index
        },
        description: `Added tile at (${x}, ${y})`
      }, `Added tile at (${x}, ${y})`);
    }
  }, [room, updateRoomWithHistory, isPainting]);

  // New function to start painting
  const startPainting = useCallback(() => {
    setIsPainting(true);
    setPaintedTiles([]);
    setInitialRoomState(JSON.parse(JSON.stringify(room)));
  }, [room]);

  // New function to end painting
  const endPainting = useCallback(() => {
    if (!isPainting || paintedTiles.length === 0) {
      setIsPainting(false);
      setPaintedTiles([]);
      setInitialRoomState(undefined);
      return;
    }

    // Create a single undo action for all painted tiles
    const action: RoomAction = {
      type: 'BATCH_ADD_TILES',
      payload: {
        batchedTiles: paintedTiles,
        previousRoom: initialRoomState
      },
      description: `Added ${paintedTiles.length} tiles`
    };

    // Add to history
    addToHistory(action);

    // Reset painting state
    setIsPainting(false);
    setPaintedTiles([]);
    setInitialRoomState(undefined);
  }, [isPainting, paintedTiles, initialRoomState, addToHistory]);

  const removeTile = useCallback((layerName: string, x: number, y: number) => {
    // If we're painting, add to the batch instead of updating history
    if (isPainting) {
      setPaintedTiles(prev => [...prev, { layerName, x, y, index: null }]);
      setRoom(prevRoom => {
        const newRoom = { ...prevRoom };
        const layer = newRoom.layers.find(l => l.name === layerName);
        if (!layer || layer.type !== 'tile') return prevRoom;

        // Find and remove the tile
        layer.tiles = layer.tiles.filter(t => !(t.x === x && t.y === y));
        return newRoom;
      });
    } else {
      // Single tile removal with history
      setRoom(prevRoom => {
        const newRoom = { ...prevRoom };
        const layer = newRoom.layers.find(l => l.name === layerName);
        if (!layer || layer.type !== 'tile') return prevRoom;

        // Find the tile to remove
        const tileIndex = layer.tiles.findIndex(t => t.x === x && t.y === y);
        if (tileIndex === -1) return prevRoom;

        // Store the previous room state for undo
        const previousRoom = JSON.parse(JSON.stringify(prevRoom));
        
        // Remove the tile
        layer.tiles.splice(tileIndex, 1);

        // Update the room with history
        updateRoomWithHistory(newRoom, {
          type: 'REMOVE_TILE',
          payload: {
            layerName,
            x,
            y,
            previousRoom
          },
          description: `Removed tile at (${x}, ${y})`
        }, `Removed tile at (${x}, ${y})`);

        return newRoom;
      });
    }
  }, [updateRoomWithHistory, isPainting]);

  const updateRoomSize = (width: number, height: number) => {
    // Create a deep copy of the current room
    const newRoom = JSON.parse(JSON.stringify(room));
    
    // Store the previous dimensions for undo history
    const previousWidth = room.width;
    const previousHeight = room.height;
    
    // Update dimensions
    newRoom.width = width;
    newRoom.height = height;
    
    // Remove tiles that are now outside the room boundaries
    newRoom.layers = newRoom.layers.map((layer: Layer) => {
      if (layer.type === 'tile') {
        return {
          ...layer,
          tiles: layer.tiles.filter((tile: Tile) => 
            tile.x < width && tile.y < height && tile.x >= 0 && tile.y >= 0
          )
        };
      }
      return layer;
    });
    
    // Remove instances that are now outside the room boundaries
    newRoom.instances = newRoom.instances.filter((instance: Instance) => 
      instance.x < width && instance.y < height && instance.x >= 0 && instance.y >= 0
    );

    // Create the action for history
    const action = {
      type: 'UPDATE_ROOM_SIZE',
      payload: {
        width,
        height,
        previousWidth,
        previousHeight,
        previousRoom: room
      },
      description: `Changed room size to ${width}×${height}`
    };

    // Update the room state first
    setRoom(newRoom);

    // Then update the active tab's room state
    if (activeTabId) {
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === activeTabId
            ? {
                ...tab,
                room: newRoom,
                undoStack: [...tab.undoStack, action]
              }
            : tab
        )
      );
    }

    // Add to history
    addToHistory(action);

    // Save the room to persist changes
    try {
      localStorage.setItem(`room_${newRoom.name}`, JSON.stringify(newRoom));
    } catch (error) {
      console.error('Error saving room after size update:', error);
    }
  };

  const updateRoomType = (type: string | undefined) => {
    const newRoom = {
      ...room,
      type
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'UPDATE_ROOM_TYPE',
      payload: {
        previousType: room.type
      },
      description: `Updated room type to "${type || 'undefined'}"`
    }, `Updated room type to "${type || 'undefined'}"`);
  };

  const updateRoomBiome = (biome: string | undefined) => {
    const newRoom = {
      ...room,
      biome
    };
    
    updateRoomWithHistory(newRoom, {
      type: 'UPDATE_ROOM_BIOME',
      payload: {
        previousBiome: room.biome
      },
      description: `Updated room biome to "${biome || 'undefined'}"`
    }, `Updated room biome to "${biome || 'undefined'}"`);
  };

  const updateRoomChance = useCallback((chance: number | undefined) => {
    setRoom(prevRoom => ({
      ...prevRoom,
      chance
    }));
  }, []);

  // Validates if an object can be placed on the selected layer
  const canPlaceObjectOnLayer = useCallback((layerName: string): boolean => {
    const layer = room.layers.find(l => l.name === layerName);
    return layer?.type === 'object';
  }, [room.layers]);

  // Copy tiles to brush
  const copyTilesToBrush = (
    tiles: Tile[], 
    width: number, 
    height: number, 
    texture: string, 
    offsetX: number, 
    offsetY: number
  ) => {
    if (tiles.length === 0) return;
    
    console.log("Creating brush from tiles:", tiles);
    console.log("Brush dimensions:", width, "x", height);
    console.log("Brush offset:", offsetX, offsetY);
    
    // Calculate actual dimensions and offsets from the tiles
    const tileSize = 16; // We should ideally get this from the customTileSize
    const tileXCoords = tiles.map(tile => tile.x / tileSize);
    const tileYCoords = tiles.map(tile => tile.y / tileSize);
    
    // Calculate the min and max coordinates to determine actual dimensions
    const minX = Math.min(...tileXCoords);
    const maxX = Math.max(...tileXCoords);
    const minY = Math.min(...tileYCoords);
    const maxY = Math.max(...tileYCoords);
    
    // Calculate the brush width and height in tiles
    const actualWidth = maxX - minX + 1;
    const actualHeight = maxY - minY + 1;
    
    console.log("Actual brush dimensions:", actualWidth, "x", actualHeight);
    console.log("Min/Max X:", minX, maxX);
    console.log("Min/Max Y:", minY, maxY);
    
    // The offsetX and offsetY represent where the "hot spot" of the brush is
    // This is the tile coordinate (in brush space) that should be at the cursor
    // Default to center of the brush
    const actualOffsetX = Math.floor(actualWidth / 2);
    const actualOffsetY = Math.floor(actualHeight / 2);
    
    console.log("Calculated brush offset:", actualOffsetX, actualOffsetY);
    
    const brush: TileBrush = {
      tiles,
      width: actualWidth,
      height: actualHeight,
      texture,
      offsetX: actualOffsetX,
      offsetY: actualOffsetY
    };
    
    setTileBrush(brush);
    console.log(`Created tile brush with ${tiles.length} tiles and size ${actualWidth}x${actualHeight}`);
  };
  
  // Apply tile brush at specified position
  const applyTileBrush = (layerName: string, x: number, y: number) => {
    if (!tileBrush) return;
    
    // Find the layer
    const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
    if (layerIndex === -1 || room.layers[layerIndex].type !== 'tile') return;
    
    // Store the initial room state for undo
    const initialRoomState = JSON.parse(JSON.stringify(room));
    
    // Make a copy of the room
    const newRoom = { ...room };
    const newLayers = [...newRoom.layers];
    const targetLayer = { ...newLayers[layerIndex] };
    
    // The tileSize should be consistent
    const tileSize = 16;
    
    // Track all modified tiles for undo
    const batchedTiles: Array<{layerName: string, x: number, y: number, index: number | null}> = [];
    
    // Apply each tile from the brush
    tileBrush.tiles.forEach(brushTile => {
      const tileX = x + Math.round(brushTile.x * tileSize);
      const tileY = y + Math.round(brushTile.y * tileSize);
      
      // Make sure we're in bounds
      if (tileX < 0 || tileY < 0 || tileX >= room.width || tileY >= room.height) {
        return;
      }
      
      // Find if there's an existing tile at this position
      const existingTileIndex = targetLayer.tiles.findIndex(t => t.x === tileX && t.y === tileY);
      
      // Store for undo 
      batchedTiles.push({
        layerName,
        x: tileX,
        y: tileY,
        index: existingTileIndex !== -1 ? targetLayer.tiles[existingTileIndex].index : null
      });
      
      // Remove existing tile if any
      if (existingTileIndex !== -1) {
        targetLayer.tiles = targetLayer.tiles.filter((_, index) => index !== existingTileIndex);
      }
      
      // Add the new tile
      targetLayer.tiles.push({
        x: tileX,
        y: tileY,
        index: brushTile.index
      });
    });
    
    // Update the layer
    newLayers[layerIndex] = targetLayer;
    newRoom.layers = newLayers;
    
    // If we're painting, add to the batch instead of creating a new action
    if (isPainting) {
      setPaintedTiles(prev => [...prev, ...batchedTiles]);
      setRoom(newRoom);
    } else {
      // Create the action for single brush placement
      const action: RoomAction = {
        type: 'BATCH_ADD_TILES',
        payload: {
          batchedTiles,
          previousRoom: initialRoomState
        },
        description: `Applied tile brush at (${x}, ${y})`
      };

      // Add to history directly
      addToHistory(action);
      
      // Update the room state
      setRoom(newRoom);
    }
  };

  // Undo the last action
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const lastUndoAction = undoStack[undoStack.length - 1];
    setIsUndoRedoAction(true);
    
    // For most actions, we have the previous room state saved
    if (lastUndoAction.payload.previousRoom) {
      // Create a deep copy of the previous room state
      const previousRoom = JSON.parse(JSON.stringify(lastUndoAction.payload.previousRoom));
      
      // Update the room state
      setRoom(previousRoom);
      
      // Move action to redo stack and remove from undo stack
      setRedoStack(prev => [...prev, lastUndoAction]);
      setUndoStack(prev => prev.slice(0, -1));
      
      // Reset the undo/redo action flag after state updates
      setTimeout(() => setIsUndoRedoAction(false), 0);
      return;
    }
    
    // Apply action-specific logic based on saved data when needed
    switch (lastUndoAction.type) {
      case 'ADD_INSTANCE':
        {
          const instanceToRemove = lastUndoAction.payload.instance;
          if (instanceToRemove) {
            const instanceIndex = room.instances.findIndex(
              i => i.x === instanceToRemove.x && 
                 i.y === instanceToRemove.y &&
                 i.obj_name === instanceToRemove.obj_name
            );
            if (instanceIndex !== -1) {
              const newInstances = [...room.instances];
              newInstances.splice(instanceIndex, 1);
              setRoom({...room, instances: newInstances});
            }
          }
        }
        break;
        
      case 'REMOVE_INSTANCE':
        {
          const instanceToRestore = lastUndoAction.payload.instance;
          if (instanceToRestore && typeof instanceToRestore.instance_layer_name === 'string' && 
              canPlaceObjectOnLayer(instanceToRestore.instance_layer_name)) {
            const newInstances = [...room.instances, instanceToRestore];
            setRoom({...room, instances: newInstances});
          }
        }
        break;
        
      case 'ADD_LAYER':
        {
          // Remove the added layer
          const layerToRemove = lastUndoAction.payload.layer;
          if (layerToRemove) {
            const layerName = layerToRemove.name;
            const newLayers = room.layers.filter(layer => layer.name !== layerName);
            // Also remove instances on that layer
            const newInstances = room.instances.filter(instance => 
              instance.instance_layer_name !== layerName
            );
            
            setRoom({
              ...room,
              layers: newLayers,
              instances: newInstances
            });
          }
        }
        break;
        
      case 'REMOVE_LAYER':
        {
          // Restore the deleted layer
          const layerToRestore = lastUndoAction.payload.layer;
          const removedInstances = lastUndoAction.payload.removedInstances || [];
          
          if (layerToRestore) {
            const newLayers = [...room.layers, layerToRestore];
            const newInstances = [...room.instances, ...removedInstances];
            
            setRoom({
              ...room,
              layers: newLayers,
              instances: newInstances
            });
          }
        }
        break;
        
      case 'ADD_TILE':
        {
          const layerName = lastUndoAction.payload.layerName;
          const x = lastUndoAction.payload.x;
          const y = lastUndoAction.payload.y;
          
          if (layerName && typeof x === 'number' && typeof y === 'number') {
            const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
            if (layerIndex !== -1) {
              const newLayers = [...room.layers];
              // Remove tile at this position
              newLayers[layerIndex].tiles = newLayers[layerIndex].tiles.filter(
                tile => !(tile.x === x && tile.y === y)
              );
              
              const newRoom = {
                ...room,
                layers: newLayers
              };
              
              setRoom(newRoom);
            }
          }
        }
        break;
        
      case 'REMOVE_TILE':
        {
          const layerName = lastUndoAction.payload.layerName;
          const x = lastUndoAction.payload.x;
          const y = lastUndoAction.payload.y;
          const removedTile = lastUndoAction.payload.removedTile;
          
          if (layerName && typeof x === 'number' && typeof y === 'number' && removedTile) {
            const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
            if (layerIndex !== -1) {
              const newLayers = [...room.layers];
              // Add tile back with the correct index from removedTile
              newLayers[layerIndex].tiles.push({
                x: x,
                y: y,
                index: removedTile.index
              });
              
              const newRoom = {
                ...room,
                layers: newLayers
              };
              
              setRoom(newRoom);
            }
          }
        }
        break;
        
      case 'PLACE_PREFAB':
        {
          const tilesBeforePlacement = lastUndoAction.payload.tilesBeforePlacement;
          if (tilesBeforePlacement) {
            const newRoom = { ...room };
            
            tilesBeforePlacement.forEach((tile: { layerName: string; x: number; y: number; index: number | null }) => {
              const layerIndex = newRoom.layers.findIndex(l => l.name === tile.layerName);
              if (layerIndex === -1) return;
              
              const layer = newRoom.layers[layerIndex];
              
              if (tile.index === null) {
                // The tile didn't exist before, so remove it
                layer.tiles = layer.tiles.filter(t => !(t.x === tile.x && t.y === tile.y));
              } else {
                // Find the existing tile or add it back if it was replaced
                const tileIndex = layer.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
                if (tileIndex !== -1) {
                  // Update the existing tile to its previous state
                  layer.tiles[tileIndex].index = tile.index;
                } else {
                  // Add the tile back
                  layer.tiles.push({
                    x: tile.x,
                    y: tile.y,
                    index: tile.index
                  });
                }
              }
            });
            
            setRoom(newRoom);
          }
        }
        break;
      
      case 'UPDATE_ROOM_TYPE':
        {
          const newRoom = {
            ...room,
            type: lastUndoAction.payload.previousType
          };
          setRoom(newRoom);
        }
        break;
      
      case 'UPDATE_ROOM_BIOME':
        {
          const newRoom = {
            ...room,
            biome: lastUndoAction.payload.previousBiome
          };
          setRoom(newRoom);
        }
        break;
      
      case 'APPLY_TILE_BRUSH':
        {
          // Find the layer
          const layerName = lastUndoAction.payload.layerName;
          const tilesBefore = lastUndoAction.payload.tilesBefore;
          
          if (layerName && tilesBefore && Array.isArray(tilesBefore)) {
            const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
            if (layerIndex === -1) break;
            
            // Make a copy of the room and layers
            const newRoom = { ...room };
            const newLayers = [...newRoom.layers];
            const newLayer = { ...newLayers[layerIndex] };
            
            // Restore the previous tiles state
            newLayer.tiles = [...tilesBefore];
            
            // Update the layer and room
            newLayers[layerIndex] = newLayer;
            newRoom.layers = newLayers;
            
            // Apply the changes
            setRoom(newRoom);
          }
        }
        break;

      case 'BATCH_ADD_TILES':
        {
          if (lastUndoAction.payload.previousRoom) {
            // Restore the entire previous room state
            setRoom(lastUndoAction.payload.previousRoom);
          }
        }
        break;

      case 'BATCH_REMOVE_TILES':
        {
          if (lastUndoAction.payload.previousRoom) {
            // Restore the entire previous room state
            setRoom(lastUndoAction.payload.previousRoom);
          }
        }
        break;
    }
    
    // Move action to redo stack
    setRedoStack(prev => [...prev, lastUndoAction]);
    setUndoStack(prev => prev.slice(0, -1));
    
    // Reset the undo/redo action flag after state updates
    setTimeout(() => setIsUndoRedoAction(false), 0);
  }, [undoStack, room, canPlaceObjectOnLayer]);
  
  // Redo the last undone action
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const lastRedoAction = redoStack[redoStack.length - 1];
    setIsUndoRedoAction(true);
    
    // Apply action-specific logic based on saved data
    switch (lastRedoAction.type) {
      case 'ADD_INSTANCE':
        {
          const instanceToAdd = lastRedoAction.payload.instance;
          if (instanceToAdd && typeof instanceToAdd.instance_layer_name === 'string' && 
              canPlaceObjectOnLayer(instanceToAdd.instance_layer_name)) {
            const newInstances = [...room.instances, instanceToAdd];
            setRoom({...room, instances: newInstances});
          }
        }
        break;
        
      case 'REMOVE_INSTANCE':
        {
          const instanceToRemove = lastRedoAction.payload.instance;
          if (instanceToRemove) {
            const instanceIndex = room.instances.findIndex(
              i => i.x === instanceToRemove.x && 
                  i.y === instanceToRemove.y &&
                  i.obj_name === instanceToRemove.obj_name
            );
            if (instanceIndex !== -1) {
              const newInstances = [...room.instances];
              newInstances.splice(instanceIndex, 1);
              setRoom({...room, instances: newInstances});
            }
          }
        }
        break;
        
      case 'ADD_LAYER':
        {
          // Re-add the layer
          const layerToAdd = lastRedoAction.payload.layer;
          if (layerToAdd) {
            const newLayers = [...room.layers, layerToAdd];
            setRoom({
              ...room,
              layers: newLayers
            });
          }
        }
        break;
        
      case 'REMOVE_LAYER':
        {
          // Re-remove the layer
          const layerToRemove = lastRedoAction.payload.layer;
          if (layerToRemove) {
            const layerName = layerToRemove.name;
            const newLayers = room.layers.filter(layer => layer.name !== layerName);
            // Also re-remove instances on that layer
            const newInstances = room.instances.filter(instance => 
              instance.instance_layer_name !== layerName
            );
            
            setRoom({
              ...room,
              layers: newLayers,
              instances: newInstances
            });
          }
        }
        break;
        
      case 'ADD_TILE':
        {
          const layerName = lastRedoAction.payload.layerName;
          const x = lastRedoAction.payload.x;
          const y = lastRedoAction.payload.y;
          const tileIndex = lastRedoAction.payload.tileIndex;
          
          if (layerName && typeof x === 'number' && typeof y === 'number' && typeof tileIndex === 'number') {
            const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
            if (layerIndex !== -1) {
              const newLayers = [...room.layers];
              // Remove any existing tile at this position
              newLayers[layerIndex].tiles = newLayers[layerIndex].tiles.filter(
                tile => !(tile.x === x && tile.y === y)
              );
              // Add the new tile
              newLayers[layerIndex].tiles.push({
                x: x,
                y: y,
                index: tileIndex
              });
              
              const newRoom = {
                ...room,
                layers: newLayers
              };
              
              setRoom(newRoom);
            }
          }
        }
        break;
        
      case 'REMOVE_TILE':
        {
          const layerName = lastRedoAction.payload.layerName;
          const x = lastRedoAction.payload.x;
          const y = lastRedoAction.payload.y;
          const removedTile = lastRedoAction.payload.removedTile;
          
          if (layerName && typeof x === 'number' && typeof y === 'number' && removedTile) {
            const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
            if (layerIndex !== -1) {
              const newLayers = [...room.layers];
              // Remove tile at this position
              newLayers[layerIndex].tiles = newLayers[layerIndex].tiles.filter(
                tile => !(tile.x === x && tile.y === y)
              );
              
              const newRoom = {
                ...room,
                layers: newLayers
              };
              
              setRoom(newRoom);
            }
          }
        }
        break;
        
      case 'UPDATE_ROOM_TYPE':
        {
          // The payload contains the new type value in the room state
          if (lastRedoAction.payload.previousRoom) {
            setRoom(lastRedoAction.payload.previousRoom);
          } else {
            // If no previousRoom (should not happen), just apply the type
            const newRoom = {
              ...room,
              type: lastRedoAction.payload.type
            };
            setRoom(newRoom);
          }
        }
        break;
        
      case 'UPDATE_ROOM_BIOME':
        {
          // The payload contains the new biome value in the room state
          if (lastRedoAction.payload.previousRoom) {
            setRoom(lastRedoAction.payload.previousRoom);
          } else {
            // If no previousRoom (should not happen), just apply the biome
            const newRoom = {
              ...room,
              biome: lastRedoAction.payload.biome
            };
            setRoom(newRoom);
          }
        }
        break;
      
      case 'APPLY_TILE_BRUSH':
        {
          if (lastRedoAction.payload.previousRoom) {
            setRoom(lastRedoAction.payload.previousRoom);
          } else {
            // Recreate the action by redoing the changes 
            const layerName = lastRedoAction.payload.layerName;
            const tilesModified = lastRedoAction.payload.tilesModified;
            
            if (layerName && tilesModified && Array.isArray(tilesModified)) {
              const layerIndex = room.layers.findIndex(layer => layer.name === layerName);
              if (layerIndex === -1) break;
              
              // Make a copy of the room and modify it
              const newRoom = { ...room };
              const newLayers = [...newRoom.layers];
              
              // Apply the modified tiles manually
              const targetLayer = { ...newLayers[layerIndex] };
              
              // First, remove all the tiles at modified positions
              tilesModified.forEach(({ x, y }: { x: number, y: number }) => {
                targetLayer.tiles = targetLayer.tiles.filter(t => !(t.x === x && t.y === y));
              });
              
              // For each position with a non-null index, add a new tile
              tilesModified.forEach(({ x, y, prevIndex }: { x: number, y: number, prevIndex: number | null }) => {
                if (prevIndex !== null) {
                  targetLayer.tiles.push({ x, y, index: prevIndex });
                }
              });
              
              // Update the layers
              newLayers[layerIndex] = targetLayer;
              newRoom.layers = newLayers;
              
              setRoom(newRoom);
            }
          }
        }
        break;

      case 'BATCH_ADD_TILES':
        {
          const batchedTiles = lastRedoAction.payload.batchedTiles;
          if (batchedTiles && Array.isArray(batchedTiles)) {
            // Create a copy of the room
            const newRoom = { ...room };
            
            // Apply all the batched tiles
            batchedTiles.forEach(({ layerName, x, y, index }) => {
              const layerIndex = newRoom.layers.findIndex(layer => layer.name === layerName);
              if (layerIndex === -1) return;
              
              const layer = newRoom.layers[layerIndex];
              
              // Remove any existing tile at this position
              layer.tiles = layer.tiles.filter(t => !(t.x === x && t.y === y));
              
              // Add the new tile if index is not null
              if (index !== null) {
                layer.tiles.push({ x, y, index });
              }
            });
            
            setRoom(newRoom);
          }
        }
        break;
    }
    
    // Move action back to undo stack
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastRedoAction]);
    
    setTimeout(() => setIsUndoRedoAction(false), 0);
  }, [redoStack, room, canPlaceObjectOnLayer]);

  // Set up keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if key combinations match undo/redo (Ctrl+Z / Ctrl+Y)
      if (e.ctrlKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          redo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // Add event listener for prefab placement
  useEffect(() => {
    const handlePrefabPlaced = (e: CustomEvent) => {
      if (!e.detail) return;
      
      const { prefab, startX, startY, tilesBeforePlacement } = e.detail;
      
      // Add to undo history
      addToHistory({
        type: 'PLACE_PREFAB',
        payload: {
          prefab,
          startX,
          startY,
          tilesBeforePlacement,
          previousRoom: { ...room }
        },
        description: `Placed prefab "${prefab.name}" at (${startX}, ${startY})`
      });
    };
    
    document.addEventListener('prefab-placed', handlePrefabPlaced as EventListener);
    
    return () => {
      document.removeEventListener('prefab-placed', handlePrefabPlaced as EventListener);
    };
  }, [room, addToHistory]);

  // Save current brush to library (in-memory only)
  const saveBrushToLibrary = (name: string) => {
    if (!tileBrush) return;
    
    console.log("Saving brush to library:", name);
    
    const newBrush: SavedBrush = {
      ...tileBrush,
      id: `brush_${Date.now()}`,
      name: name
    };
    
    setSavedBrushes(prev => [...prev, newBrush]);
    console.log("Brush saved to memory:", newBrush);
  };
  
  // Load a brush from library
  const loadBrushFromLibrary = (brushId: string) => {
    console.log("Loading brush from library:", brushId);
    const brush = savedBrushes.find(b => b.id === brushId);
    
    if (brush) {
      console.log("Found brush:", brush);
      // Create a new instance of the brush without the id and name
      const { id, name, ...brushData } = brush;
      setTileBrush(brushData);
      
      // Also set the current tool to place
      setSelectedTool('place');
    } else {
      console.error("Brush not found:", brushId);
    }
  };
  
  // Delete a brush from library
  const deleteBrushFromLibrary = (brushId: string) => {
    console.log("Deleting brush from library:", brushId);
    const updatedBrushes = savedBrushes.filter(brush => brush.id !== brushId);
    setSavedBrushes(updatedBrushes);
  };
  
  // Export brush library to JSON string
  const exportBrushLibrary = () => {
    try {
      const jsonString = JSON.stringify(savedBrushes, null, 2);
      console.log("Exported brush library:", jsonString);
      return jsonString;
    } catch (error) {
      console.error("Error exporting brush library:", error);
      return "{}";
    }
  };
  
  // Import brush library from JSON string
  const importBrushLibrary = (jsonData: string) => {
    try {
      const parsedBrushes = JSON.parse(jsonData) as SavedBrush[];
      console.log("Imported brushes:", parsedBrushes);
      
      // Validate that the imported data is an array of SavedBrush objects
      if (!Array.isArray(parsedBrushes)) {
        console.error("Invalid brush data: not an array");
        return false;
      }
      
      // Ensure each brush has the required properties
      const validBrushes = parsedBrushes.filter(brush => {
        return brush 
          && typeof brush.id === 'string'
          && typeof brush.name === 'string'
          && Array.isArray(brush.tiles)
          && typeof brush.width === 'number'
          && typeof brush.height === 'number'
          && typeof brush.texture === 'string';
      });
      
      if (validBrushes.length !== parsedBrushes.length) {
        console.warn(`Some brushes were invalid. Imported ${validBrushes.length} of ${parsedBrushes.length} brushes.`);
      }
      
      // Set the validated brushes
      if (validBrushes.length > 0) {
        setSavedBrushes(validBrushes);
        return true;
      } else {
        console.error("No valid brushes found in imported data");
        return false;
      }
    } catch (error) {
      console.error("Error importing brush library:", error);
      return false;
    }
  };

  return (
    <RoomContext.Provider
      value={{
        room,
        setRoom,
        setRoomName,
        objectDefinitions,
        setObjectDefinitions,
        selectedTool,
        setSelectedTool,
        selectedLayer,
        setSelectedLayer,
        selectedObject,
        setSelectedObject,
        scale,
        setScale,
        panOffset,
        setPanOffset,
        saveRoom,
        loadRoom,
        recentRooms,
        addInstance,
        removeInstance,
        addLayer,
        removeLayer,
        toggleLayerVisibility,
        updateLayerType,
        addTile,
        removeTile,
        updateLayerTexture,
        updateRoomSize,
        updateRoomType,
        updateRoomBiome,
        updateRoomChance,
        undo,
        redo,
        canUndo,
        canRedo,
        // New tab functions
        tabs,
        activeTabId,
        addTab,
        closeTab,
        switchToTab,
        getTabIdForRoom,
        tileBrush,
        setTileBrush,
        copyTilesToBrush,
        applyTileBrush,
        // Add new brush library functions
        savedBrushes,
        saveBrushToLibrary,
        loadBrushFromLibrary,
        deleteBrushFromLibrary,
        // New export/import functions
        exportBrushLibrary,
        importBrushLibrary,
        startPainting,
        endPainting,
        addToHistory
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}; 