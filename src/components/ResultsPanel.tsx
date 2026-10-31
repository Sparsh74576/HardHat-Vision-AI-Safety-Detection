import { Download, HardHat, AlertTriangle, Loader2 } from 'lucide-react';
import type { Detection, MediaMode } from '@/types';
import { detectionLabel } from '@/config';

interface ResultsPanelProps {
  mode: MediaMode;
  annotatedUrl: string | null;
  detections: Detection[];
  isProcessing: boolean;
  error: string | null;
  onDownload: () => void;
}

export function ResultsPanel({
  mode,
  annotatedUrl,
  detections,
  isProcessing,
  error,
  onDownload,
}: ResultsPanelProps) {
  const hasResult = annotatedUrl !== null && !error;

  return (
    <div className="panel flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-navy-100">Detection results</h3>
        {hasResult && (
          <button type="button" onClick={onDownload} className="btn-ghost text-xs">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        )}
      </div>

      <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-navy-700 bg-navy-950">
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-navy-950/70 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <p className="text-sm text-navy-100">Running inference…</p>
            <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-navy-800">
              <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-accent to-transparent" />
            </div>
          </div>
        )}

        {error && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <AlertTriangle className="h-7 w-7 text-danger" />
            <p className="text-sm font-medium text-danger">Detection failed</p>
            <p className="max-w-sm text-xs text-steel-400">{error}</p>
          </div>
        )}

        {!isProcessing && !error && !hasResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <HardHat className="h-8 w-8 text-navy-600" />
            <p className="text-sm text-steel-400">
              No results yet. Upload media and run detection to see annotated output.
            </p>
          </div>
        )}

        {hasResult && mode === 'image' && (
          <img src={annotatedUrl!} alt="Annotated detection result" className="max-h-[420px] w-full object-contain" />
        )}
        {hasResult && mode === 'video' && (
          <video src={annotatedUrl!} controls className="max-h-[420px] w-full object-contain" />
        )}
      </div>

      {hasResult && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-steel-400">
              Detections ({detections.length})
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto pr-1">
            {detections.length === 0 ? (
              <p className="py-3 text-xs text-steel-500">
                No objects met the confidence threshold.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {detections.map((d, i) => (
                  <DetectionRow key={i} detection={d} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetectionRow({ detection }: { detection: Detection }) {
  const isHelmet = detection.className === 'helmet';
  const pct = detection.confidence * 100;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-navy-700/60 bg-navy-800/40 px-3 py-2">
      <span
        className={`chip ${
          isHelmet ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
        }`}
      >
        {detection.className}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-navy-700">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${isHelmet ? 'bg-success' : 'bg-danger'}`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-navy-100 tabular-nums">
       {detectionLabel(detection.classId, detection.confidence).split(' ').pop()}      </span>
    </li>
  );
}
