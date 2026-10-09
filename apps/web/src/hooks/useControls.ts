import { useEffect, useRef, useState, useCallback } from 'react';
import { InputFrame } from '@ghostroll/shared';

export interface ControlsState {
  getInput: () => InputFrame;
  setVirtualTilt: (x: number, z: number) => void;
  rawTilt: { x: number; z: number };
}

export function useControls(): ControlsState {
  const keysDown = useRef<{ [key: string]: boolean }>({});
  const currentTilt = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const virtualTilt = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const [debugTilt, setDebugTilt] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling with arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysDown.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const setVirtualTilt = useCallback((x: number, z: number) => {
    virtualTilt.current = {
      x: Math.max(-127, Math.min(127, Math.round(x))),
      z: Math.max(-127, Math.min(127, Math.round(z))),
    };
  }, []);

  // Update loop for smoothing input ramp-up and decay
  const getInput = useCallback((): InputFrame => {
    let targetX = 0;
    let targetZ = 0;

    const keys = keysDown.current;
    // Left / Right (Arrow keys or A / D or Q / D)
    if (keys['ArrowLeft'] || keys['KeyA'] || keys['KeyQ']) targetX -= 127;
    if (keys['ArrowRight'] || keys['KeyD']) targetX += 127;

    // Forward / Backward (Arrow keys or W / S or Z / S)
    // Up tilts forward (+Z on track slope)
    if (keys['ArrowUp'] || keys['KeyW'] || keys['KeyZ']) targetZ += 127;
    // Down tilts backward (-Z)
    if (keys['ArrowDown'] || keys['KeyS']) targetZ -= 127;

    // Blend virtual joystick if active
    if (virtualTilt.current.x !== 0 || virtualTilt.current.z !== 0) {
      targetX = virtualTilt.current.x;
      targetZ = virtualTilt.current.z;
    }

    // Responsive ramp-up/decay (approx 5 frames to reach full tilt)
    const rampSpeed = 28;
    const current = currentTilt.current;

    if (current.x < targetX) {
      current.x = Math.min(targetX, current.x + rampSpeed);
    } else if (current.x > targetX) {
      current.x = Math.max(targetX, current.x - rampSpeed);
    }

    if (current.z < targetZ) {
      current.z = Math.min(targetZ, current.z + rampSpeed);
    } else if (current.z > targetZ) {
      current.z = Math.max(targetZ, current.z - rampSpeed);
    }

    const roundedX = Math.round(current.x);
    const roundedZ = Math.round(current.z);

    return {
      tiltX: Math.max(-127, Math.min(127, roundedX)),
      tiltZ: Math.max(-127, Math.min(127, roundedZ)),
    };
  }, []);

  // Periodic debug display sync
  useEffect(() => {
    const interval = setInterval(() => {
      setDebugTilt({
        x: Math.round(currentTilt.current.x),
        z: Math.round(currentTilt.current.z),
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return {
    getInput,
    setVirtualTilt,
    rawTilt: debugTilt,
  };
}
