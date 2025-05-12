import { useState, useEffect, useRef } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { TileBrush } from '../types/room';

export default function BrushLibrary() {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newBrushName, setNewBrushName] = useState('');
  const [importData, setImportData] = useState('');
  const exportLinkRef = useRef<HTMLAnchorElement>(null);
  
  const { 
    tileBrush, 
    savedBrushes, 
    saveBrushToLibrary, 
    loadBrushFromLibrary, 
    deleteBrushFromLibrary,
    exportBrushLibrary,
    importBrushLibrary
  } = useRoom();
  
  // Debug logging
  useEffect(() => {
    console.log("Current savedBrushes:", savedBrushes);
  }, [savedBrushes]);

  const handleSaveBrush = () => {
    if (!newBrushName.trim() || !tileBrush) return;
    
    console.log("Saving brush:", newBrushName.trim());
    saveBrushToLibrary(newBrushName.trim());
    setNewBrushName('');
    setShowSaveDialog(false);
  };
  
  const handleExportLibrary = () => {
    try {
      const jsonData = exportBrushLibrary();
      
      // Create a Blob with the JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Create a download link
      if (exportLinkRef.current) {
        exportLinkRef.current.href = URL.createObjectURL(blob);
        exportLinkRef.current.download = `brush-library-${new Date().toISOString().split('T')[0]}.json`;
        exportLinkRef.current.click();
      }
    } catch (error) {
      console.error("Failed to export brush library:", error);
      alert("Failed to export brush library");
    }
  };
  
  const handleImportLibrary = () => {
    if (!importData.trim()) {
      alert("Please paste valid JSON data");
      return;
    }
    
    const success = importBrushLibrary(importData);
    if (success) {
      alert("Brush library imported successfully!");
      setImportData('');
      setShowImportDialog(false);
    } else {
      alert("Failed to import brush library. Please check your JSON data.");
    }
  };

  // Function to render a brush preview
  const renderBrushPreview = (brush: TileBrush) => {
    console.log("Rendering brush preview:", brush);
    
    // Get a reasonable display size for the preview
    const canvasWidth = Math.min(64, brush.width * 16);
    const canvasHeight = Math.min(64, brush.height * 16);
    const scale = Math.min(
      canvasWidth / (brush.width * 16),
      canvasHeight / (brush.height * 16)
    );
    
    return (
      <div 
        className="relative bg-gray-800 overflow-hidden"
        style={{ 
          width: canvasWidth,
          height: canvasHeight
        }}
      >
        {brush.tiles.map((tile, index) => (
          <div 
            key={index}
            className="absolute bg-blue-500"
            style={{
              width: 16 * scale,
              height: 16 * scale,
              left: (tile.x - brush.offsetX) * 16 * scale,
              top: (tile.y - brush.offsetY) * 16 * scale,
              backgroundColor: '#4f46e5',
              opacity: 0.8
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mt-4 bg-gray-800 rounded-md p-3">
      {/* Header with button controls */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white text-sm font-medium">Brush Library ({savedBrushes.length})</h3>
        <div className="flex space-x-1">
          <button
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-600 disabled:opacity-50"
            onClick={() => setShowSaveDialog(true)}
            disabled={!tileBrush}
            title={!tileBrush ? "Create a selection and make a brush first" : "Save the current brush to library"}
          >
            Save
          </button>
          
          <button
            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            onClick={handleExportLibrary}
            disabled={savedBrushes.length === 0}
            title="Export brush library to JSON file"
          >
            Export
          </button>
          
          <button
            className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
            onClick={() => setShowImportDialog(true)}
            title="Import brush library from JSON file"
          >
            Import
          </button>
        </div>
      </div>
      
      {/* Hidden download link for export */}
      <a ref={exportLinkRef} style={{ display: 'none' }} />
      
      {/* Brush grid */}
      {savedBrushes.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
          {savedBrushes.map((brush) => (
            <div 
              key={brush.id}
              className="bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-600 transition-colors flex flex-col"
              onClick={() => loadBrushFromLibrary(brush.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs truncate" title={brush.name}>
                  {brush.name}
                </span>
                <button
                  className="text-gray-400 hover:text-red-400 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBrushFromLibrary(brush.id);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="flex-1 flex items-center justify-center py-1">
                {renderBrushPreview(brush)}
              </div>
              
              <div className="text-gray-400 text-xs mt-1">
                {brush.width}×{brush.height} • {brush.tiles.length} tiles
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-xs italic text-center py-2">
          No saved brushes yet. Select an area, right-click to make a brush, then save it here.
        </div>
      )}

      {/* Save Brush Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white rounded-lg p-4 w-80 shadow-lg">
            <h3 className="text-lg font-medium mb-3">Save Brush</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Brush Name:</label>
              <input
                type="text"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                value={newBrushName}
                onChange={(e) => setNewBrushName(e.target.value)}
                placeholder="Enter brush name"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50"
                onClick={handleSaveBrush}
                disabled={!newBrushName.trim() || !tileBrush}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white rounded-lg p-4 w-96 shadow-lg">
            <h3 className="text-lg font-medium mb-3">Import Brush Library</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Paste JSON Data:</label>
              <textarea
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white h-40 font-mono text-xs"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste exported JSON brush data here..."
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => setShowImportDialog(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 rounded disabled:opacity-50"
                onClick={handleImportLibrary}
                disabled={!importData.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 