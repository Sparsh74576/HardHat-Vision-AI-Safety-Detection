/**
 * Backend client for the HardHat Vision Python YOLOv5 server.
 *
 * Until the Python backend is running, these functions will reject with an
 * ApiError whose `isConnectionError` is true. The UI surfaces that as a clear
 * "backend not connected" state instead of fabricating detections.
 *
 * Expected backend contract (implement on the Python side):
 *
 *   GET  /health
 *     -> { status: "ok", modelLoaded: bool, modelPath: str, device: str }
 *
 *   POST /detect/image
 *      multipart/form-data: file=<binary>, confidence=<float 0.1-0.9>
 *     -> { annotatedImage: <data URL or URL>, detections: Detection[], latencyMs: int }
 *
 *   POST /detect/video
 *      multipart/form-data: file=<binary>, confidence=<float 0.1-0.9>
 *     -> { annotatedVideo: <URL>, detections, helmetCount, latencyMs, fps, framesProcessed }
 *
 * See README.md for the reference Flask implementation.
 */
import { BACKEND_URL, ENDPOINTS } from '@/config';
import type {
  ApiError,
  BackendHealth,
  BackendStatus,
  ImageResult,
  VideoResult,
} from '@/types';

function toApiError(err: unknown, fallback: string): ApiError {
  if (err instanceof Error) {
    const isConnectionError =
      err.name === 'TypeError' ||
      /fetch|network|failed to fetch/i.test(err.message);
    return { message: err.message, isConnectionError };
  }
  return { message: fallback };
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  fallback: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, init);
  } catch (err) {
    throw toApiError(err, 'Could not reach the inference server.');
  }

  if (res.status === 404) {
    throw toApiError(new Error('Endpoint not found. Backend version mismatch.'), fallback);
  }

  if (res.status === 413) {
    throw toApiError(new Error('File too large for the backend limit.'), fallback);
  }

  if (!res.ok) {
    let detail = `Backend returned ${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: string; error?: string };
      if (body?.detail) detail = body.detail;
      else if (body?.error) detail = body.error;
    } catch {
      /* keep default detail */
    }
    throw toApiError(new Error(detail), fallback);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw toApiError(err, 'Backend returned an invalid response.');
  }
}

export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const health = await requestJson<BackendHealth>(
      ENDPOINTS.health,
      { method: 'GET' },
      'Health check failed.'
    );
    return health.modelLoaded ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
}

export function detectImage(
  file: File,
  confidence: number
): Promise<ImageResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('confidence', String(confidence));
  return requestJson<ImageResult>(
    ENDPOINTS.detectImage,
    { method: 'POST', body: form },
    'Image detection failed.'
  );
}

export function detectVideo(
  file: File,
  confidence: number,
  onProgress?: (percent: number) => void
): Promise<VideoResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('confidence', String(confidence));

  // We use XMLHttpRequest to get upload progress. The backend must support
  // CORS (Access-Control-Allow-Origin) for this to work cross-origin.
  return new Promise<VideoResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}${ENDPOINTS.detectVideo}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as VideoResult);
        } catch {
          reject(toApiError(new Error('Backend returned invalid JSON.'), 'Video detection failed.'));
        }
      } else {
        let detail = `Backend returned ${xhr.status} ${xhr.statusText}`;
        try {
          const body = JSON.parse(xhr.responseText) as { detail?: string; error?: string };
          if (body?.detail) detail = body.detail;
          else if (body?.error) detail = body.error;
        } catch {
          /* keep default */
        }
        reject(toApiError(new Error(detail), 'Video detection failed.'));
      }
    };

    xhr.onerror = () =>
      reject(toApiError(new Error('Network error reaching the inference server.'), 'Video detection failed.'));
    xhr.ontimeout = () =>
      reject(toApiError(new Error('The inference server timed out.'), 'Video detection failed.'));

    xhr.send(form);
  });
}
