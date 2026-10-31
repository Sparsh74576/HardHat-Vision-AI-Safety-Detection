import { useId } from 'react';
import { Gauge } from 'lucide-react';

interface ConfidenceSliderProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const MIN = 0.1;
const MAX = 0.9;
const STEP = 0.01;

export function ConfidenceSlider({ value, onChange, disabled }: ConfidenceSliderProps) {
  const id = useId();
  const fillPct = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-accent" />
          <label htmlFor={id} className="text-sm font-medium text-navy-100">
            Confidence threshold
          </label>
        </div>
        <span className="rounded-md bg-navy-800 px-2.5 py-1 font-mono text-sm font-semibold text-accent tabular-nums">
          {value.toFixed(2)}
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="confidence-slider"
        style={{ ['--fill' as string]: `${fillPct}%` }}
        aria-describedby={`${id}-help`}
      />

      <div className="mt-2 flex justify-between font-mono text-[11px] text-steel-500">
        <span>{MIN.toFixed(1)}</span>
        <span id={`${id}-help`} className="text-steel-400">
          Lower detects more; higher reduces false positives
        </span>
        <span>{MAX.toFixed(1)}</span>
      </div>
    </div>
  );
}
