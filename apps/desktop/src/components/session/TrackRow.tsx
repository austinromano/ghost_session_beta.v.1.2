import type { Track } from '@ghost/types';
import Badge from '../common/Badge';

const trackTypeColours: Record<string, string> = {
  audio: '#42A5F5',
  midi: '#8B5CF6',
  drum: '#FF6B6B',
  loop: '#4ECDC4',
};

interface TrackRowProps {
  track: Track;
  onMute: (id: string, muted: boolean) => void;
  onSolo: (id: string, soloed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function TrackRow({ track, onMute, onSolo, onDelete }: TrackRowProps) {
  const typeColour = trackTypeColours[track.type] || '#42A5F5';

  return (
    <div className="ghost-card flex items-center gap-4 p-3 group">
      {/* Type strip */}
      <div className="w-1 h-12 rounded-full" style={{ backgroundColor: typeColour }} />

      {/* Info */}
      <div className="min-w-[120px]">
        <p className="text-sm font-semibold text-ghost-text-primary">{track.name}</p>
        <p className="text-[10px] text-ghost-text-muted">@{track.ownerName}</p>
      </div>

      {/* Waveform placeholder */}
      <div className="flex-1 h-10 rounded bg-ghost-waveform-bg relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 opacity-30 rounded"
          style={{
            width: '100%',
            background: `linear-gradient(90deg, ${typeColour}40, ${typeColour}10)`,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        <Badge colour={typeColour}>{track.type}</Badge>
        <button
          onClick={() => onMute(track.id, !track.muted)}
          className={`px-2 py-1 text-[10px] font-bold rounded ${
            track.muted ? 'bg-ghost-warning-amber/20 text-ghost-warning-amber' : 'text-ghost-text-muted hover:text-ghost-text-primary'
          }`}
        >
          M
        </button>
        <button
          onClick={() => onSolo(track.id, !track.soloed)}
          className={`px-2 py-1 text-[10px] font-bold rounded ${
            track.soloed ? 'bg-ghost-host-gold/20 text-ghost-host-gold' : 'text-ghost-text-muted hover:text-ghost-text-primary'
          }`}
        >
          S
        </button>
        <button
          onClick={() => onDelete(track.id)}
          className="px-2 py-1 text-[10px] text-ghost-text-muted hover:text-ghost-error-red opacity-0 group-hover:opacity-100 transition-opacity"
        >
          X
        </button>
      </div>
    </div>
  );
}
