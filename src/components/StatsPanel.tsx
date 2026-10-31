import { HardHat, Clock, Video, Boxes } from 'lucide-react';

interface StatsPanelProps {
  helmetCount: number | null;
  latencyMs: number | null;
  fps: number | null;
  framesProcessed: number | null;
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`panel p-4 ${accent ? 'ring-1 ring-accent/30' : ''}`}>
      <div className="mb-2 flex items-center gap-2 text-steel-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="stat-value text-white">{value}</div>
      {hint && <p className="mt-1 text-[11px] text-steel-500">{hint}</p>}
    </div>
  );
}

const dash = '—';

export function StatsPanel({
  helmetCount,
  latencyMs,
  fps,
  framesProcessed,
}: StatsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<HardHat className="h-4 w-4" />}
        label="Helmets"
        value={helmetCount !== null ? String(helmetCount) : dash}
        hint="Detected head protection"
        accent
      />
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label="Latency"
        value={latencyMs !== null ? `${latencyMs.toFixed(0)} ms` : dash}
        hint="Inference time"
      />
      <StatCard
        icon={<Video className="h-4 w-4" />}
        label="FPS"
        value={fps !== null ? fps.toFixed(1) : dash}
        hint="Video processing rate"
      />
      <StatCard
        icon={<Boxes className="h-4 w-4" />}
        label="Frames"
        value={framesProcessed !== null ? String(framesProcessed) : dash}
        hint="Processed frames"
      />
    </div>
  );
}
