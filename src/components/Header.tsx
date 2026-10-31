import { HardHat, Activity } from 'lucide-react';
import type { BackendStatus } from '@/types';

interface HeaderProps {
  backendStatus: BackendStatus;
}

const statusMeta: Record<BackendStatus, { label: string; dot: string; text: string }> = {
  connected: { label: 'Backend connected', dot: 'bg-success', text: 'text-success' },
  disconnected: { label: 'Backend offline', dot: 'bg-danger', text: 'text-danger' },
  checking: { label: 'Checking backend…', dot: 'bg-warning', text: 'text-warning' },
};

export function Header({ backendStatus }: HeaderProps) {
  const meta = statusMeta[backendStatus];

  return (
    <header className="sticky top-0 z-30 border-b border-navy-800/80 bg-navy-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
            <HardHat className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-white sm:text-lg">
              HardHat Vision
            </h1>
            <p className="text-xs text-steel-400">AI Safety Detection</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-navy-700/70 bg-navy-900/60 px-3 py-1.5">
          <span className="relative flex h-2.5 w-2.5">
            {backendStatus === 'checking' && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          </span>
          <span className={`text-xs font-medium ${meta.text}`}>{meta.label}</span>
          <Activity className="ml-1 h-3.5 w-3.5 text-steel-500" />
        </div>
      </div>
    </header>
  );
}
