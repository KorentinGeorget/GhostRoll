import React, { useState, useRef, useEffect } from 'react';

interface VirtualJoystickProps {
  onTiltChange: (x: number, z: number) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onTiltChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

  const radius = 55;

  const handlePointerDown = (e: React.PointerEvent) => {
    setActive(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active && e.buttons === 0) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;

    if (dist > radius) {
      clampedX = (dx / dist) * radius;
      clampedY = (dy / dist) * radius;
    }

    setStickPos({ x: clampedX, y: clampedY });

    // Quantize tilt to [-127, 127]
    const tiltX = Math.round((clampedX / radius) * 127);
    // Downwards pointer movement (dy > 0) tilts backward (-Z); upwards (dy < 0) tilts forward (+Z)
    const tiltZ = Math.round((-clampedY / radius) * 127);

    onTiltChange(tiltX, tiltZ);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setActive(false);
    setStickPos({ x: 0, y: 0 });
    onTiltChange(0, 0);
  };

  return (
    <div className="absolute bottom-6 left-6 pointer-events-auto md:hidden z-20">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-32 h-32 rounded-full glass-panel-elevated flex items-center justify-center relative touch-none select-none border border-white/20 shadow-2xl active:scale-95 transition-transform"
      >
        {/* Center rest ring */}
        <div className="w-12 h-12 rounded-full border border-white/20 bg-white/5" />

        {/* Floating thumb stick */}
        <div
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 via-sky-400 to-cyan-300 shadow-xl shadow-sky-500/30 absolute pointer-events-none transition-transform duration-75 flex items-center justify-center border border-white/40"
        >
          <div className="w-4 h-4 rounded-full bg-white/80 shadow-sm" />
        </div>
      </div>
      <div className="text-center text-[10px] text-slate-300/80 mt-1.5 font-bold tracking-wider uppercase">Joystick</div>
    </div>
  );
};
