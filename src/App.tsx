import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { ConfidenceSlider } from '@/components/ConfidenceSlider';
import { MediaUploader } from '@/components/MediaUploader';
import { StatsPanel } from '@/components/StatsPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { ModeTabs } from '@/components/ModeTabs';
import { checkBackendHealth, detectImage, detectVideo } from '@/backend/client';
import type {
  ApiError,
  BackendStatus,
  Detection,
  ImageResult,
  MediaMode,
  VideoResult,
} from '@/types';

type ResultState =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'error'; message: string }
  | { kind: 'image'; result: ImageResult }
  | { kind: 'video'; result: VideoResult };

function App() {
  const [mode, setMode] = useState<MediaMode>('image');
  const [confidence, setConfidence] = useState(0.25);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const [imageState, setImageState] = useState<ResultState>({ kind: 'idle' });
  const [videoState, setVideoState] = useState<ResultState>({ kind: 'idle' });
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  const revokedRef = useRef<string | null>(null);

  useEffect(() => {
    const url = imageFile ? URL.createObjectURL(imageFile) : null;
    setImagePreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  useEffect(() => {
    const url = videoFile ? URL.createObjectURL(videoFile) : null;
    setVideoPreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  // Revoke any prior annotated blob URL when replaced.
  const trackAnnotated = useCallback((url: string) => {
    if (revokedRef.current && revokedRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(revokedRef.current);
    }
    revokedRef.current = url;
  }, []);

  useEffect(() => () => {
    if (revokedRef.current && revokedRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(revokedRef.current);
    }
  }, []);

  // Check backend health on mount and when the window regains focus.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setBackendStatus('checking');
      const status = await checkBackendHealth();
      if (!cancelled) setBackendStatus(status);
    };
    run();
    const onFocus = () => run();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const backendConnected = backendStatus === 'connected';

  const errMsg = (e: unknown): string => {
    const err = e as ApiError;
    return err?.message ?? 'Unexpected error during detection.';
  };

  const onAnalyzeImage = useCallback(async () => {
    if (!imageFile) return;
    setImageState({ kind: 'processing' });
    try {
      const result = await detectImage(imageFile, confidence);
      setImageState({ kind: 'image', result });
    } catch (e) {
      setImageState({ kind: 'error', message: errMsg(e) });
    }
  }, [imageFile, confidence]);

  const onAnalyzeVideo = useCallback(async () => {
    if (!videoFile) return;
    setVideoState({ kind: 'processing' });
    setVideoProgress(0);
    try {
      const result = await detectVideo(videoFile, confidence, (p) =>
        setVideoProgress(p)
      );
      trackAnnotated(result.annotatedVideo);
      setVideoState({ kind: 'video', result });
    } catch (e) {
      setVideoState({ kind: 'error', message: errMsg(e) });
    } finally {
      setVideoProgress(null);
    }
  }, [videoFile, confidence, trackAnnotated]);

  const currentDetections: Detection[] = useMemo(() => {
    if (mode === 'image' && imageState.kind === 'image') return imageState.result.detections;
    if (mode === 'video' && videoState.kind === 'video') return videoState.result.detections;
    return [];
  }, [mode, imageState, videoState]);

  const currentAnnotated = useMemo(() => {
    if (mode === 'image' && imageState.kind === 'image') return imageState.result.annotatedImage;
    if (mode === 'video' && videoState.kind === 'video') return videoState.result.annotatedVideo;
    return null;
  }, [mode, imageState, videoState]);

  const downloadResult = useCallback(() => {
    if (!currentAnnotated) return;
    const a = document.createElement('a');
    a.href = currentAnnotated;
    a.download = `hardhat-vision-${mode}-${Date.now()}.${mode === 'image' ? 'jpg' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [currentAnnotated, mode]);

  const isProcessing =
    (mode === 'image' && imageState.kind === 'processing') ||
    (mode === 'video' && videoState.kind === 'processing');

  const currentError =
    (mode === 'image' && imageState.kind === 'error' ? imageState.message : null) ??
    (mode === 'video' && videoState.kind === 'error' ? videoState.message : null);

  // Stats derived from real results only.
  const stats = useMemo(() => {
    if (mode === 'image' && imageState.kind === 'image') {
      const r = imageState.result;
      const helmetCount = r.detections.filter((d) => d.className === 'helmet').length;
      return { helmetCount, latencyMs: r.latencyMs, fps: null, framesProcessed: null };
    }
    if (mode === 'video' && videoState.kind === 'video') {
      const r = videoState.result;
      return {
        helmetCount: r.helmetCount,
        latencyMs: r.latencyMs,
        fps: r.fps,
        framesProcessed: r.framesProcessed,
      };
    }
    return { helmetCount: null, latencyMs: null, fps: null, framesProcessed: null };
  }, [mode, imageState, videoState]);

  return (
    <div className="min-h-screen">
      <Header backendStatus={backendStatus} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Hero strip */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Construction-site safety detection
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-steel-400">
              Upload site images or video and run your custom YOLOv5 model to detect
              safety helmets with confidence scores and annotated output.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModeTabs mode={mode} onChange={setMode} disabled={isProcessing} />
          </div>
        </section>

        {/* Backend notice */}
        {!backendConnected && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The Python YOLOv5 backend is not connected. Uploads and detection will
              fail until you start <code className="font-mono">backend/app.py</code> with
              your <code className="font-mono">best.pt</code> model. See the README for setup.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: controls */}
          <div className="flex flex-col gap-4 lg:col-span-4">
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              disabled={isProcessing}
            />
            <MediaUploader
              mode="image"
              file={imageFile}
              previewUrl={imagePreview}
              onFile={setImageFile}
              onAnalyze={onAnalyzeImage}
              disabled={!backendConnected}
              busy={imageState.kind === 'processing'}
            />
            <MediaUploader
              mode="video"
              file={videoFile}
              previewUrl={videoPreview}
              onFile={setVideoFile}
              onAnalyze={onAnalyzeVideo}
              disabled={!backendConnected}
              busy={videoState.kind === 'processing'}
            />
            <div className="panel flex items-start gap-3 p-4 text-xs text-steel-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p>
                Real inference only. The dashboard shows detections, latency, and FPS
                returned by your model — no simulated metrics.
              </p>
            </div>
          </div>

          {/* Right: results */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <StatsPanel
              helmetCount={stats.helmetCount}
              latencyMs={stats.latencyMs}
              fps={stats.fps}
              framesProcessed={stats.framesProcessed}
            />

            {mode === 'video' && videoState.kind === 'processing' && videoProgress !== null && videoProgress < 100 && (
              <div className="panel p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-steel-400">
                  <span>Uploading video…</span>
                  <span className="font-mono">{videoProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-navy-800">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-150"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </div>
            )}

            <ResultsPanel
              mode={mode}
              annotatedUrl={currentAnnotated}
              detections={currentDetections}
              isProcessing={isProcessing}
              error={currentError}
              onDownload={downloadResult}
            />
          </div>
        </div>

        <footer className="mt-10 border-t border-navy-800 pt-5 text-center text-xs text-steel-500">
          HardHat Vision — frontend ready. Connect the Python YOLOv5 backend
          (backend/app.py) with your best.pt to enable live detection.
        </footer>
      </main>
    </div>
  );
}

export default App;
