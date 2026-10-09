import { InputFrame, ReplayPayload } from './types.js';

export interface RleChunk {
  count: number;
  tiltX: number;
  tiltZ: number;
}

export function encodeRleInputs(inputs: InputFrame[]): RleChunk[] {
  if (inputs.length === 0) return [];
  const chunks: RleChunk[] = [];
  let current = { count: 1, tiltX: inputs[0].tiltX, tiltZ: inputs[0].tiltZ };

  for (let i = 1; i < inputs.length; i++) {
    const frame = inputs[i];
    if (frame.tiltX === current.tiltX && frame.tiltZ === current.tiltZ && current.count < 65535) {
      current.count++;
    } else {
      chunks.push(current);
      current = { count: 1, tiltX: frame.tiltX, tiltZ: frame.tiltZ };
    }
  }
  chunks.push(current);
  return chunks;
}

export function decodeRleInputs(chunks: RleChunk[]): InputFrame[] {
  const inputs: InputFrame[] = [];
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.count; i++) {
      inputs.push({ tiltX: chunk.tiltX, tiltZ: chunk.tiltZ });
    }
  }
  return inputs;
}
