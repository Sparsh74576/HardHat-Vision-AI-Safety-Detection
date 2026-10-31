import { Image, Video } from 'lucide-react';
import type { MediaMode } from '@/types';

interface ModeTabsProps {
  mode: MediaMode;
  onChange: (m: MediaMode) => void;
  disabled?: boolean;
}

export function ModeTabs({ mode, onChange, disabled }: ModeTabsProps) {
  const tabs: { key: MediaMode; label: string; icon: React.ReactNode }[] = [
    { key: 'image', label: 'Image', icon: <Image className="h-4 w-4" /> },
    { key: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
  ];

  return (
    <div className="inline-flex rounded-xl border border-navy-700 bg-navy-900/60 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === t.key
              ? 'bg-accent text-navy-950'
              : 'text-steel-400 hover:text-navy-100'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
