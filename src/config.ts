/**
 * Runtime configuration for the HardHat Vision backend.
 *
 * The Python YOLOv5 backend URL is read from VITE_BACKEND_URL at build time,
 * defaulting to http://localhost:8000 (the local Flask/FastAPI dev server).
 * Override it with a .env file:
 *
 *   VITE_BACKEND_URL=https://your-inference-server.example.com
 */
export const BACKEND_URL: string =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:8000';

/** Endpoint paths on the backend. Keep in sync with the Python server. */
export const ENDPOINTS = {
  health: '/health',
  detectImage: '/detect/image',
  detectVideo: '/detect/video',
} as const;

/** YOLOv5 class-name mapping. This model has a single class: helmet (id 0). */
export const DEFAULT_CLASS_NAMES: Record<number, string> = {
  0: 'helmet',
};

/** Map an unknown class id to a readable name. */
export function classNameFor(classId: number, names?: Record<number, string>): string {
  return names?.[classId] ?? DEFAULT_CLASS_NAMES[classId] ?? `class-${classId}`;
}

/** Human-readable label with confidence, used in the results panel. */
export function detectionLabel(
  classId: number,
  confidence: number,
  names?: Record<number, string>
): string {
  return `${classNameFor(classId, names)} ${(confidence * 100).toFixed(1)}%`;
}
