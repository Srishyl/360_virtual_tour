# 360° Virtual Tour

Welcome to the **360° Virtual Tour** repository! 

This is a modern React-based frontend application built with **Three.js** and **React Three Fiber**. It allows users to seamlessly navigate between interconnected 360-degree panoramic rooms using intuitive floor hotspots. It also features a fully integrated, intelligent AI chatbot guide (**Drishti AI**) to answer questions about the environment.

---

## Features

- **Immersive 360° Panoramas**: Beautiful, high-quality equirectangular room images.
- **Preview Hotspots**: Navigation points feature interactive thumbnails of destination rooms with a sleek glassmorphic design and vibrant green borders.
- **Cinematic Transitions**: Features a smooth fade-to-black/blur transition when navigating between rooms.
- **Auto-Rotation**: The camera slowly pans automatically, pausing during user interaction.
- **Modern UI**: A premium user interface with a sleek frosted-glass navigation footer, room indicator, and drop-down sub-menus.
- **Drishti AI**: Conversational AI assistant that dynamically tracks user location to answer specific location-related queries.

---

## Implementation Process

### 1. 3D Environment Rendering
The core of the virtual tour is constructed using **React Three Fiber**. Each 360° `.jpeg` panoramic room is projected onto the inside of a 3D spherical mesh. The user's virtual camera is locked to the center of this sphere, creating a realistic illusion of standing inside the environment natively.

### 2. Scene Navigation & Hotspots
Movement between locations is achieved by embedding interactive 3D markers (Hotspots) at precisely calculated `[x, y, z]` coordinates inside the sphere. When a user clicks a hotspot, the application triggers a cinematic HTML/CSS fade transition, unmounts the current room's texture, and dynamically mounts the destination room's sphere seamlessly.

### 3. Drishti AI Integration
**Drishti AI** serves as the user's intelligent tour guide. The frontend application actively tracks the user's current room and feeds that location context directly into the prompt. These requests are sent securely to the **Team 2 backend API endpoint**, which processes the scene-specific information and returns accurate conversational replies about the user's specific surroundings.

---

## Project Directory Structure

Here is a simplified view of the project's source directory, highlighting the React application and the specific panoramic `.jpeg` images used for this tour:

```text
360_virtual_tour/
 ├── README.md
 ├── package.json
 ├── index.html
 ├── public/                  <-- Core panoramic image assets
 │    ├── Bedroom .jpeg       
 │    ├── Bedroom1.jpeg       
 │    ├── Kitchen.jpeg        
 │    ├── Livingroom.jpeg     
 │    └── vite.svg
 └── src/
      ├── App.jsx             <-- Main React application, Router & Drishti AI Chatbot
      ├── App.css
      ├── index.css           <-- Styles overlay & frosted glass aesthetics
      └── main.jsx            <-- Application entry point
```

---

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) installed on your machine.

### Running the Tour Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Srishyl/360_virtual_tour.git
   cd 360_virtual_tour
   ```

2. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```

3. **Run the Vite development server:**
   ```bash
   npm run dev
   ```

4. **View the application:**
   Open your browser and navigate to `http://localhost:5173`.

---

## Technical Stack

- **Framework**: [React.js](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **3D Rendering**: [Three.js](https://threejs.org/)
- **React Abstraction for Three.js**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- **Styling**: Vanilla CSS (Heavy focus on Glassmorphism, CSS Variables, and CSS Animations)
- **AI Backend**: API endpoint integrated from Team 2 (Drishti AI)
