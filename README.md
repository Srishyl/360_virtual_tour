# 360° Virtual Tour

A modern, interactive 360-degree virtual tour application built with React, Three.js, and React Three Fiber. Allows users to seamlessly navigate between interconnected panoramic rooms using intuitive, image-preview hotspots.

## Features

- **Immersive 360° Panoramas**: Navigate through high-quality equirectangular images.
- **Preview Hotspots**: Navigation points feature interactive thumbnails of the destination room with a sleek glassmorphic design and vibrant borders.
- **Cinematic Transitions**: Features a smooth fade-to-black/blur transition when moving between rooms.
- **Auto-Rotation**: The camera slowly pans automatically, pausing during user interaction.
- **Modern UI**: A premium user interface with a navigation footer, room indicator, and a loading screen.

## Technology Stack

- **Framework**: [React.js](https://reactjs.org/) (via Vite)
- **3D Rendering**: [Three.js](https://threejs.org/)
- **React Abstraction for Three.js**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- **Helper Library**: [@react-three/drei](https://github.com/pmndrs/drei)
- **Styling**: Vanilla CSS with modern features (Glassmorphism, CSS Variables, Animations)

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Srishyl/Virtual-Tour.git
   cd Virtual-Tour
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **View the application:**
   Open your browser and navigate to `http://localhost:5173` (or the port provided in your terminal).

## How to Customize and Implement

### Adding/Changing Rooms

The rooms and their connections are managed in the `rooms` object inside `src/App.jsx`. To add a new room or change an existing one:

1. **Add the panoramic image**: Place your equirectangular `.jpeg` or `.jpg` image in the `public` folder (e.g., `public/MyNewRoom.jpeg`).
2. **Update the `rooms` configuration**:
   ```javascript
   const rooms = {
     // ... existing rooms
     myNewRoomId: {
       name: "My Awesome Room",
       image: "/MyNewRoom.jpeg", // Path to the image in the public folder
       hotspots: [
         // Define where users can go from this room
         { 
           position: [x, y, z], // 3D coordinates for the hotspot
           target: "existingRoomId", // The ID of the room this hotspot leads to
           label: "Go Back", // Text displayed on the hotspot
           type: "preview", // Always use "preview" for the image thumbnail style
           preview: "/ExistingRoomImage.jpeg" // The thumbnail image to show
         }
       ]
     }
   }
   ```

### Positioning Hotspots

Finding the right `[x, y, z]` coordinates for your hotspots requires some trial and error:
- **`x`**: Moves left (negative) and right (positive).
- **`y`**: Moves down (negative) and up (positive). `0` is eye level.
- **`z`**: Moves forward (negative) and backward (positive).

Adjust these numbers until the hotspot aligns visually with the doorway or path in your panoramic image.

### Changing Styles

The application's theme is controlled by CSS variables in `src/index.css`. 
- **Colors**: Update `--primary` for the main accent color (currently Electric Blue) and `--text-primary`/`--text-secondary` for text colors.
- **Transitions**: Modify `.fade-overlay` to adjust the room transition effects.
- **Hotspots**: Tweak `.hotspot-preview` and `.preview-box` to change the appearance of the navigation markers.

## Building for Production

To create an optimized production build:

```bash
npm run build
```

This will generate a `dist` folder containing the minified assets ready to be deployed to any static hosting service.
