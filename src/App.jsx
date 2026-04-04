import React, { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Preload, useTexture } from "@react-three/drei";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────
   ROOM DATA
   ───────────────────────────────────────────────────────────────── */
const rooms = {
  livingroom: {
    name: "Living Room",
    image: "/Livingroom.jpeg",
    hotspots: [
      { position: [4, -2, 8], target: "kitchen", label: "Kitchen", type: "preview", preview: "/Kitchen.jpeg" },
      { position: [-12, -1, -4], target: "bedroom", label: "Bedroom", type: "preview", preview: "/Bedroom .jpeg" },
      { position: [3, -1, -10], target: "bedroom1", label: "Guest Room", type: "preview", preview: "/Bedroom1.jpeg" }
    ]
  },
  kitchen: {
    name: "Kitchen",
    image: "/Kitchen.jpeg",
    hotspots: [
      { position: [7, -1, -2], target: "livingroom", label: "Living Room", type: "preview", preview: "/Livingroom.jpeg" }
    ]
  },
  bedroom: {
    name: "Bedroom",
    image: "/Bedroom .jpeg",
    hotspots: [
      { position: [-12, -1, 8], target: "livingroom", label: "Living Room", type: "preview", preview: "/Livingroom.jpeg" }
    ]
  },
  bedroom1: {
    name: "Guest Room",
    image: "/Bedroom1.jpeg",
    hotspots: [
      { position: [6, -2, 10], target: "livingroom", label: "Living Room", type: "preview", preview: "/Livingroom.jpeg" }
    ]
  }
};

/* ─────────────────────────────────────────────────────────────────
   PANORAMA SPHERE
   ───────────────────────────────────────────────────────────────── */
function Panorama({ image, opacity = 1 }) {
  const texture = useTexture(image);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} transparent opacity={opacity} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HOTSPOT
   ───────────────────────────────────────────────────────────────── */
