import { useRef, useState, useCallback } from 'react';
import { ImagePlus, Film, UploadCloud, X } from 'lucide-react';
import type { MediaMode } from '@/types';

interface MediaUploaderProps {
  mode: MediaMode;
  file: File | null;
  previewUrl: string | null;
  onFile: (file: File | null) => void;
  onAnalyze: () => void;
  disabled?: boolean;
  busy?: boolean;
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO = 120 * 1024 * 1024; // 120 MB

export function MediaUploader({
  mode,
  file,
  previewUrl,
  onFile,
  onAnalyze,
  disabled,
  busy,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = mode === 'image' ? IMAGE_TYPES.join(',') : VIDEO_TYPES.join(',');
  const maxBytes = mode === 'image' ? MAX_IMAGE : MAX_VIDEO;
  const Icon = mode === 'image' ? ImagePlus : Film;

  const validate = useCallback(
    (f: File): string | null => {
      const allowed = mode === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
      if (!allowed.includes(f.type)) {
        return `Unsupported file type. ${mode === 'image' ? 'Use PNG, JPG, or WebP.' : 'Use MP4, MOV, or WebM.'}`;
      }
      if (f.size > maxBytes) {
        const mb = Math.round(maxBytes / 1024 / 1024);
        return `File exceeds the ${mb} MB limit.`;
      }
      return null;
    },
    [mode, maxBytes]
  );

  const handleFile = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      const err = validate(f);
      if (err) {
        setLocalError(err);
        onFile(null);
        return;
      }
      setLocalError(null);
      onFile(f);
    },
    [onFile, validate]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      handleFile(e.dataTransfer.files?.[0]);
    },
    [disabled, handleFile]
  );

  const clear = useCallback(() => {
    onFile(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFile]);

  return (
    <div className="panel flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-medium text-navy-100">
            {mode === 'image' ? 'Image upload' : 'Video upload'}
          </h3>
        </div>
        {file && (
          <button
            type="button"
            onClick={clear}
            className="text-steel-400 transition-colors hover:text-danger"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-navy-700 hover:border-navy-500 hover:bg-navy-800/40'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-navy-800 text-accent transition-transform group-hover:scale-105">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-navy-100">
            Drop {mode === 'image' ? 'an image' : 'a video'} or click to browse
          </p>
          <p className="mt-1 text-xs text-steel-500">
            {mode === 'image' ? 'PNG, JPG, WebP up to 10 MB' : 'MP4, MOV, WebM up to 120 MB'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-700 bg-navy-950">
          {mode === 'image' && previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected"
              className="max-h-64 w-full object-contain"
            />
          ) : (
            <video
              src={previewUrl ?? undefined}
              controls
              className="max-h-64 w-full object-contain"
            />
          )}
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-steel-400">
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
      )}

      {localError && (
        <p className="mt-3 text-xs text-danger">{localError}</p>
      )}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={disabled || !file || busy || !!localError}
        className="btn-primary mt-4 w-full"
      >
        {busy ? 'Analyzing…' : `Run ${mode === 'image' ? 'image' : 'video'} detection`}
      </button>
    </div>
  );
}
