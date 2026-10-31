/**
 * Shared types for HardHat Vision detection flows.
 *
 * These describe the contract the Python YOLOv5 backend must satisfy.
 * The frontend is wired to call the backend client (see backend/client.ts)
 * and will surface real results only when the backend is connected.
 */

export type MediaMode = 'image' | 'video';

export type BackendStatus = 'connected' | 'disconnected' | 'checking';

/** A single detection produced by the YOLOv5 model. */
export interface Detection {
  /** Class id from the YOLOv5 model (0 = helmet for this single-class model). */
  classId: number;
  /** Human-readable class name, mapped from the model's names file. */
  className: string;
  /** Confidence score in [0, 1]. */
  confidence: number;
  /** Bounding box in source pixel coordinates: [x1, y1, x2, y2]. */
  bbox: [number, number, number, number];
}

export interface ImageResult {
  /** Annotated image as a data URL or object URL produced by the backend. */
  annotatedImage: string;
  detections: Detection[];
  /** Inference latency in milliseconds. */
  latencyMs: number;
}

export interface VideoResult {
  /** Annotated video as an object URL produced by the backend. */
  annotatedVideo: string;
  detections: Detection[];
  /** Aggregated helmet count across processed frames. */
  helmetCount: number;
  /** Inference latency per frame in milliseconds (averaged). */
  latencyMs: number;
  /** Effective processing frame rate (frames processed per second). */
  fps: number;
  /** Total frames processed. */
  framesProcessed: number;
}

export interface BackendHealth {
  status: 'ok';
  modelLoaded: boolean;
  modelPath: string;
  device: string;
}

export interface ApiError {
  message: string;
  /** True when the backend is unreachable (network / CORS / not running). */
  isConnectionError?: boolean;
}