function Hotspot({ position, label, onClick, type, preview }) {
  const [hovered, setHovered] = useState(false);

  // Position relative logic: Floor is typically around y=-6 or -8 in equirectangular projection
  const baseX = position[0];
  const baseZ = position[2];

  // Calculate distance from center to push the arrow "forward"
  const distance = Math.sqrt(baseX * baseX + baseZ * baseZ);
  const forwardPush = 3; // Push it forward 3 units in 3D space

  const targetX = baseX + (baseX / distance) * forwardPush;
  const targetZ = baseZ + (baseZ / distance) * forwardPush;

  // Calculate angle. Since camera starts looking towards -Z, we want arrow to point towards target vector (X, Z).
  // The SVG arrow is drawn pointing UP (along -Y in 2D HTML space).
  // When rotated [-PI/2, 0, 0] laying flat, HTML -Y becomes World -Z.
  // We want the arrow to Point TOWARD the target coordinate!
  // Math.atan2(targetX, targetZ) gives angle relative to +Z.
  // Adding PI makes it face exactly towards the target coordinates from center.
  const angle = Math.atan2(targetX, targetZ) + Math.PI;

  return (
    <group>
      {/* Billboard Tooltip floating above ground layer - Does not transform with floor */}
      <Html position={[targetX, position[1] + 1.5, targetZ]} center distanceFactor={10}>
        <div className={`hotspot-tooltip ${hovered ? 'hovered-tooltip' : ''}`}>
          {type === "preview" && preview && (
            <div className="tooltip-preview">
              <img src={preview} alt={label} />
            </div>
          )}
          <div className="tooltip-label">{label}</div>
        </div>
      </Html>

      {/* Actual chevron arrow geometrically projected onto the floor plain */}
      {/* y=-6 pushes it visually beneath the camera rig down onto the floor texture */}
      <Html
        transform
        position={[targetX, -7, targetZ]}
        rotation={[-Math.PI / 2, 0, angle]}
      >
        <div
          className="floor-chevron"
          onClick={onClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          title={`Go to ${label}`}
        >
          <svg viewBox="0 0 100 100" width="100" height="100">
            {/* Solid thick black arrow */}
            <polygon points="50,25 80,55 60,55 60,95 40,95 40,55 20,55" fill="rgba(0,0,0,0.95)" stroke="black" strokeWidth="1" />
          </svg>
        </div>
      </Html>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SCENE
   ───────────────────────────────────────────────────────────────── */
function Scene({ currentRoom, setRoom, onTransitionStart, isRotating }) {
  const roomData = rooms[currentRoom];

  const handleRoomChange = (target) => {
    onTransitionStart();
    setTimeout(() => setRoom(target), 800);
  };

  return (
    <>
      <Panorama image={roomData.image} />

      {roomData.hotspots.map((spot, i) => (
        <Hotspot
          key={`${currentRoom}-${i}`}
          position={spot.position}
          label={spot.label}
          type={spot.type}
          preview={spot.preview}
          onClick={() => handleRoomChange(spot.target)}
        />
      ))}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.5}
        autoRotate={isRotating}
        autoRotateSpeed={0.5}
      />

      <ambientLight intensity={0.5} />
      <Preload all />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CHATBOT COMPONENT — DialoGPT via HuggingFace Inference API
   ───────────────────────────────────────────────────────────────── */
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL = "meta-llama/Llama-3.2-1B-Instruct";
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

const INCIDENT_LOGS = [
  { id: 1, timestamp: "2026-01-03 12:45", camera: "2", location: "Building A - Hallway", type: "fight", score: 0.89, desc: "A student beating up another student" },
  { id: 2, timestamp: "2026-01-03 12:53", camera: "2", location: "Building A - Hallway", type: "fall", score: 0.92, desc: "Student has dropped" },
  { id: 3, timestamp: "2026-01-03 08:15", camera: "1", location: "Main Entrance", type: "entry", score: 0.65, desc: "Unauthorized person attempting entry" },
  { id: 4, timestamp: "2026-01-03 13:20", camera: "3", location: "Cafeteria", type: "crowd", score: 0.78, desc: "Large gathering detected during lunch" },
  { id: 5, timestamp: "2026-01-03 10:30", camera: "4", location: "Parking Lot", type: "violation", score: 0.82, desc: "Vehicle parked in restricted zone" },
  { id: 6, timestamp: "2026-01-03 14:05", camera: "7", location: "Gymnasium", type: "fall", score: 0.88, desc: "Person fell during physical activity" },
  { id: 7, timestamp: "2026-01-03 09:00", camera: "6", location: "Library", type: "violation", score: 0.71, desc: "Suspicious behavior in restricted area" },
  { id: 8, timestamp: "2026-01-03 15:30", camera: "2", location: "Building A - Hallway", type: "fight", score: 0.91, desc: "Physical altercation between two individuals" },
  { id: 9, timestamp: "2026-01-03 11:45", camera: "3", location: "Cafeteria", type: "crowd", score: 0.69, desc: "Overcrowding at lunch counter" },
  { id: 10, timestamp: "2026-01-03 16:20", camera: "1", location: "Main Entrance", type: "entry", score: 0.55, desc: "Late entry after hours" },
  { id: 16, timestamp: "2026-01-09 10:43", camera: "1", location: "campus_main_gate", type: "entry", score: 0, desc: "Vehicle entered campus via main gate" },
  { id: 28, timestamp: "2026-02-13 21:51", camera: "2", location: "Building A - Hallway", type: "fall", score: 0.79, desc: "Verified Fall: Student ID 2" },
  { id: 30, timestamp: "2026-02-14 05:30", camera: "2", location: "Building A - Hallway", type: "fall", score: 0.79, desc: "Verified Fall: Student ID 2" },
  { id: 31, timestamp: "2026-02-20 13:57", camera: "2", location: "Building A - Hallway", type: "fight", score: 0.9, desc: "Physical altercation detected between students" },
  { id: 156, timestamp: "2026-02-21 03:53", camera: "1", location: "campus_main_gate", type: "entry", score: null, desc: "Vehicle entry detected" },
  { id: 163, timestamp: "2026-02-21 04:08", camera: "1", location: "campus_main_gate", type: "entry", score: null, desc: "Vehicle entered campus via main gate" },
  { id: 164, timestamp: "2026-02-21 04:09", camera: "1", location: "Main_Campus", type: "fight", score: 0.84, desc: "fight between individuals" },
  { id: 165, timestamp: "2026-02-21 04:09", camera: "1", location: "Main_Campus", type: "crowd", score: 0.8, desc: "Crowd detected: 13 people" },
  { id: 166, timestamp: "2026-02-21 04:09", camera: "1", location: "Main_Campus", type: "fall", score: 0.68, desc: "Fall detected" },
  { id: 167, timestamp: "2026-02-21 04:24", camera: "1", location: "campus_main_gate", type: "entry", score: null, desc: "Vehicle entered campus via main gate" },
  { id: 168, timestamp: "2026-02-21 04:25", camera: "1", location: "Main_Campus", type: "fight", score: 0.84, desc: "fight between individuals" },
  { id: 169, timestamp: "2026-02-21 04:25", camera: "1", location: "Main_Campus", type: "crowd", score: 0.8, desc: "Crowd detected: 13 people" }
];


function Chatbot({ currentRoom, isOpen, onClose, externalQuery, clearExternalQuery }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I am Drishti AI, your 360° tour assistant. Let's go for a quick walk & I'll show you around. 🌐", isStatus: false }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // history holds OpenAI-format messages for multi-turn context
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Reset conversation context when room changes
  useEffect(() => {
    setHistory([]);
    setMessages([
      { role: "bot", text: `You're now in the ${currentRoom.replace(/([A-Z])/g, ' $1').trim()}. Ask me anything about this room! 🏠` }
    ]);
  }, [currentRoom]);

  // ── Robust HuggingFace fetch with cold-start retry ──────────────
  const callHuggingFace = useCallback(async (chatMessages, attempt = 1) => {
    const res = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: chatMessages,
        max_tokens: 200
      })
    });

    // Model loading (cold start) — router may return 503
    if (res.status === 503) {
      const errBody = await res.json().catch(() => ({}));
      const wait = Math.min((errBody.estimated_time || 20) * 1000, 25000);
      if (attempt <= 3) {
        console.log(`Model loading, retrying in ${wait / 1000}s (attempt ${attempt})...`);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const statusMsg = { role: "bot", text: `⏳ AI model is waking up... (${attempt}/3) Please hold on for ~${Math.round(wait / 1000)}s`, isStatus: true };
          if (last?.isStatus) return [...prev.slice(0, -1), statusMsg];
          return [...prev, statusMsg];
        });
        await new Promise(r => setTimeout(r, wait));
        return callHuggingFace(chatMessages, attempt + 1);
      }
      throw new Error("Model is still loading after retries. Please try again in a minute.");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || errBody.error || `API error ${res.status}`);
    }

    return res.json();
  }, []);

  const sendMessage = useCallback(async (customText) => {
    const text = (typeof customText === 'string' ? customText : input).trim();
    if (!text || loading) return;

    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      // 1. Check for hardcoded image data queries
      const incidentKeywords = ["incident", "event", "security", "log", "anomaly", "happened", "fight", "fall", "entry", "crowd", "violation", "activity", "alert"];
      const isIncidentQuery = incidentKeywords.some(kw => text.toLowerCase().includes(kw));

      let drishtiResponseText = "";
      
      // If it's an incident-related query, format the hardcoded logs
      if (isIncidentQuery) {
        // Find logs for current room or if it's a general query
        const roomName = currentRoom.toLowerCase().replace(/\s/g, '');
        const relevantLogs = INCIDENT_LOGS.filter(log => {
          const logLoc = log.location.toLowerCase();
          // Match if user mentions location or if log location matches current room
          return text.toLowerCase().includes(logLoc) || logLoc.includes(roomName) || text.toLowerCase().includes("all") || text.toLowerCase().includes("any");
        });

        if (relevantLogs.length > 0) {
          drishtiResponseText = relevantLogs.map(log => `EVENT: ${log.type.toUpperCase()}\nTIME: ${log.timestamp}\nLOCATION: ${log.location}\nDETAILS: ${log.desc}`).join('\n\n---\n\n');
        } else if (text.toLowerCase().includes("recent") || text.toLowerCase().includes("show me")) {
           drishtiResponseText = INCIDENT_LOGS.slice(-5).map(log => `EVENT: ${log.type.toUpperCase()}\nTIME: ${log.timestamp}\nLOCATION: ${log.location}\nDETAILS: ${log.desc}`).join('\n\n---\n\n');
        }
      }

      // Also try local backend if available (complementary)
      try {
        const localRes = await fetch("http://localhost:5000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text })
        });
        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData.success && localData.results) {
            const localText = `\n\nADDITIONAL SYSTEM DATA:\n` + JSON.stringify(localData.results).substring(0, 500);
            drishtiResponseText += localText;
          }
        }
      } catch (err) {
        // Silently fail for local backend
      }

      // 2. Build OpenAI-compatible message list with system prompt + history
      let systemContent = `You are Drishti AI, an intelligent assistant for a 360° virtual tour. The user is currently in the ${currentRoom}. Answer questions helpfully and concisely.`;
      
      if (drishtiResponseText) {
        systemContent += `\n\nCRITICAL CONTEXT (Hardcoded Incident Data):\n${drishtiResponseText}\n\nIf the user asked about incidents or security, use the EXACT format above for each event (EVENT, TIME, LOCATION, DETAILS). Do not add any preamble like "I found..." or "Here are...". Start directly with the data. If multiple incidents are found, separate them with "---". Do not use any bolding or markdown formatting.`;
      }

      const systemPrompt = {
        role: "system",
        content: systemContent
      };
      const newHistory = [...history, { role: "user", content: text }];
      const chatMessages = [systemPrompt, ...newHistory];

      const data = await callHuggingFace(chatMessages);
      console.log("HF response:", data);

      setMessages(prev => prev.filter(m => !m.isStatus));

      // OpenAI-compatible: choices[0].message.content
      const botReply =
        data?.choices?.[0]?.message?.content?.trim() ||
        "I'm here to help — could you rephrase that?";

      setHistory([...newHistory, { role: "assistant", content: botReply }]);
      setMessages(prev => [...prev, { role: "bot", text: botReply }]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(prev => [
        ...prev.filter(m => !m.isStatus),
        {
          role: "bot",
          text: `⚠️ ${err.message || "Couldn't reach the AI. Please try again!"}`,
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, history, currentRoom, callHuggingFace]);

  useEffect(() => {
    if (externalQuery && isOpen && !loading) {
      sendMessage(externalQuery);
      if (clearExternalQuery) clearExternalQuery();
    }
  }, [externalQuery, isOpen, loading, sendMessage, clearExternalQuery]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setHistory([]);
    setMessages([{ role: "bot", text: "Chat cleared! Ask me anything about the tour. 🌐" }]);
  };

  return (
    <div className={`chatbot-panel ${isOpen ? "chatbot-panel-open" : ""}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-info">
          <span className="chatbot-title">Drishti AI</span>
        </div>
        <button className="chatbot-close-btn" onClick={onClose} title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chatbot-messages" id="chatbot-messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`chatbot-message ${msg.role === "user" ? "chatbot-message-user" : "chatbot-message-bot"} ${msg.isError ? "chatbot-message-error" : ""}`}>
            <div className="chatbot-bubble">{msg.text}</div>
          </div>
        ))}
        {/* Typing Indicator */}
        {loading && (
          <div className="chatbot-message chatbot-message-bot">
            <div className="chatbot-bubble chatbot-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!loading && (
        <div className="chatbot-chips">
          <div className="chatbot-chip-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="chip" onClick={() => sendMessage(`Where am I right now?`)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Location
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="chatbot-input-area">
        <input
          ref={inputRef}
          type="text"
          className="chatbot-input"
          placeholder="Ask Drishti AI about this place..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        {loading ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="spin">
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </svg>
        ) : (
          <button className="chatbot-mic-btn" onClick={sendMessage} title="Send message" disabled={!input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   UI OVERLAY
   ───────────────────────────────────────────────────────────────── */
const UIOverlay = ({ currentRoom, setRoom, fade, onTransitionStart, isRotating, setIsRotating }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [externalQuery, setExternalQuery] = useState("");
  const [exploreStuck, setExploreStuck] = useState(false);

  const handleLocationClick = () => {
    setChatOpen(true);
    setExternalQuery(`Can you tell me the details, features, and information about the ${rooms[currentRoom].name}?`);
  };

  const handleNavClick = (id) => {
    setExploreStuck(false);
    if (id === currentRoom) return;
    onTransitionStart();
    setTimeout(() => setRoom(id), 800);
  };

  return (
    <>
      <div className={`fade-overlay ${fade ? "active" : ""}`} />
      <div className="ui-overlay">
        <header className="ui-header">
          {/* Top Left Label replacing App Title */}
          <div className="room-indicator">
            <span className="room-name">{rooms[currentRoom].name}</span>
          </div>

          <div className="header-controls">
            {/* Header controls are now empty, but could be used in future */}
          </div>
        </header>

        {/* Bottom Right Controls Container */}
        <div className="bottom-right-controls">
          <button
            className="play-pause-btn"
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? "Pause Rotation" : "Play Rotation"}
          >
            {isRotating ? (
              // Pause Icon
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            ) : (
              // Play Icon
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>

          <button
            id="chatbot-fab"
            className={`chatbot-fab-pill ${chatOpen ? "chatbot-fab-active" : ""}`}
            onClick={() => setChatOpen(o => !o)}
          >
            <span className="chatbot-fab-label">Ask Drishti AI</span>
            {!chatOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="pill-chat-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Chatbot Panel ── */}
      <Chatbot
        currentRoom={currentRoom}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        externalQuery={externalQuery}
        clearExternalQuery={() => setExternalQuery("")}
      />
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   ROOT APP
   ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [room, setRoom] = useState("livingroom");
  const [fade, setFade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleTransition = () => {
    setFade(true);
    setTimeout(() => setFade(false), 1000);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loader" />
        <div className="loading-text">Preparing Experience</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        <Suspense fallback={null}>
          <Scene
            currentRoom={room}
            setRoom={setRoom}
            onTransitionStart={handleTransition}
            isRotating={isRotating}
          />
        </Suspense>
      </Canvas>

      <UIOverlay
        currentRoom={room}
        setRoom={setRoom}
        fade={fade}
        onTransitionStart={handleTransition}
        isRotating={isRotating}
        setIsRotating={setIsRotating}
      />
    </div>
  );
}