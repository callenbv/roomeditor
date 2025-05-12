import { useState, useEffect, useRef } from 'react';
import { useRoom } from '../contexts/RoomContext';

interface TilesetSelectorProps {
  layerName: string;
  tileSize: number;
  onTileSelect: (tileIndex: number) => void;
  onTileSizeChange?: (newSize: number) => void;
}

export default function TilesetSelector({ 
  layerName, 
  tileSize = 16, 
  onTileSelect,
  onTileSizeChange 
}: TilesetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [tilesetImage, setTilesetImage] = useState<string | null>(null);
  const [tilesetDimensions, setTilesetDimensions] = useState({ width: 0, height: 0 });
  const [customTileSize, setCustomTileSize] = useState(tileSize);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { room, updateLayerTexture } = useRoom();
  
  // Find the texture for the current layer
  const layerTexture = room.layers.find(layer => layer.name === layerName)?.texture || '';
  
  // Load tileset image from localStorage if available
  useEffect(() => {
    if (layerTexture) {
      const storedTileset = localStorage.getItem(`tileset_${layerTexture}`);
      if (storedTileset) {
        setTilesetImage(storedTileset);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setTilesetDimensions({
            width: img.width,
            height: img.height
          });
        };
        img.src = storedTileset;
      }
    }
  }, [layerTexture]);
  
  // Handle file upload for tileset
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgSrc = event.target?.result as string;
      setTilesetImage(imgSrc);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setTilesetDimensions({
          width: img.width,
          height: img.height
        });
      };
      img.src = imgSrc;
      
      // Save to localStorage and update layer texture
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      localStorage.setItem(`tileset_${fileName}`, imgSrc);
      updateLayerTexture(layerName, fileName);
    };
    reader.readAsDataURL(file);
  };
  
  // Calculate number of tiles in the tileset
  const calculateTileGrid = () => {
    if (!tilesetDimensions.width || !tilesetDimensions.height) return { cols: 0, rows: 0 };
    
    const cols = Math.floor(tilesetDimensions.width / customTileSize);
    const rows = Math.floor(tilesetDimensions.height / customTileSize);
    
    return { cols, rows };
  };
  
  // Handle tile selection
  const handleTileClick = (tileIndex: number) => {
    setSelectedTile(tileIndex);
    onTileSelect(tileIndex);
    setIsOpen(false);
  };
  
  const { cols, rows } = calculateTileGrid();
  
  // Update custom tile size with a callback to Canvas
  const updateTileSize = (newSize: number) => {
    setCustomTileSize(newSize);
    if (onTileSizeChange) {
      onTileSizeChange(newSize);
    }
  };
  
  return (
    <div className="relative">
      {/* Permanent Tileset Preview - Always visible in the top right */}
      <div className="fixed top-20 right-4 z-20">
        <div className="bg-white border border-gray-300 rounded-md shadow-lg p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium sidebar-text">Tileset</span>
            <div className="flex items-center">
              <label className="text-xs mr-1 sidebar-text">Size:</label>
              <input
                type="number"
                className="w-12 p-1 text-xs border border-gray-300 rounded"
                value={customTileSize}
                onChange={(e) => updateTileSize(Math.max(8, Math.min(64, parseInt(e.target.value))))}
                min="8"
                max="64"
              />
              <button 
                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </button>
            </div>
          </div>
          
          {tilesetImage ? (
            <div>
              <div className="relative overflow-auto max-h-48 max-w-64 border border-gray-200 rounded mb-2">
                <div 
                  className="relative"
                  style={{
                    backgroundImage: `url(${tilesetImage})`,
                    width: Math.min(tilesetDimensions.width, 256),
                    height: Math.min(tilesetDimensions.height, 256),
                    imageRendering: 'pixelated',
                    backgroundSize: tilesetDimensions.width > 256 ? 'contain' : 'auto',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {/* Grid overlay */}
                  {Array.from({ length: Math.min(rows, 32) * Math.min(cols, 32) }).map((_, index) => {
                    const row = Math.floor(index / Math.min(cols, 32));
                    const col = index % Math.min(cols, 32);
                    
                    // Only show a limited number of tiles in preview
                    if (row >= 32 || col >= 32) return null;
                    
                    return (
                      <div
                        key={index}
                        className={`absolute border border-gray-400 border-opacity-50 hover:border-blue-500 cursor-pointer ${selectedTile === index ? 'border-2 border-blue-600' : ''}`}
                        style={{
                          left: col * customTileSize,
                          top: row * customTileSize,
                          width: customTileSize,
                          height: customTileSize,
                        }}
                        onClick={() => handleTileClick(index)}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {tilesetDimensions.width}×{tilesetDimensions.height} • {cols}×{rows} tiles
              </div>
              {selectedTile !== null && (
                <div className="flex items-center mt-2">
                  <div 
                    className="w-8 h-8 mr-2 border border-gray-400" 
                    style={{
                      backgroundImage: `url(${tilesetImage})`,
                      backgroundPosition: `-${(selectedTile % cols) * customTileSize}px -${Math.floor(selectedTile / cols) * customTileSize}px`,
                      backgroundSize: `${tilesetDimensions.width}px ${tilesetDimensions.height}px`,
                      imageRendering: 'pixelated'
                    }}
                  />
                  <span className="sidebar-text text-sm">Selected: #{selectedTile}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded text-center">
              <p className="sidebar-text text-sm">No tileset uploaded</p>
              <p className="sidebar-text text-xs mt-1">Upload a tileset to begin painting tiles</p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTile !== null && tilesetImage ? (
          <div className="flex items-center">
            <div 
              className="w-8 h-8 mr-2 border border-gray-400" 
              style={{
                backgroundImage: `url(${tilesetImage})`,
                backgroundPosition: `-${(selectedTile % cols) * customTileSize}px -${Math.floor(selectedTile / cols) * customTileSize}px`,
                backgroundSize: `${tilesetDimensions.width}px ${tilesetDimensions.height}px`,
                imageRendering: 'pixelated'
              }}
            />
            <span className="sidebar-text">Tile #{selectedTile}</span>
          </div>
        ) : (
          <div className="sidebar-text">Select Tile</div>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white shadow-lg rounded p-4 w-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium sidebar-text">Choose a Tile</h3>
          </div>
          
          {tilesetImage ? (
            <div className="overflow-auto max-h-96 border border-gray-300 rounded">
              <div 
                className="relative"
                style={{
                  backgroundImage: `url(${tilesetImage})`,
                  width: tilesetDimensions.width,
                  height: tilesetDimensions.height,
                  imageRendering: 'pixelated',
                }}
              >
                {Array.from({ length: rows * cols }).map((_, index) => {
                  const row = Math.floor(index / cols);
                  const col = index % cols;
                  
                  return (
                    <div
                      key={index}
                      className={`absolute border hover:border-blue-500 cursor-pointer ${selectedTile === index ? 'border-2 border-blue-600' : 'border-gray-400 border-opacity-50'}`}
                      style={{
                        left: col * customTileSize,
                        top: row * customTileSize,
                        width: customTileSize,
                        height: customTileSize,
                      }}
                      onClick={() => handleTileClick(index)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded">
              <p className="mb-3 sidebar-text">No tileset image uploaded</p>
              <p className="text-sm sidebar-text">Upload a tileset image to begin painting tiles.</p>
            </div>
          )}
          
          <div className="flex justify-between mt-4">
            <div className="text-xs text-gray-500">
              {tilesetImage && `${tilesetDimensions.width}×${tilesetDimensions.height} px • ${cols}×${rows} tiles`}
            </div>
            <button
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 