/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Atom, Info, Search, Box, RefreshCw, Layout, Maximize2, Minimize2, Image as ImageIcon, Grid3X3, Layers, Sparkles, ChevronRight, ChevronDown, Play, Pause } from 'lucide-react';
import { elements, ElementData } from './data/elements';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 3D Components ---

const Tooltip = ({ text }: { text: string }) => (
  <Html distanceFactor={10}>
    <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/20 text-[10px] whitespace-nowrap pointer-events-none text-white font-bold">
      {text}
    </div>
  </Html>
);

const Electron = ({ radius, speed, offset, color, isPaused }: { radius: number; speed: number; offset: number; color: string; isPaused: boolean }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (ref.current && !isPaused) {
      const t = state.clock.getElapsedTime() * speed + offset;
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = Math.sin(t * 0.5) * (radius * 0.2);
    }
  });

  return (
    <group 
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      <pointLight intensity={0.5} distance={1} color={color} />
      {hovered && <Tooltip text="אלקטרון" />}
    </group>
  );
};

const Orbit = ({ radius, rotation }: { radius: number; rotation: [number, number, number] }) => {
  return (
    <mesh rotation={rotation}>
      <ringGeometry args={[radius - 0.01, radius + 0.01, 64]} />
      <meshBasicMaterial color="#444" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Nucleus = ({ protons, neutrons }: { protons: number; neutrons: number }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const particles = useMemo(() => {
    const pts = [];
    const total = protons + neutrons;
    for (let i = 0; i < total; i++) {
      const phi = Math.acos(-1 + (2 * i) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      const r = 0.3;
      pts.push({
        pos: [
          r * Math.cos(theta) * Math.sin(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(phi)
        ] as [number, number, number],
        isProton: i < protons
      });
    }
    return pts;
  }, [protons, neutrons]);

  return (
    <group>
      {particles.map((p, i) => (
        <mesh 
          key={i} 
          position={p.pos}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredIndex(i); }}
          onPointerOut={() => setHoveredIndex(null)}
        >
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial 
            color={p.isProton ? "#ff4444" : "#4444ff"} 
            roughness={0.3}
            metalness={0.8}
          />
          {hoveredIndex === i && <Tooltip text={p.isProton ? "פרוטון" : "ניוטרון"} />}
        </mesh>
      ))}
      <pointLight intensity={2} distance={5} color="white" />
    </group>
  );
};

const AtomModel = ({ element, isPaused }: { element: ElementData; isPaused: boolean }) => {
  const protons = element.number;
  const neutrons = Math.round(parseFloat(element.atomicMass)) - protons;
  
  return (
    <group>
      <Nucleus protons={protons} neutrons={neutrons} />
      {element.shells.map((count, shellIndex) => {
        const radius = (shellIndex + 1) * 1.2;
        const rotation: [number, number, number] = [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ];
        
        return (
          <group key={shellIndex}>
            <Orbit radius={radius} rotation={rotation} />
            {Array.from({ length: count }).map((_, eIndex) => (
              <Electron 
                key={eIndex} 
                radius={radius} 
                speed={1 / (shellIndex + 1) * 2} 
                offset={(eIndex / count) * Math.PI * 2}
                color="#ffff00"
                isPaused={isPaused}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
};

// --- UI Components ---

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "אל-מתכת": "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
    "גז אציל": "bg-purple-500/20 border-purple-500/50 text-purple-400",
    "מתכת אלקלית": "bg-red-500/20 border-red-500/50 text-red-400",
    "מתכת אלקלית עפרורית": "bg-orange-500/20 border-orange-500/50 text-orange-400",
    "מתחמת": "bg-blue-500/20 border-blue-500/50 text-blue-400",
    "הלוגן": "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
    "מתכת מעבר": "bg-pink-500/20 border-pink-500/50 text-pink-400",
    "מתכת מעבר פוסט": "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
  };
  return colors[category] || "bg-zinc-500/20 border-zinc-500/50 text-zinc-400";
};

const Backgrounds = {
  space: (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <color attach="background" args={["#050505"]} />
    </>
  ),
  dark: <color attach="background" args={["#0a0a0a"]} />,
  gradient: (
    <>
      <color attach="background" args={["#0a192f"]} />
      <fog attach="fog" args={["#0a192f", 5, 20]} />
    </>
  ),
  minimal: <color attach="background" args={["#111"]} />
};

export default function App() {
  const [selectedElement, setSelectedElement] = useState<ElementData>(elements[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [showInfo, setShowInfo] = useState(true);
  const [showList, setShowList] = useState(true);
  const [background, setBackground] = useState<keyof typeof Backgrounds>('space');
  const [isPaused, setIsPaused] = useState(false);

  const filteredElements = useMemo(() => {
    return elements.filter(e => 
      e.hebrewName.includes(searchTerm) || 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.number.toString().includes(searchTerm)
    );
  }, [searchTerm]);

  const toggleFullInteractive = () => {
    setShowInfo(false);
    setShowList(false);
  };

  const resetLayout = () => {
    setShowInfo(true);
    setShowList(true);
  };

  return (
    <div className={cn(
      "flex h-screen w-full text-zinc-100 font-sans overflow-hidden transition-colors duration-1000",
      background === 'space' ? "bg-[#050505]" : background === 'dark' ? "bg-[#0a0a0a]" : background === 'gradient' ? "bg-[#0a192f]" : "bg-[#111]"
    )} dir="rtl">
      
      {/* Sidebar - Element Info */}
      <AnimatePresence>
        {showInfo && (
          <motion.aside 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-96 border-l border-white/10 bg-zinc-950/80 backdrop-blur-xl flex flex-col z-20 relative shadow-2xl"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Atom className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight">הטבלה המחזורית</h1>
                </div>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="חפש יסוד..."
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedElement.number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-4xl font-bold text-white mb-1 drop-shadow-md">{selectedElement.hebrewName}</h2>
                      <p className="text-zinc-500 font-mono uppercase tracking-wider">{selectedElement.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-5xl font-black text-white/10 absolute left-6 top-32 pointer-events-none">
                        {selectedElement.number}
                      </span>
                      <div className="text-2xl font-bold text-emerald-400">{selectedElement.symbol}</div>
                    </div>
                  </div>

                  <div className={cn("inline-block px-3 py-1 rounded-full text-xs font-semibold border", getCategoryColor(selectedElement.category))}>
                    {selectedElement.category}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">מסה אטומית</div>
                      <div className="text-lg font-mono">{selectedElement.atomicMass}</div>
                    </div>
                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">מצב צבירה</div>
                      <div className="text-lg">{selectedElement.phase === 'Solid' ? 'מוצק' : selectedElement.phase === 'Gas' ? 'גז' : selectedElement.phase === 'Liquid' ? 'נוזל' : 'לא ידוע'}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-300">
                      <Info className="w-4 h-4" />
                      מידע כללי
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                      {selectedElement.hebrewSummary}
                    </p>
                  </div>

                  {/* Particle Legend */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-semibold text-zinc-300">מקרא חלקיקים</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded-full bg-[#ff4444] shadow-[0_0_8px_#ff4444]" />
                        <span className="text-zinc-400"><strong className="text-zinc-200">פרוטונים:</strong> חלקיקים חיוביים בגרעין.</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded-full bg-[#4444ff] shadow-[0_0_8px_#4444ff]" />
                        <span className="text-zinc-400"><strong className="text-zinc-200">ניוטרונים:</strong> חלקיקים ניטרליים בגרעין.</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded-full bg-[#ffff00] shadow-[0_0_8px_#ffff00]" />
                        <span className="text-zinc-400"><strong className="text-zinc-200">אלקטרונים:</strong> חלקיקים שליליים הנעים מסביב.</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-300">מבנה אלקטרוני</h3>
                    <div className="flex gap-2">
                      {selectedElement.shells.map((s, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-mono text-emerald-400">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Floating Toggle for Sidebar */}
      {!showInfo && (
        <button 
          onClick={() => setShowInfo(true)}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-lg backdrop-blur-md"
        >
          <Info className="w-6 h-6" />
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Controls Bar */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <div className="flex bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1">
              <button 
                onClick={() => setViewMode('3d')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2", viewMode === '3d' ? "bg-emerald-500 text-white" : "text-zinc-400 hover:text-white")}
              >
                <Box className="w-3.5 h-3.5" />
                3D
              </button>
              <button 
                onClick={() => setViewMode('2d')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2", viewMode === '2d' ? "bg-emerald-500 text-white" : "text-zinc-400 hover:text-white")}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                2D
              </button>
            </div>

            <div className="flex bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1">
              <button 
                onClick={() => setBackground('space')}
                className={cn("p-1.5 rounded-lg transition-all", background === 'space' ? "bg-white/10 text-white" : "text-zinc-500")}
                title="חלל"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setBackground('dark')}
                className={cn("p-1.5 rounded-lg transition-all", background === 'dark' ? "bg-white/10 text-white" : "text-zinc-500")}
                title="כהה"
              >
                <div className="w-4 h-4 bg-zinc-900 rounded-sm border border-white/10" />
              </button>
              <button 
                onClick={() => setBackground('gradient')}
                className={cn("p-1.5 rounded-lg transition-all", background === 'gradient' ? "bg-white/10 text-white" : "text-zinc-500")}
                title="מדורג"
              >
                <div className="w-4 h-4 bg-[#0a192f] rounded-sm border border-white/10" />
              </button>
            </div>

            <div className="flex bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2", isPaused ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400")}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? "המשך" : "עצור"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={toggleFullInteractive}
              className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all shadow-lg"
              title="מסך מלא אינטראקטיבי"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button 
              onClick={resetLayout}
              className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all shadow-lg"
              title="אפס פריסה"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive View Area */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {viewMode === '3d' ? (
              <motion.div 
                key="3d"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="w-full h-full"
              >
                <Canvas shadows>
                  <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
                  <OrbitControls enableDamping dampingFactor={0.05} />
                  <ambientLight intensity={0.5} />
                  <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                  <Suspense fallback={null}>
                    {Backgrounds[background]}
                    <Float speed={isPaused ? 0 : 2} rotationIntensity={0.5} floatIntensity={0.5}>
                      <AtomModel element={selectedElement} isPaused={isPaused} />
                    </Float>
                  </Suspense>
                </Canvas>
              </motion.div>
            ) : (
              <motion.div 
                key="2d"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="w-full h-full flex items-center justify-center p-12 overflow-auto"
              >
                <div className="grid grid-cols-18 gap-2 p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
                  {elements.map((element) => (
                    <button
                      key={element.number}
                      onClick={() => setSelectedElement(element)}
                      style={{ 
                        gridColumn: element.x, 
                        gridRow: element.y 
                      }}
                      className={cn(
                        "w-14 h-16 rounded-lg border flex flex-col items-center justify-center transition-all relative group",
                        selectedElement.number === element.number 
                          ? "bg-emerald-500/20 border-emerald-500 scale-110 z-10 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                          : "bg-zinc-900/60 border-white/5 hover:border-white/20 hover:scale-105"
                      )}
                    >
                      <span className="absolute top-1 right-1 text-[7px] font-mono text-zinc-500">{element.number}</span>
                      <span className="text-sm font-bold">{element.symbol}</span>
                      <span className="text-[7px] text-zinc-400 truncate w-full px-1 text-center">{element.hebrewName}</span>
                      <div className={cn(
                        "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg",
                        getCategoryColor(element.category).split(' ')[1].replace('border-', 'bg-')
                      )} />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom List/Grid */}
        <AnimatePresence>
          {showList && (
            <motion.div 
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="h-48 border-t border-white/10 bg-zinc-950/90 backdrop-blur-2xl p-4 overflow-x-auto z-10 relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
            >
              <div className="flex gap-3 min-w-max h-full items-center">
                {filteredElements.map((element) => (
                  <motion.button
                    key={element.number}
                    whileHover={{ y: -5, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedElement(element)}
                    className={cn(
                      "w-16 h-20 rounded-xl border flex flex-col items-center justify-center transition-all relative group",
                      selectedElement.number === element.number 
                        ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                        : "bg-zinc-900/50 border-white/5 hover:border-white/20"
                    )}
                  >
                    <span className="absolute top-1 right-1.5 text-[7px] font-mono text-zinc-500">{element.number}</span>
                    <span className="text-lg font-bold">{element.symbol}</span>
                    <span className="text-[8px] text-zinc-400 truncate w-full px-1 text-center">{element.hebrewName}</span>
                    <div className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 rounded-b-xl",
                      getCategoryColor(element.category).split(' ')[1].replace('border-', 'bg-')
                    )} />
                  </motion.button>
                ))}
              </div>
              <button 
                onClick={() => setShowList(false)}
                className="absolute left-4 top-4 p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toggle for List */}
        {!showList && (
          <button 
            onClick={() => setShowList(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-6 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-bold"
          >
            <Layers className="w-4 h-4" />
            הצג רשימה
          </button>
        )}
      </main>
    </div>
  );
}
