# Room Editor

A powerful room editor for creating and editing game rooms with tile maps and object layers.

## Features

- Create and edit tile-based game rooms
- Add object instances with properties
- Multiple tile layers with different depths
- Import tilesets for map creation
- **NEW:** Toggle layer visibility
- **NEW:** Set layer types (tile or object)
- **NEW:** Edit room name easily
- Export rooms as JSON for use in your game engine
- Pan and zoom for easy navigation
- Layer management
- Save and load rooms from local storage

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd roomeditor
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

### Room Management

- **New Room**: Create a new room with custom dimensions
- **Save Room**: Save the current room to local storage
- **Open Room**: Open a previously saved room
- **Export**: Export the room as JSON to use in your game
- **Edit Room Name**: Click on the room name in the header to edit it

### Tools

- **Select**: Select and move objects in the room
- **Place**: Place tiles or objects in the room
- **Erase**: Remove tiles or objects from the room
- **Pan**: Pan around the room (also use mouse wheel to zoom)

### Layers

- Create and manage multiple layers
- Set layer type (tile or object)
- Toggle layer visibility with the eye icon
- Select a layer to work on it
- Upload a tileset image for tile layers
- Arrange layers by depth

### Tile Painting

1. Create a new tile layer or select an existing one
2. Upload a tileset image for the layer (click "Upload" on the selected layer)
3. Click "Select Tile" at the bottom left to open the tileset selector
4. Choose a tile from your tileset
5. Use the "Place" tool to paint tiles on the canvas

### Objects

- Place predefined objects in your room
- Objects can be positioned precisely with grid snapping
- Each object has a name that will be exported with its position

## JSON Format

The exported JSON follows this format:

```json
{
  "instances": [
    {
      "instance_layer_name": "Layer Name",
      "obj_name": "oObject",
      "x": 0.0,
      "y": 0.0
    }
  ],
  "layers": [
    {
      "tiles": [
        {
          "x": 32,
          "y": 64,
          "index": 5
        }
      ],
      "texture": "TilesetName",
      "depth": 300.0,
      "name": "LayerName",
      "type": "tile",
      "visible": true
    }
  ],
  "width": 800.0,
  "height": 600.0,
  "name": "room_name",
  "index": "@ref room(room_name)"
}
```

## License

This project is licensed under the MIT License
