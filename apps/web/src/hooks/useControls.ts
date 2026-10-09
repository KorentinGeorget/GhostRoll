import { useEffect, useRef, useState, useCallback } from 'react';
import { InputFrame } from '@ghostroll/shared';

export interface ControlsState {
  getInput: () => InputFrame;
  setVirtualTilt: (x: number, z: number) => void;
  triggerJump: () => void;
  resetTilt: () => void;
  rawTilt: { x: number; z: number };
  gyroSupported: boolean;
  gyroActive: boolean;
  isCalibrated: boolean;
  enableGyro: () => Promise<boolean>;
  disableGyro: () => void;
  calibrateGyro: () => void;
}

export function useControls(): ControlsState {
  const keysDown = useRef<{ [key: string]: boolean }>({});
  const jumpRequested = useRef(false);
  const currentTilt = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const virtualTilt = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const gyroTilt = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // Gyroscope tracking
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const gyroActiveRef = useRef(false);

  const betaOffset = useRef<number>(45); // Natural reclined reading angle
  const gammaOffset = useRef<number>(0);
  const latestBeta = useRef<number>(45);
  const latestGamma = useRef<number>(0);

  const [debugTilt, setDebugTilt] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  // Detect DeviceOrientation support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setGyroSupported(true);
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysDown.current[e.code] = true;
      keysDown.current[e.key] = true;
      keysDown.current[e.key.toLowerCase()] = true;
      if (e.code === 'Space' || e.key === ' ') {
        jumpRequested.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
      keysDown.current[e.key] = false;
      keysDown.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // DeviceOrientation handler
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (!gyroActiveRef.current) return;
    if (e.beta === null || e.gamma === null) return;

    latestBeta.current = e.beta;
    latestGamma.current = e.gamma;

    const relBeta = e.beta - betaOffset.current;
    const relGamma = e.gamma - gammaOffset.current;

    const deadzone = 1.5;
    const maxAngle = 25.0;

    let filteredGamma = Math.abs(relGamma) > deadzone ? relGamma : 0;
    let filteredBeta = Math.abs(relBeta) > deadzone ? relBeta : 0;

    filteredGamma = Math.max(-maxAngle, Math.min(maxAngle, filteredGamma));
    filteredBeta = Math.max(-maxAngle, Math.min(maxAngle, filteredBeta));

    // Gamma: phone tilted right -> roll right on screen (-X in world physics)
    // Beta: phone tilted forward -> roll down track (+Z in world physics)
    const gx = Math.round((-filteredGamma / maxAngle) * 127);
    const gz = Math.round((-filteredBeta / maxAngle) * 127);

    gyroTilt.current = {
      x: Math.max(-127, Math.min(127, gx)),
      z: Math.max(-127, Math.min(127, gz)),
    };
  }, []);

  // Calibrate Gyro baseline
  const calibrateGyro = useCallback(() => {
    betaOffset.current = latestBeta.current;
    gammaOffset.current = latestGamma.current;
    setIsCalibrated(true);
    gyroTilt.current = { x: 0, z: 0 };
  }, []);

  // Enable Gyro (requests iOS permission if needed)
  const enableGyro = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return false;
    }

    try {
      const DOE = window.DeviceOrientationEvent as any;
      if (typeof DOE.requestPermission === 'function') {
        const permission = await DOE.requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      }

      window.addEventListener('deviceorientation', handleOrientation);
      gyroActiveRef.current = true;
      setGyroActive(true);
      // Auto-calibrate baseline on activation
      calibrateGyro();
      return true;
    } catch (err) {
      console.warn('Failed to enable device orientation:', err);
      return false;
    }
  }, [handleOrientation, calibrateGyro]);

  // Disable Gyro
  const disableGyro = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', handleOrientation);
    }
    gyroActiveRef.current = false;
    setGyroActive(false);
    gyroTilt.current = { x: 0, z: 0 };
  }, [handleOrientation]);

  // Virtual Joystick input
  const setVirtualTilt = useCallback((x: number, z: number) => {
    virtualTilt.current = {
      x: Math.max(-127, Math.min(127, Math.round(x))),
      z: Math.max(-127, Math.min(127, Math.round(z))),
    };
  }, []);

  // 60Hz input sampler
  const getInput = useCallback((): InputFrame => {
    let targetX = 0;
    let targetZ = 0;

    if (gyroActiveRef.current) {
      targetX = gyroTilt.current.x;
      targetZ = gyroTilt.current.z;
    } else {
      const keys = keysDown.current;
      // Camera looks down +Z from (-6, 11, -11).
      // Screen LEFT corresponds to +X in world space.
      // Screen RIGHT corresponds to -X in world space.
      const isLeft = !!(keys['ArrowLeft'] || keys['KeyA'] || keys['KeyQ'] || keys['q'] || keys['a']);
      const isRight = !!(keys['ArrowRight'] || keys['KeyD'] || keys['d']);
      const isUp = !!(keys['ArrowUp'] || keys['KeyW'] || keys['KeyZ'] || keys['z'] || keys['w']);
      const isDown = !!(keys['ArrowDown'] || keys['KeyS'] || keys['s']);

      if (isLeft) targetX += 127;
      if (isRight) targetX -= 127;

      // Forward / Backward
      if (isUp) targetZ += 127;
      if (isDown) targetZ -= 127;

      // Blend virtual joystick if active
      if (virtualTilt.current.x !== 0 || virtualTilt.current.z !== 0) {
        targetX = virtualTilt.current.x;
        targetZ = virtualTilt.current.z;
      }
    }

    // Responsive ramp-up/decay (approx 5 frames to reach full tilt)
    const rampSpeed = gyroActiveRef.current ? 40 : 28;
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

    const jump = jumpRequested.current;
    jumpRequested.current = false;

    return {
      tiltX: Math.max(-127, Math.min(127, roundedX)),
      tiltZ: Math.max(-127, Math.min(127, roundedZ)),
      ...(jump ? { jump: true } : {}),
    };
  }, []);

  const triggerJump = useCallback(() => {
    jumpRequested.current = true;
  }, []);

  const resetTilt = useCallback(() => {
    currentTilt.current = { x: 0, z: 0 };
    virtualTilt.current = { x: 0, z: 0 };
    gyroTilt.current = { x: 0, z: 0 };
    jumpRequested.current = false;
    keysDown.current = {};
    setDebugTilt({ x: 0, z: 0 });
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [handleOrientation]);

  return {
    getInput,
    setVirtualTilt,
    triggerJump,
    resetTilt,
    rawTilt: debugTilt,
    gyroSupported,
    gyroActive,
    isCalibrated,
    enableGyro,
    disableGyro,
    calibrateGyro,
  };
}
