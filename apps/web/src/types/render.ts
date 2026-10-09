export interface LiveRenderState {
  prevPos: [number, number, number];
  currPos: [number, number, number];
  velocity: [number, number, number];
  alpha: number; // accumulator / FIXED_DT in [0, 1]
  ghostPos: [number, number, number] | null;
}
