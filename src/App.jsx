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
      // 1. Fetch from local Drishti Incident Intel backend
      let drishtiResponseText = "";
      try {
        const localRes = await fetch("http://localhost:5000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text })
        });
        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData.success && localData.results) {
            drishtiResponseText = `Database Query Results (${localData.result_count} records found): ` + JSON.stringify(localData.results).substring(0, 1500);
          }
        }
      } catch (err) {
        console.warn("Could not fetch from local Drishti backend:", err);
      }

      // 2. Build OpenAI-compatible message list with system prompt + history
      let systemContent = `You are Drishti AI, an intelligent assistant for a 360° virtual tour. The user is currently in the ${currentRoom}. Answer questions helpfully and concisely.`;
      if (drishtiResponseText) {
        systemContent += `\n\nIncident & Camera Data retrieved from backend related to the user's query:\n[ ${drishtiResponseText} ]\nIf the user asks about incidents, safety, or cameras, incorporate this data into your friendly answer avoiding raw JSON format.`;
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