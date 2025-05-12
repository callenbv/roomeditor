import { useRef, useEffect, useState, MouseEvent, useCallback } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { ObjectDefinition, TileBrush } from '../types/room';
import TilesetSelector from './TilesetSelector';
import ObjectPanel from '../components/ObjectPanel';

interface TilesetDimensions {
  [key: string]: { width: number, height: number };
}

export default function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragObject, setDragObject] = useState<number | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number>(0);
  const [tilesetDimensions, setTilesetDimensions] = useState<TilesetDimensions>({});
  const [customTileSize, setCustomTileSize] = useState<number>(16);
  const [lastTilePosition, setLastTilePosition] = useState<{x: number, y: number} | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number} | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState(false);
  const [isAreaSelecting, setIsAreaSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [selectionArea, setSelectionArea] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isObjectLayerSelected, setIsObjectLayerSelected] = useState(false);
  
  const {
    room,
    objectDefinitions,
    addInstance,
    removeInstance,
    addTile,
    removeTile,
    selectedTool,
    selectedLayer,
    selectedObject,
    setSelectedObject,
    scale,
    panOffset,
    setPanOffset,
    setScale,
    setRoom,
    setSelectedTool,
    tileBrush, 
    setTileBrush,
    copyTilesToBrush,
    applyTileBrush,
    startPainting,
    endPainting,
    addToHistory
  } = useRoom();
  
  // Load tileset dimensions when layers change
  useEffect(() => {
    // Collect all unique texture names
    const textureNames = room.layers
      .filter(layer => layer.type === 'tile' && layer.texture)
      .map(layer => layer.texture as string)
      .filter((texture): texture is string => texture !== undefined);
      
    // Load each texture's dimensions
    const uniqueTextures = [...new Set(textureNames)];
    
    uniqueTextures.forEach(textureName => {
      if (!tilesetDimensions[textureName]) {
        const storedTileset = localStorage.getItem(`tileset_${textureName}`);
        if (storedTileset) {
          const img = new Image();
          img.onload = () => {
            setTilesetDimensions(prev => ({
              ...prev,
              [textureName]: {
                width: img.width,
                height: img.height
              }
            }));
          };
          img.src = storedTileset;
        }
      }
    });
  }, [room.layers, tilesetDimensions]);

  // Effect to handle layer type changes
  useEffect(() => {
    if (!selectedLayer) return;
    
    const layer = room.layers.find(layer => layer.name === selectedLayer);
    if (!layer) return;
    
    // If we switched to a tile layer but have an object selected, clear it
    if (layer.type === 'tile' && selectedObject) {
      setSelectedObject(null);
    }
    
    // If we're on a tile layer with the place tool but have no tileset, switch to select tool
    if (layer.type === 'tile' && selectedTool === 'place' && !layer.texture) {
      setSelectedTool('select');
    }
  }, [selectedLayer, room.layers, selectedObject, selectedTool, setSelectedObject, setSelectedTool]);

  // Add effect to track if an object layer is selected
  useEffect(() => {
    if (!selectedLayer) {
      setIsObjectLayerSelected(false);
      return;
    }
    
    const layer = room.layers.find(layer => layer.name === selectedLayer);
    if (!layer) {
      setIsObjectLayerSelected(false);
      return;
    }
    
    setIsObjectLayerSelected(layer.type === 'object');
  }, [selectedLayer, room.layers]);

  // Add effect to handle room dimension changes
  useEffect(() => {
    // Force a re-render when room dimensions change
    if (canvasRef.current) {
      canvasRef.current.style.width = `${room.width}px`;
      canvasRef.current.style.height = `${room.height}px`;
    }
  }, [room.width, room.height]);

  // Improved screen to room coordinates conversion accounting for scale and pan
  const screenToRoom = (x: number, y: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    // 1. Convert screen coordinates to canvas-relative coordinates
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    // 2. Apply inverse transformation
    // The canvas has transform: `translate(${panOffset.x * scale}px, ${panOffset.y * scale}px) scale(${scale})`
    // To go backwards, we:
    // a. Divide by scale (undoing the scale)
    // b. Subtract the scaled pan offset (undoing the translation)
    const roomX = canvasX / scale ;
    const roomY = canvasY / scale ;
    
    return { x: roomX, y: roomY };
  };

  // Snap to grid (using customTileSize instead of hardcoded value)
  const snapToGrid = (value: number, gridSize = customTileSize) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const placeTile = (x: number, y: number) => {
    if (!selectedLayer) return;
    
    const layerObj = room.layers.find(layer => layer.name === selectedLayer);
    if (!layerObj || layerObj.type !== 'tile') return;
    
    // Clear any selected object when placing tiles
    if (selectedObject) {
      setSelectedObject(null);
    }
    
    const tileSize = customTileSize;
    
    // If we have a tile brush, apply it; otherwise place a single tile
    if (tileBrush) {
      // Calculate the base position for the brush (top-left corner)
      // This needs to match exactly the same logic used in the preview rendering
      const snappedBaseX = Math.floor(x / tileSize) * tileSize;
      const snappedBaseY = Math.floor(y / tileSize) * tileSize;
      
      // Apply the offset to get the proper top-left position of the brush
      // Top-left position = cursor position - (offset * tileSize)
      const brushTopLeftX = snappedBaseX - (tileBrush.offsetX * tileSize);
      const brushTopLeftY = snappedBaseY - (tileBrush.offsetY * tileSize);
      
      console.log("Placing brush:");
      console.log("- Base position:", snappedBaseX, snappedBaseY);
      console.log("- Brush top-left:", brushTopLeftX, brushTopLeftY);
      console.log("- Brush dimensions:", tileBrush.width, tileBrush.height);
      console.log("- Tile count:", tileBrush.tiles.length);
      
      // Apply the brush directly
      applyTileBrush(selectedLayer, brushTopLeftX, brushTopLeftY);
      
      // Update last tile position to prevent double placement
      setLastTilePosition({ x: snappedBaseX, y: snappedBaseY });
    } else {
      // Use consistent snapping everywhere
      const snappedX = Math.floor(x / tileSize) * tileSize;
      const snappedY = Math.floor(y / tileSize) * tileSize;
      
      // Check if tile is within room bounds
      if (snappedX < 0 || snappedY < 0 || snappedX >= room.width || snappedY >= room.height) {
        return;
      }
      
      // Don't place the same tile twice
      if (lastTilePosition && lastTilePosition.x === snappedX && lastTilePosition.y === snappedY) {
        return;
      }
      
      setLastTilePosition({ x: snappedX, y: snappedY });
      
      // Place a single tile
      addTile(selectedLayer, snappedX, snappedY, selectedTileIndex);
    }
  };

  const eraseTile = (x: number, y: number) => {
    if (!selectedLayer) return;
    
    const layerObj = room.layers.find(layer => layer.name === selectedLayer);
    if (!layerObj || layerObj.type !== 'tile') return;
    
    const tileSize = customTileSize;
    
    // If we have a brush, use it for erasing with the same shape
    if (tileBrush) {
      // Calculate the base position for the brush (top-left corner)
      const snappedBaseX = Math.floor(x / tileSize) * tileSize;
      const snappedBaseY = Math.floor(y / tileSize) * tileSize;
      
      // Apply the offset to get the proper top-left position
      const brushTopLeftX = snappedBaseX - (tileBrush.offsetX * tileSize);
      const brushTopLeftY = snappedBaseY - (tileBrush.offsetY * tileSize);
      
      // Loop through each tile in the brush and erase the corresponding tile in the layer
      tileBrush.tiles.forEach(brushTile => {
        // Calculate the position to erase
        const eraseX = brushTopLeftX + Math.round(brushTile.x * tileSize);
        const eraseY = brushTopLeftY + Math.round(brushTile.y * tileSize);
        
        // Make sure we're in bounds
        if (eraseX < 0 || eraseY < 0 || eraseX >= room.width || eraseY >= room.height) {
          return;
        }
        
        // Check if there's a tile at this position
        const tileExists = layerObj.tiles.some(tile => tile.x === eraseX && tile.y === eraseY);
        if (tileExists) {
          removeTile(selectedLayer, eraseX, eraseY);
        }
      });
      
      // Don't erase the same tile position twice in rapid succession
      if (lastTilePosition && lastTilePosition.x === snappedBaseX && lastTilePosition.y === snappedBaseY) {
        return;
      }
      
      setLastTilePosition({ x: snappedBaseX, y: snappedBaseY });
    } else {
      // Standard single-tile erasing
      // Use consistent snapping everywhere
      const snappedX = Math.floor(x / tileSize) * tileSize;
      const snappedY = Math.floor(y / tileSize) * tileSize;
      
      // Check if position is within room bounds
      if (snappedX < 0 || snappedY < 0 || snappedX >= room.width || snappedY >= room.height) {
        return;
      }
      
      // Don't erase the same tile position twice in rapid succession
      if (lastTilePosition && lastTilePosition.x === snappedX && lastTilePosition.y === snappedY) {
        return;
      }
      
      setLastTilePosition({ x: snappedX, y: snappedY });
      
      // Check if there's actually a tile at this position to remove
      const tileExists = layerObj.tiles.some(tile => tile.x === snappedX && tile.y === snappedY);
      if (tileExists) {
        removeTile(selectedLayer, snappedX, snappedY);
      }
    }
  };

  // Update hover position while moving the mouse
  const handleMouseMoveCanvas = (e: MouseEvent) => {
    // Handle middle mouse button panning (has priority over other operations)
    if (isMiddleMouseDown) {
      // Calculate the change in position since last drag event
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Update pan offset - with the new transform order, we need to divide by scale
      // because the translation is applied before scaling
      setPanOffset({
        x: panOffset.x + dx / scale,
        y: panOffset.y + dy / scale
      });
      
      // Update drag start position for next frame
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Get room coordinates after handling pan
    const { x, y } = screenToRoom(e.clientX, e.clientY);
    
    // Show preview when using place or erase tool, and a layer is selected
    if ((selectedTool === 'place' || selectedTool === 'erase') && selectedLayer) {
      const layerObj = room.layers.find(layer => layer.name === selectedLayer);
      if (!layerObj) {
        setHoverPosition(null);
        return;
      }

      // For object layers, show object preview when an object is selected
      if (selectedObject && layerObj.type === 'object') {
        const objectSize = 16; // Use 16x16 grid for objects
        const snappedX = Math.floor(x / objectSize) * objectSize;
        const snappedY = Math.floor(y / objectSize) * objectSize;
        
        // Only show preview inside room bounds
        if (snappedX >= 0 && snappedY >= 0 && snappedX < room.width && snappedY < room.height) {
          setHoverPosition({ x: snappedX, y: snappedY });
        } else {
          setHoverPosition(null);
        }
        return;
      }
      
      // For tile layers, show preview for both place and erase tools
      if (!selectedObject && layerObj.type === 'tile') {
        const tileSize = customTileSize;
        const snappedX = Math.floor(x / tileSize) * tileSize;
        const snappedY = Math.floor(y / tileSize) * tileSize;
        
        // Only show preview inside room bounds
        if (snappedX >= 0 && snappedY >= 0 && snappedX < room.width && snappedY < room.height) {
          setHoverPosition({ x: snappedX, y: snappedY });
        } else {
          setHoverPosition(null);
        }
      } else {
        setHoverPosition(null);
      }
    } else {
      setHoverPosition(null);
    }
    
    // Painting tiles with left mouse button
    if (isPainting && selectedLayer) {
      const layerObj = room.layers.find(layer => layer.name === selectedLayer);
      if (layerObj && layerObj.type === 'tile' && !selectedObject) {
        placeTile(x, y);
      }
    }
    
    // Erasing tiles with left mouse button
    if (isErasing && selectedLayer) {
      const layerObj = room.layers.find(layer => layer.name === selectedLayer);
      if (layerObj && layerObj.type === 'tile') {
        eraseTile(x, y);
      }
    }
    
    // Handle dragging logic
    if (!isDragging) return;
    
    if (selectedTool === 'pan') {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      setPanOffset({
        x: panOffset.x + dx,
        y: panOffset.y + dy
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (dragObject !== null && selectedTool === 'select') {
      const roomCoords = screenToRoom(e.clientX, e.clientY);
      const snappedX = snapToGrid(roomCoords.x);
      const snappedY = snapToGrid(roomCoords.y);
      
      // Update instance position
      const updatedInstances = [...room.instances];
      updatedInstances[dragObject] = {
        ...updatedInstances[dragObject],
        x: snappedX,
        y: snappedY
      };
      
      // Update the room with new instance positions
      setRoom({
        ...room,
        instances: updatedInstances
      });
    }

    // Moving a selection - when we have a selection area but we're not in area selecting mode
    if (selectionArea && !isAreaSelecting && selectedTool === 'select' && dragObject === null) {
      // Calculate the movement delta in room coordinates
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      if (Math.abs(dx) >= customTileSize || Math.abs(dy) >= customTileSize) {
        // Snap to grid - move by whole tiles
        const gridDx = Math.round(dx / customTileSize) * customTileSize;
        const gridDy = Math.round(dy / customTileSize) * customTileSize;
        
        // Update selection area position
        setSelectionArea(prev => {
          if (!prev) return null;
          return {
            ...prev,
            x: prev.x + gridDx,
            y: prev.y + gridDy
          };
        });
        
        // Update drag start position
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
    }

    // Handle area selection
    if (isAreaSelecting && selectionStart && isDragging) {
      // Ensure we're working with the latest mouse position
      const snappedX = Math.floor(x / customTileSize) * customTileSize;
      const snappedY = Math.floor(y / customTileSize) * customTileSize;
      
      // Calculate new selection area - ensure minimum size is one tile
      const minX = Math.min(selectionStart.x, snappedX);
      const minY = Math.min(selectionStart.y, snappedY);
      
      // Make sure we include the full tile the mouse is over
      const maxX = Math.max(selectionStart.x, snappedX + customTileSize);
      const maxY = Math.max(selectionStart.y, snappedY + customTileSize);
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      // Update the selection area
      setSelectionArea({
        x: minX,
        y: minY,
        width: width,
        height: height
      });
      
      return;
    }
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    handleMouseUp();
    setIsMiddleMouseDown(false);
  };

  const handleMouseDown = (e: MouseEvent) => {
    // Middle mouse button (for panning)
    if (e.button === 1) {
      e.preventDefault();
      setIsMiddleMouseDown(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    // Close context menu if it's open
    if (contextMenuPosition) {
      setContextMenuPosition(null);
    }
    
    // Left click
    if (e.button === 0) {
      const { x, y } = screenToRoom(e.clientX, e.clientY);
      
      if (selectedTool === 'pan') {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
      
      if (selectedTool === 'select') {
        // Check if we already have a selection and are clicking inside it
        if (selectionArea && !isAreaSelecting) {
          const tileX = Math.floor(x / customTileSize) * customTileSize;
          const tileY = Math.floor(y / customTileSize) * customTileSize;
          
          // Check if click is inside the selection area
          if (
            tileX >= selectionArea.x && 
            tileX < selectionArea.x + selectionArea.width &&
            tileY >= selectionArea.y && 
            tileY < selectionArea.y + selectionArea.height
          ) {
            // Start dragging the selection
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            return;
          } else {
            // Clicked outside the selection, clear it and don't start a new one
            setSelectionArea(null);
            setSelectionStart(null);
            return; // Add a return here to prevent starting a new selection
          }
        }
        
        // Check if clicked on an instance
        const clickedInstanceIndex = room.instances.findIndex(instance => {
          const obj = objectDefinitions.find((o: ObjectDefinition) => o.name === instance.obj_name) || 
                    { width: 32, height: 32 };
          return (
            x >= instance.x &&
            x <= instance.x + obj.width &&
            y >= instance.y &&
            y <= instance.y + obj.height
          );
        });
        
        if (clickedInstanceIndex !== -1) {
          setIsDragging(true);
          setDragObject(clickedInstanceIndex);
          setDragStart({ x: e.clientX, y: e.clientY });
          return;
        }
        
        // If no instance was clicked and we have a tile layer selected, enter area selection mode
        const selectedLayerObj = room.layers.find(layer => layer.name === selectedLayer);
        if (selectedLayerObj?.type === 'tile') {
          console.log("Starting tile selection");
          // Start area selection for tiles
          setIsAreaSelecting(true);
          
          // Snap to grid
          const tileSize = customTileSize;
          const snappedX = Math.floor(x / tileSize) * tileSize;
          const snappedY = Math.floor(y / tileSize) * tileSize;
          
          // Set the starting point of the selection
          setSelectionStart({ x: snappedX, y: snappedY });
          
          // Initialize the selection area with a size of one tile
          setSelectionArea({
            x: snappedX,
            y: snappedY,
            width: tileSize,
            height: tileSize
          });
          
          // Set cursor style to crosshair and indicate that we're dragging
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'crosshair';
          }
          setIsDragging(true);
        } else {
          console.log("Cannot select: Not on a tile layer");
        }
        return;
      }
      
      // If we're not in select mode but have a selection, clear it
      if (selectionArea && (selectedTool === 'place' || selectedTool === 'erase' || selectedTool === 'pan')) {
        setSelectionArea(null);
        setSelectionStart(null);
      }
      
      if (selectedTool === 'place') {
        // Start painting
        setIsPainting(true);
        startPainting();
        
        // Place object or tile based on selection
        if (selectedObject && selectedLayer !== null) {
          // Check if the selected layer is an object layer
          const layerObj = room.layers.find(layer => layer.name === selectedLayer);
          if (layerObj?.type !== 'object') {
            // Can't place objects on a tile layer
            return;
          }
          
          const objectSize = 16; // Use 16x16 grid for objects
          const snappedX = Math.floor(x / objectSize) * objectSize;
          const snappedY = Math.floor(y / objectSize) * objectSize;
          
          // Check if object is within room bounds
          if (snappedX < 0 || snappedY < 0 || snappedX >= room.width || snappedY >= room.height) {
            return;
          }
          
          addInstance({
            instance_layer_name: selectedLayer,
            obj_name: selectedObject.name,
            x: snappedX,
            y: snappedY
          });
        } else if (selectedLayer && !selectedObject) {
          // Check if the selected layer is a tile layer
          const layerObj = room.layers.find(layer => layer.name === selectedLayer);
          if (!layerObj || layerObj.type !== 'tile') {
            // Can't place tiles on an object layer
            return;
          }
          
          // Handle placing tiles
          placeTile(x, y);
        }
      }
      
      if (selectedTool === 'erase') {
        // Start erasing
        setIsErasing(true);
        startPainting();
        
        // Find and remove instance or tile at position
        const clickedInstanceIndex = room.instances.findIndex(instance => {
          const obj = objectDefinitions.find((o: ObjectDefinition) => o.name === instance.obj_name) || 
                   { width: 32, height: 32 };
          return (
            x >= instance.x &&
            x <= instance.x + obj.width &&
            y >= instance.y &&
            y <= instance.y + obj.height
          );
        });
        
        if (clickedInstanceIndex !== -1) {
          removeInstance(clickedInstanceIndex);
        } else if (selectedLayer) {
          // Remove tile at position
          eraseTile(x, y);
        }
      }
    }
    
    // Right click - always erases or acts on selections, never shows context menu
    if (e.button === 2) {
      e.preventDefault();
      handleContextMenu(e);
    }
  };

  const handleMouseUp = (e?: MouseEvent) => {
    // If it's not a specific button event or it's the middle button, reset middle mouse state
    if (!e || e.button === 1) {
      setIsMiddleMouseDown(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    }
    
    setIsDragging(false);
    setDragObject(null);
    setLastTilePosition(null);
    
    // End painting and record the action
    if (isPainting || isErasing) {
      endPainting();
    }
    
    setIsPainting(false);
    setIsErasing(false);

    // Complete area selection if in selection mode
    if (isAreaSelecting && selectionStart && selectionArea) {
      // Keep the selection active for now
      // The selection will be cleared when the prefab is created
      if (selectionArea.width < customTileSize || selectionArea.height < customTileSize) {
        // Selection too small, reset
        setSelectionStart(null);
        setSelectionArea(null);
        setIsAreaSelecting(false); // Also exit selection mode
        
        // Clear any selected tiles
        if (selectedLayer) {
          const layer = room.layers.find(l => l.name === selectedLayer);
          if (layer && layer.type === 'tile') {
            layer.tiles.forEach(tile => {
              tile.selected = false;
            });
          }
        }
        
        // Show a brief message about the failed selection
        if (canvasRef.current) {
          const message = document.createElement('div');
          message.style.position = 'absolute';
          message.style.top = '50%';
          message.style.left = '50%';
          message.style.transform = 'translate(-50%, -50%)';
          message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          message.style.color = 'white';
          message.style.padding = '10px';
          message.style.borderRadius = '5px';
          message.style.zIndex = '1000';
          message.innerText = 'Selection too small. Try again.';
          
          canvasRef.current.appendChild(message);
          
          setTimeout(() => {
            if (canvasRef.current?.contains(message)) {
              canvasRef.current.removeChild(message);
            }
          }, 2000);
        }
      } else {
        // Keep selection active, but exit area selecting mode
        setIsAreaSelecting(false);
      }
      
      // Reset cursor
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    }
  };

  // Add useCallback for the getTilesInSelection function
  const getTilesInSelection = useCallback(() => {
    if (!selectionArea || !selectedLayer) return [];
    
    const layer = room.layers.find(layer => layer.name === selectedLayer);
    if (!layer || layer.type !== 'tile') return [];
    
    const { x, y, width, height } = selectionArea;
    console.log("Looking for tiles in selection area:", x, y, width, height);
    
    // Mark tiles as selected and return them
    const tilesInSelection = layer.tiles.filter(tile => {
      // Check if the tile's position falls within the selection area
      // Using proper boundary checking with inclusive left/top edges and exclusive right/bottom edges
      const isInSelection = 
        tile.x >= x && 
        tile.x < (x + width) && 
        tile.y >= y && 
        tile.y < (y + height);
      
      // Mark the tile as selected
      if (isInSelection) {
        tile.selected = true;
      } else {
        tile.selected = false;
      }
      
      return isInSelection;
    });
    
    console.log("Found tiles in selection:", tilesInSelection.length);
    return tilesInSelection;
  }, [selectionArea, selectedLayer, room.layers]);

  // Fix the copySelectionToBrush function to switch to place mode after copying
  const copySelectionToBrush = useCallback(() => {
    if (!selectionArea || !selectedLayer) return;
    
    const selectedLayerObj = room.layers.find(layer => layer.name === selectedLayer);
    if (!selectedLayerObj || selectedLayerObj.type !== 'tile' || !selectedLayerObj.texture) return;
    
    const tilesInSelection = getTilesInSelection();
    if (tilesInSelection.length === 0) {
      console.warn("No tiles to copy in selection");
      return;
    }
    
    // Calculate bounds for the selection
    const minX = Math.min(...tilesInSelection.map(tile => tile.x));
    const minY = Math.min(...tilesInSelection.map(tile => tile.y));
    
    // Use the custom tile size to ensure consistent spacing
    const tileSize = customTileSize;
    
    // Width and height in tiles (rounded up to ensure we capture all tiles)
    const widthInTiles = Math.ceil(selectionArea.width / tileSize);
    const heightInTiles = Math.ceil(selectionArea.height / tileSize);
    
    // Log what we're doing
    console.log("Creating brush from selection:");
    console.log("- Selection area:", selectionArea);
    console.log("- Tiles in selection:", tilesInSelection);
    console.log("- Tile size:", tileSize);
    console.log("- Min X/Y:", minX, minY);
    
    // Normalize the tiles relative to the top-left corner of the selection
    // This is critical for positioning correctly
    const normalizedTiles = tilesInSelection.map(tile => {
      // Calculate tile position in grid coordinates (not pixels)
      const gridX = (tile.x - minX) / tileSize;
      const gridY = (tile.y - minY) / tileSize;
      
      return {
        x: gridX,  // Store as grid coordinates
        y: gridY,  // Store as grid coordinates
        index: tile.index
      };
    });
    
    console.log("Normalized tiles:", normalizedTiles);
    
    // Calculate the center point for offset
    const offsetX = Math.floor(widthInTiles / 2);
    const offsetY = Math.floor(heightInTiles / 2);
    
    // Create the brush
    const brush: TileBrush = {
      tiles: normalizedTiles,
      width: widthInTiles,
      height: heightInTiles,
      texture: selectedLayerObj.texture,
      offsetX: offsetX,
      offsetY: offsetY
    };
    
    setTileBrush(brush);
    console.log("Created brush:", brush);
    
    // Clear the selection
    setSelectionArea(null);
    setSelectionStart(null);
    
    // Switch to place mode automatically
    setSelectedTool('place');
    console.log("Switched to place mode after creating brush");
  }, [selectionArea, selectedLayer, room.layers, getTilesInSelection, customTileSize, setTileBrush, setSelectedTool]);

  // Update handleContextMenu to use the new copySelectionToBrush function
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    
    // Instead of showing a context menu, immediately act on the right click
    const { x, y } = screenToRoom(e.clientX, e.clientY);
    
    // If we have a selection, handle making a brush from it
    if (selectionArea && selectedLayer) {
      copySelectionToBrush();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom in/out on wheel
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * zoomFactor));
    
    // Update scale in RoomContext
    setScale(newScale);
  };

  // Handle tile size changes from the TilesetSelector
  const handleTileSizeChange = (newSize: number) => {
    setCustomTileSize(newSize);
  };

  // Render tile selector if a layer is selected and no object is selected
  const renderTileSelector = () => {
    if (!selectedLayer) return null;
    
    const selectedLayerObj = room.layers.find(layer => layer.name === selectedLayer);
    if (!selectedLayerObj || selectedLayerObj.type !== 'tile') return null;
    
    // Always render the tile selector for tile layers, regardless of whether an object is selected
    // This makes it visible when switching from object to tile layer
    return (
      <div className="absolute bottom-4 left-4 z-10">
        <TilesetSelector
          layerName={selectedLayer}
          tileSize={customTileSize}
          onTileSelect={(index) => setSelectedTileIndex(index)}
          onTileSizeChange={handleTileSizeChange}
        />
      </div>
    );
  };

  // Render a single tile
  const renderTile = (tileTexture: string, tileIndex: number, x: number, y: number, tileKey: string) => {
    const tilesetImg = localStorage.getItem(`tileset_${tileTexture}`);
    const dimensions = tilesetDimensions[tileTexture];
    
    if (tilesetImg && dimensions) {
      // Calculate columns in the tileset
      const tileSize = customTileSize;
      const cols = Math.floor(dimensions.width / tileSize);
      
      // Calculate position in tileset
      const row = Math.floor(tileIndex / cols);
      const col = tileIndex % cols;
      
      return (
        <div
          key={tileKey}
          className="absolute"
          style={{
            left: x,
            top: y,
            width: tileSize,
            height: tileSize,
            backgroundImage: `url(${tilesetImg})`,
            backgroundPosition: `-${col * tileSize}px -${row * tileSize}px`,
            backgroundSize: `${dimensions.width}px ${dimensions.height}px`,
            imageRendering: 'pixelated'
          }}
        />
      );
    }
    
    // Fallback when no image is available
    return (
      <div
        key={tileKey}
        className="absolute bg-gray-300"
        style={{
          left: x,
          top: y,
          width: customTileSize,
          height: customTileSize,
          backgroundColor: '#ddd',
          border: '1px solid #ccc'
        }}
      />
    );
  };

  // Fix the renderTilePreview function to accurately show all tiles in the brush
  const renderTilePreview = () => {
    if (!hoverPosition) {
      return null;
    }

    // Standard layer-based previews
    if (!selectedLayer) return null;
    
    const selectedLayerObj = room.layers.find(layer => layer.name === selectedLayer);
    if (!selectedLayerObj) return null;

    // If the user has an object selected but is hovering over a tile layer,
    // or has no object selected but is hovering over an object layer,
    // don't show any preview
    if ((selectedObject && selectedLayerObj.type !== 'object') || 
        (!selectedObject && selectedLayerObj.type !== 'tile')) {
      return null;
    }

    // If we have a selected object and we're on an object layer, show object preview
    if (selectedObject && selectedLayerObj.type === 'object') {
      return (
        <div
          className="absolute border border-blue-500 pointer-events-none"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y,
            width: selectedObject.width,
            height: selectedObject.height,
            zIndex: 200,
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)'
          }}
        />
      );
    }

    // For tile layers with tile brush - show in both place and erase modes
    if (tileBrush && selectedLayerObj.type === 'tile' && 
        (selectedTool === 'place' || selectedTool === 'erase')) {
      // Calculate the snapped cursor position
      const tileSize = customTileSize;
      const snappedX = Math.floor(hoverPosition.x / tileSize) * tileSize;
      const snappedY = Math.floor(hoverPosition.y / tileSize) * tileSize;
      
      // Calculate the preview position based on the brush's offset
      const previewX = snappedX - (tileBrush.offsetX * tileSize);
      const previewY = snappedY - (tileBrush.offsetY * tileSize);
      
      // Get the tileset image
      const tilesetImg = localStorage.getItem(`tileset_${tileBrush.texture}`);
      const dimensions = tilesetDimensions[tileBrush.texture];
      
      // Determine the styling based on the tool
      const borderColor = selectedTool === 'place' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      
      return (
        <div
          className="absolute pointer-events-none"
          style={{
            left: previewX,
            top: previewY,
            width: tileBrush.width * tileSize,
            height: tileBrush.height * tileSize,
            zIndex: 200,
            border: `1px solid ${borderColor}`,
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.3)',
            backgroundColor: selectedTool === 'place' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }}
        >
          {/* Render each tile in the brush with its proper position */}
          {tileBrush.tiles.map((brushTile, index) => {
            const relX = brushTile.x * tileSize;
            const relY = brushTile.y * tileSize;
            
            const absoluteX = previewX + relX;
            const absoluteY = previewY + relY;
            
            if (absoluteX < 0 || absoluteY < 0 || absoluteX >= room.width || absoluteY >= room.height) {
              return null;
            }
            
            if (!tilesetImg || !dimensions) {
              return (
                <div
                  key={`brush-preview-${index}`}
                  style={{
                    position: 'absolute',
                    left: relX,
                    top: relY,
                    width: tileSize,
                    height: tileSize,
                    backgroundColor: selectedTool === 'place' ? '#4f46e5' : '#ef4444',
                    opacity: 0.7,
                    zIndex: 201,
                    border: '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
              );
            }
            
            const cols = Math.floor(dimensions.width / tileSize);
            const row = Math.floor(brushTile.index / cols);
            const col = brushTile.index % cols;
            
            return (
              <div
                key={`brush-preview-${index}`}
                style={{
                  position: 'absolute',
                  left: relX,
                  top: relY,
                  width: tileSize,
                  height: tileSize,
                  backgroundImage: `url(${tilesetImg})`,
                  backgroundPosition: `-${col * tileSize}px -${row * tileSize}px`,
                  backgroundSize: `${dimensions.width}px ${dimensions.height}px`,
                  imageRendering: 'pixelated',
                  opacity: selectedTool === 'erase' ? 0.5 : 0.9,
                  filter: selectedTool === 'erase' ? 'grayscale(80%)' : 'none',
                  zIndex: 201,
                  border: '1px solid rgba(0, 0, 0, 0.2)'
                }}
              />
            );
          })}
        </div>
      );
    }
    
    // For single tile preview (when no brush)
    if (selectedLayerObj.type === 'tile') {
      const layer = selectedLayerObj;
      const tileSize = customTileSize;
      const snappedX = Math.floor(hoverPosition.x / tileSize) * tileSize;
      const snappedY = Math.floor(hoverPosition.y / tileSize) * tileSize;
      const existingTile = layer.tiles.find(t => t.x === snappedX && t.y === snappedY);
      
      // Show eraser preview if there's a tile at this position
      if (selectedTool === 'erase' && existingTile) {
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: snappedX,
              top: snappedY,
              width: tileSize,
              height: tileSize,
              zIndex: 200,
              border: '2px solid rgba(239, 68, 68, 0.8)',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.2)'
            }}
          />
        );
      }
      
      // Show tile placement preview if we have a texture, regardless of existing tile
      if (selectedTool === 'place' && layer.texture) {
        const texture = layer.texture;
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: snappedX,
              top: snappedY,
              width: tileSize,
              height: tileSize,
              zIndex: 200,
              border: '2px solid rgba(59, 130, 246, 0.8)',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.3)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }}
          >
            <div style={{ opacity: 0.9, width: '100%', height: '100%' }}>
              {renderTile(texture, selectedTileIndex, 0, 0, 'preview-tile')}
            </div>
          </div>
        );
      }
    }

    return null;
  };

  // Render the selection area
  const renderSelectionArea = () => {
    if (!selectionArea) return null;
    
    // Calculate number of tiles in the selection to show in the indicator
    const tilesWidth = Math.ceil(selectionArea.width / customTileSize);
    const tilesHeight = Math.ceil(selectionArea.height / customTileSize);
    
    return (
      <>
        <div
          className="absolute pointer-events-none"
          style={{
            left: selectionArea.x,
            top: selectionArea.y,
            width: selectionArea.width,
            height: selectionArea.height,
            border: '2px dashed rgba(255, 215, 0, 1)',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.5)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 215, 0, 0.1) 10px, rgba(255, 215, 0, 0.1) 20px)',
            zIndex: 300
          }}
        />
        
        {/* Selection size indicator */}
        <div
          className="absolute pointer-events-none bg-black bg-opacity-75 text-white px-2 py-1 text-xs rounded"
          style={{
            left: selectionArea.x + selectionArea.width / 2,
            top: selectionArea.y + selectionArea.height + 8,
            transform: 'translateX(-50%)',
            zIndex: 301,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
        >
          {tilesWidth} × {tilesHeight} tiles
        </div>
        
        {/* Selection handles at corners */}
        {['nw', 'ne', 'se', 'sw'].map(corner => {
          let left, top;
          switch(corner) {
            case 'nw': left = selectionArea.x - 4; top = selectionArea.y - 4; break;
            case 'ne': left = selectionArea.x + selectionArea.width - 4; top = selectionArea.y - 4; break;
            case 'se': left = selectionArea.x + selectionArea.width - 4; top = selectionArea.y + selectionArea.height - 4; break;
            case 'sw': left = selectionArea.x - 4; top = selectionArea.y + selectionArea.height - 4; break;
            default: left = 0; top = 0;
          }
          
          return (
            <div
              key={`handle-${corner}`}
              className="absolute w-3 h-3 bg-yellow-400 border border-black rounded-full pointer-events-none"
              style={{
                left,
                top,
                zIndex: 302
              }}
            />
          );
        })}
      </>
    );
  };

  // Modify instance rendering to prevent text selection
  const renderInstances = () => {
    return room.instances.map((instance, index) => {
      const objectDef = objectDefinitions.find(obj => obj.name === instance.obj_name) || 
                      { width: 32, height: 32, color: '#3b82f6', name: instance.obj_name };
      
      // If the object has a sprite, render it
      if (objectDef.sprite) {
        return (
          <div
            key={`instance-${index}`}
            className="absolute"
            style={{
              left: instance.x,
              top: instance.y,
              width: objectDef.width,
              height: objectDef.height,
              backgroundImage: `url(${objectDef.sprite})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              zIndex: 100,
              cursor: selectedTool === 'select' ? 'move' : 'default',
              pointerEvents: selectedTool === 'select' || selectedTool === 'erase' ? 'auto' : 'none'
            }}
          />
        );
      }
      
      // Otherwise, render colored rectangle with object name
      return (
        <div
          key={`instance-${index}`}
          className="absolute flex items-center justify-center"
          style={{
            left: instance.x,
            top: instance.y,
            width: objectDef.width,
            height: objectDef.height,
            backgroundColor: objectDef.color,
            border: '1px solid rgba(0,0,0,0.2)',
            zIndex: 100,
            opacity: 0.8,
            cursor: selectedTool === 'select' ? 'move' : 'default',
            pointerEvents: selectedTool === 'select' || selectedTool === 'erase' ? 'auto' : 'none'
          }}
        >
          <span 
            className="text-xs text-white truncate select-none pointer-events-none" 
            style={{ fontSize: '10px', userSelect: 'none' }}
          >
            {instance.obj_name}
          </span>
        </div>
      );
    });
  };

  // Handler for starting area selection and canceling it
  useEffect(() => {
    const handleStartAreaSelection = () => {
      setIsAreaSelecting(true);
      setSelectionStart(null);
      setSelectionArea(null);
    };
    
    const handleCancelAreaSelection = () => {
      setIsAreaSelecting(false);
      setSelectionStart(null);
      setSelectionArea(null);
      
      // Reset cursor
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    };

    document.addEventListener('start-area-selection', handleStartAreaSelection);
    document.addEventListener('cancel-area-selection', handleCancelAreaSelection);
    
    return () => {
      document.removeEventListener('start-area-selection', handleStartAreaSelection);
      document.removeEventListener('cancel-area-selection', handleCancelAreaSelection);
    };
  }, []);

  // Add deleteSelectedTiles function to handle removing tiles in a selection
  const deleteSelectedTiles = useCallback(() => {
    if (!selectionArea || !selectedLayer) return;
    
    const selectedLayerObj = room.layers.find(layer => layer.name === selectedLayer);
    if (!selectedLayerObj || selectedLayerObj.type !== 'tile') return;
    
    // Get all tiles in the selection
    const tilesInSelection = getTilesInSelection();
    if (tilesInSelection.length === 0) return;
    
    console.log("Deleting tiles in selection:", tilesInSelection.length);
    
    // Store the previous room state for undo
    const previousRoom = JSON.parse(JSON.stringify(room));
    
    // Create a new room state with the tiles removed
    const newRoom = {
      ...room,
      layers: room.layers.map(layer => {
        if (layer.name === selectedLayer) {
          return {
            ...layer,
            tiles: layer.tiles.filter(tile => 
              !tilesInSelection.some(selectedTile => 
                selectedTile.x === tile.x && selectedTile.y === tile.y
              )
            )
          };
        }
        return layer;
      })
    };
    
    // Update the room with history
    setRoom(newRoom);
    addToHistory({
      type: 'BATCH_REMOVE_TILES',
      payload: {
        layerName: selectedLayer,
        tiles: tilesInSelection,
        previousRoom
      },
      description: `Removed ${tilesInSelection.length} tiles`
    });
    
    // Keep the selection active after deletion
  }, [selectionArea, selectedLayer, room, getTilesInSelection, setRoom, addToHistory]);

  // Update keyboard shortcuts to support backspace for deleting selected tiles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle key if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // 'G' key for toggling grid visibility
      if (e.key === 'g' || e.key === 'G') {
        setShowGrid(prev => !prev);
      }
      
      // 'S' key for selection mode
      if (e.key === 's' || e.key === 'S') {
        setSelectedTool('select');
      }
      
      // 'D' key for place mode
      if (e.key === 'd' || e.key === 'D') {
        setSelectedTool('place');
      }
      
      // 'E' key for erase mode
      if (e.key === 'e' || e.key === 'E') {
        setSelectedTool('erase');
      }
      
      // Ctrl+C to copy selection as brush and switch to place mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectionArea) {
        copySelectionToBrush();
        e.preventDefault();
      }
      
      // Backspace or Delete to remove tiles in selection
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectionArea) {
        deleteSelectedTiles();
        e.preventDefault();
      }
      
      // ESC key to cancel selection and/or clear brush
      if (e.key === 'Escape') {
        if (tileBrush) {
          // Clear the active brush first
          setTileBrush(null);
          console.log("Brush cleared with Escape key");
        } else if (selectionArea) {
          // Clear selection if no brush is active
          setSelectionArea(null);
          setSelectionStart(null);
        }
        
        if (contextMenuPosition) setContextMenuPosition(null);
        
        e.preventDefault();
      }
      
      // Handle Ctrl+X for cutting selected tiles
      if (e.ctrlKey && e.key === 'x' && selectionArea && selectedLayer) {
        e.preventDefault();
        const layer = room.layers.find(l => l.name === selectedLayer);
        if (layer && layer.type === 'tile') {
          // Get tiles in selection area - this marks tiles as selected
          const tilesInSelection = getTilesInSelection();
          if (tilesInSelection.length > 0) {
            console.log("Cutting tiles:", tilesInSelection.length);
            
            // Store the previous room state for undo
            const previousRoom = JSON.parse(JSON.stringify(room));
            
            // Calculate the bounds of the selection - use the actual selection area
            // instead of calculating from tiles to be more consistent
            const minX = selectionArea.x;
            const minY = selectionArea.y;
            
            // Normalize the tiles relative to the selection bounds
            const normalizedTiles = tilesInSelection.map(tile => ({
              x: (tile.x - minX) / customTileSize,
              y: (tile.y - minY) / customTileSize,
              index: tile.index
            }));
            
            // Calculate brush dimensions in tiles
            const widthInTiles = Math.ceil(selectionArea.width / customTileSize);
            const heightInTiles = Math.ceil(selectionArea.height / customTileSize);
            
            // Create the brush
            const brush: TileBrush = {
              tiles: normalizedTiles,
              width: widthInTiles,
              height: heightInTiles,
              texture: layer.texture || 'default',
              offsetX: Math.floor(widthInTiles / 2),
              offsetY: Math.floor(heightInTiles / 2)
            };
            
            // Set the brush
            setTileBrush(brush);
            
            // Create a new room state with all selected tiles removed at once
            const newRoom = {
              ...room,
              layers: room.layers.map(l => {
                if (l.name === selectedLayer) {
                  return {
                    ...l,
                    tiles: l.tiles.filter(tile => 
                      !tilesInSelection.some(selectedTile => 
                        selectedTile.x === tile.x && selectedTile.y === tile.y
                      )
                    )
                  };
                }
                return l;
              })
            };
            
            // Update the room with the new state
            setRoom(newRoom);
            
            // Add a single undo action for the batch removal
            addToHistory({
              type: 'BATCH_REMOVE_TILES',
              payload: {
                layerName: selectedLayer,
                tiles: tilesInSelection,
                previousRoom
              },
              description: `Cut ${tilesInSelection.length} tiles`
            });
            
            // Clear selection
            setSelectionArea(null);
            setSelectionStart(null);
            
            // Switch to place mode
            setSelectedTool('place');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    // Selection state
    selectionArea,
    selectedLayer,
    // Room state
    room.layers,
    room.width,
    room.height,
    // Tool state
    selectedTool,
    tileBrush,
    // Callbacks
    setSelectedTool,
    copySelectionToBrush,
    deleteSelectedTiles,
    copyTilesToBrush,
    removeTile,
    getTilesInSelection,
    // UI state
    showGrid,
    contextMenuPosition,
    // Setters
    setShowGrid,
    setPanOffset,
    setScale,
    setTileBrush,
    setSelectionArea,
    setSelectionStart,
    setContextMenuPosition,
    addToHistory
  ]);

  // Handle clicking outside the context menu to close it
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuPosition(null);
    };
    
    if (contextMenuPosition) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuPosition]);

  return (
    <div className="relative flex-1 overflow-hidden bg-gray-800">
      {/* Object Panel */}
      {isObjectLayerSelected && (
        <div className="absolute right-4 top-16 z-50">
          <ObjectPanel />
        </div>
      )}

      {/* Tileset Selector */}
      {selectedLayer && room.layers.find(layer => layer.name === selectedLayer)?.type === 'tile' && (
        <div className="absolute left-4 top-4 z-20">
          <TilesetSelector 
            layerName={selectedLayer}
            tileSize={customTileSize}
            onTileSizeChange={handleTileSizeChange}
            onTileSelect={(index) => setSelectedTileIndex(index)}
          />
        </div>
      )}

      <div
        ref={canvasRef}
        className="absolute"
        style={{
          width: room.width,
          height: room.height,
          transform: `translate(${panOffset.x * scale}px, ${panOffset.y * scale}px) scale(${scale})`,
          transformOrigin: '0 0',
          backgroundColor: '#777777',
          backgroundImage: showGrid ? `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          ` : 'none',
          backgroundSize: `${customTileSize}px ${customTileSize}px`,
          imageRendering: 'pixelated'
        }}
        onMouseMove={handleMouseMoveCanvas}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        {/* Room background grid */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              backgroundSize: `${customTileSize}px ${customTileSize}px`,
              backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
              backgroundPosition: '0 0'
            }}
          />
        )}
        
        {/* Render all visible tile layers */}
        {room.layers
          .filter(layer => layer.visible && layer.type === 'tile')
          .map(layer => {
            const texture = layer.texture;
            return (
              <div 
                key={`layer-${layer.name}`}
                className="absolute inset-0"
                style={{ zIndex: layer.depth }}
              >
                {texture && layer.tiles.map(tile => renderTile(texture, tile.index, tile.x, tile.y, `${layer.name}-${tile.x}-${tile.y}`))}
              </div>
            );
          })}
        
        {/* Render all instances */}
        {renderInstances()}
        
        {/* Preview of tile placement */}
        {renderTilePreview()}
        
        {/* Selection area */}
        {selectionArea && renderSelectionArea()}
      </div>
      
      {/* Tool controls - moved to header or sidebar, removing from bottom */}
      <div className="absolute top-2 right-2 bg-gray-800 rounded p-1 text-xs text-white opacity-80">
        <div className="flex space-x-1">
          <button
            className={`px-2 py-1 ${selectedTool === 'select' ? 'bg-blue-600' : 'bg-gray-700'} rounded`}
            onClick={() => setSelectedTool('select')}
            title="Select Tool (S)"
          >
            Select
          </button>
          <button
            className={`px-2 py-1 ${selectedTool === 'place' ? 'bg-blue-600' : 'bg-gray-700'} rounded`}
            onClick={() => setSelectedTool('place')}
            title="Place Tool (D)"
          >
            Place
          </button>
          <button
            className={`px-2 py-1 ${selectedTool === 'erase' ? 'bg-blue-600' : 'bg-gray-700'} rounded`}
            onClick={() => setSelectedTool('erase')}
            title="Erase Tool (E)"
          >
            Erase
          </button>
          <button
            className={`px-2 py-1 ${selectedTool === 'pan' ? 'bg-blue-600' : 'bg-gray-700'} rounded`}
            onClick={() => setSelectedTool('pan')}
            title="Pan Tool (Middle Mouse)"
          >
            Pan
          </button>
          {tileBrush && (
            <button
              className="px-2 py-1 bg-red-600 rounded"
              onClick={() => setTileBrush(null)}
              title="Clear Current Brush (Esc)"
            >
              Clear Brush
            </button>
          )}
        </div>
      </div>
    </div>
  );
}