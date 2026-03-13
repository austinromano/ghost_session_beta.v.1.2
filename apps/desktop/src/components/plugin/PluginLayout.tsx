import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import Avatar from '../common/Avatar';
import ChatPanel from '../session/ChatPanel';
import { useSessionStore } from '../../stores/sessionStore';
import { useAudioStore } from '../../stores/audioStore';
import { isPlugin } from '../../lib/hostContext';

interface Invitation {
  id: string;
  projectName: string;
  inviterName: string;
}

function ProjectListSidebar({
  projects,
  selectedId,
  onSelect,
  onCreate,
}: {
  projects: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-ghost-border flex items-center justify-between">
        <span className="text-xs font-bold text-ghost-text-secondary uppercase tracking-wider">
          Projects
        </span>
        <button
          onClick={onCreate}
          className="w-6 h-6 flex items-center justify-center rounded bg-ghost-green/10 text-ghost-green text-sm font-bold hover:bg-ghost-green/20"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left px-3 py-2.5 text-sm border-b border-ghost-border/50 transition-colors ${
              selectedId === p.id
                ? 'bg-ghost-green/10 text-ghost-green font-semibold'
                : 'text-ghost-text-secondary hover:bg-ghost-surface-light'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function FriendsPanel({ friends }: { friends: { id: string; displayName: string; avatarUrl: string | null }[] }) {
  return (
    <div className="border-t border-ghost-border">
      <div className="p-3 border-b border-ghost-border">
        <span className="text-xs font-bold text-ghost-text-secondary uppercase tracking-wider">
          Friends
        </span>
      </div>
      <div className="p-2 space-y-1">
        {friends.length === 0 ? (
          <p className="text-[10px] text-ghost-text-muted px-2 py-1 italic">No friends yet</p>
        ) : (
          friends.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ghost-surface-light">
              <Avatar name={f.displayName} src={f.avatarUrl} size="sm" colour="#00FFC8" />
              <span className="text-xs text-ghost-text-primary flex-1 truncate">{f.displayName}</span>
              <span className="w-2 h-2 rounded-full bg-ghost-text-muted/30 shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CollaboratorPanel({ members, onInvite, isOwner, onRemove }: {
  members: { userId: string; displayName: string; role: string; avatarUrl?: string | null }[];
  onInvite: () => void;
  isOwner: boolean;
  onRemove: (userId: string, name: string) => void;
}) {
  return (
    <div className="border-t border-ghost-border">
      <div className="p-3 border-b border-ghost-border flex items-center justify-between">
        <span className="text-xs font-bold text-ghost-text-secondary uppercase tracking-wider">
          Collaborators
        </span>
        <button
          onClick={onInvite}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-ghost-purple bg-ghost-purple/10 border border-ghost-purple/30 hover:bg-ghost-purple/20 transition-colors"
        >
          <span>+</span> Invite
        </button>
      </div>
      <div className="p-2 space-y-1">
        {[...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m) => (
          <div key={m.userId} className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ghost-surface-light">
            <Avatar name={m.displayName} src={m.avatarUrl} size="sm" colour={m.role === 'owner' ? '#FFD700' : '#00FFC8'} />
            <span className="text-xs text-ghost-text-primary flex-1 truncate">{m.displayName}</span>
            {m.role === 'owner' ? (
              <span className="text-[8px] font-bold text-ghost-host-gold bg-ghost-host-gold/10 px-1.5 py-0.5 rounded">HOST</span>
            ) : isOwner ? (
              <button
                onClick={() => onRemove(m.userId, m.displayName)}
                className="opacity-0 group-hover:opacity-100 text-ghost-text-muted hover:text-red-400 transition-all"
                title={`Remove ${m.displayName}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
            <span className="w-2 h-2 rounded-full bg-ghost-green shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPopup({ user, onSignOut, onClose }: { user: any; onSignOut: () => void; onClose: () => void }) {
  return (
    <div className="absolute right-2 top-12 w-52 bg-ghost-surface border border-ghost-border rounded-lg shadow-xl z-50 p-3">
      <div className="text-[10px] font-bold text-ghost-text-secondary uppercase tracking-wider mb-2">Account</div>
      <div className="border-t border-ghost-border pt-2 mb-3">
        <div className="flex items-center gap-2">
          <Avatar name={user?.displayName || '?'} size="md" colour="#00FFC8" />
          <div>
            <p className="text-sm font-bold text-ghost-text-primary">{user?.displayName || 'Unknown'}</p>
            <p className="text-[10px] text-ghost-text-muted">{user?.email || ''}</p>
          </div>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="w-full px-3 py-2 text-xs font-semibold bg-ghost-surface-light border border-ghost-border rounded text-ghost-text-secondary hover:text-ghost-error-red hover:border-ghost-error-red transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

function NotificationPopup({ invitations, onAccept, onDecline }: { invitations: Invitation[]; onAccept: (id: string) => void; onDecline: (id: string) => void }) {
  return (
    <div className="absolute right-14 top-12 w-72 bg-ghost-surface border border-ghost-border rounded-lg shadow-xl z-50">
      <div className="p-3 border-b border-ghost-border">
        <span className="text-[10px] font-bold text-ghost-text-secondary uppercase tracking-wider">Invitations</span>
      </div>
      {invitations.length === 0 ? (
        <div className="p-4 text-center text-xs text-ghost-text-muted italic">No pending invitations</div>
      ) : (
        <div className="max-h-60 overflow-y-auto">
          {invitations.map((inv) => (
            <div key={inv.id} className="p-3 border-b border-ghost-border/50">
              <p className="text-xs font-bold text-ghost-green">{inv.inviterName}</p>
              <p className="text-[10px] text-ghost-text-muted mt-0.5">invited you to <span className="text-ghost-text-secondary">{inv.projectName}</span></p>
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => onAccept(inv.id)} className="px-3 py-1 text-[10px] font-semibold bg-ghost-green/10 text-ghost-green border border-ghost-green/30 rounded hover:bg-ghost-green/20">Accept</button>
                <button onClick={() => onDecline(inv.id)} className="px-2 py-1 text-[10px] font-semibold text-ghost-text-muted hover:text-ghost-error-red">X</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BellIcon({ count }: { count: number }) {
  return (
    <div className="relative">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
  );
}

function InviteModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  if (!open) return null;

  const handleInvite = async () => {
    if (!email.trim()) return;
    try {
      await api.inviteMember(projectId, email.trim());
      setStatus('Invited!');
      setEmail('');
      setTimeout(() => { setStatus(''); onClose(); }, 1000);
    } catch (err: any) {
      setStatus(err.message || 'Invite failed');
    }
  };

  return (
    <div className="absolute right-2 top-12 w-72 bg-ghost-surface border border-ghost-border rounded-lg shadow-xl z-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-ghost-text-secondary uppercase tracking-wider">Invite Collaborator</span>
        <button onClick={onClose} className="text-ghost-text-muted hover:text-ghost-text-primary text-sm">X</button>
      </div>
      <input
        className="ghost-input w-full text-sm mb-2"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
      />
      <button onClick={handleInvite} className="w-full px-3 py-2 text-xs font-semibold bg-ghost-purple text-white rounded hover:bg-ghost-purple/80">
        Send Invite
      </button>
      {status && <p className={`text-xs mt-2 ${status === 'Invited!' ? 'text-ghost-green' : 'text-ghost-error-red'}`}>{status}</p>}
    </div>
  );
}

// Stores raw audio channel data for pixel-accurate rendering
const rawDataCache = new Map<string, Float32Array>();

function Waveform({
  seed, height = 60, fileId, projectId, showPlayhead = false, trackId,
}: {
  seed: string; height?: number; fileId?: string | null; projectId?: string; showPlayhead?: boolean; trackId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rawData, setRawData] = useState<Float32Array | null>(
    fileId ? rawDataCache.get(fileId) || null : null
  );

  // Load raw audio data
  useEffect(() => {
    if (!fileId || !projectId) return;
    if (rawDataCache.has(fileId)) { setRawData(rawDataCache.get(fileId)!); return; }

    let cancelled = false;
    const url = api.getDirectDownloadUrl(projectId, fileId);

    fetch(url, { headers: { Authorization: `Bearer ${useAuthStore.getState().token}` } })
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf).finally(() => ctx.close());
      })
      .then((audioBuffer) => {
        if (cancelled) return;
        const data = audioBuffer.getChannelData(0);
        rawDataCache.set(fileId, data);
        setRawData(data);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [fileId, projectId]);

  // Generate fake audio-like data from seed
  const fakeData = useMemo(() => {
    if (rawData || (fileId && projectId)) return null;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    const len = 44100 * 4;
    const data = new Float32Array(len);
    let env = 0;
    for (let i = 0; i < len; i++) {
      h = ((h * 1103515245 + 12345) & 0x7fffffff);
      const noise = ((h & 0xffff) / 32768) - 1;
      if (i % 512 === 0) {
        h = ((h * 1103515245 + 12345) & 0x7fffffff);
        const target = (h % 100) / 100;
        env += (target - env) * 0.3;
      }
      data[i] = noise * env * 0.9;
    }
    return data;
  }, [seed, rawData, fileId, projectId]);

  const audioData = rawData || fakeData;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !audioData) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background — matches JUCE GhostColours::waveformBg
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    const mid = h / 2;
    const samplesPerPixel = audioData.length / w;

    // Pre-compute peaks once
    const peaks = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let max = 0;
      const start = Math.floor(x * samplesPerPixel);
      const end = Math.min(Math.floor((x + 1) * samplesPerPixel), audioData.length);
      for (let j = start; j < end; j++) {
        const abs = Math.abs(audioData[j]);
        if (abs > max) max = abs;
      }
      peaks[x] = max;
    }

    // Draw each column with gradient from #00FFC8 to #8B5CF6 across width
    // Matches JUCE: accentGradStart.interpolatedWith(accentGradEnd, t)
    for (let x = 0; x < w; x++) {
      const t = x / w;
      // Interpolate #00FFC8 → #8B5CF6
      const r = Math.round(0x00 + (0x8B - 0x00) * t);
      const g = Math.round(0xFF + (0x5C - 0xFF) * t);
      const b = Math.round(0xC8 + (0xF6 - 0xC8) * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const peakH = peaks[x] * mid * 0.84; // 0.42 * h in JUCE = 0.84 * mid
      if (peakH > 0.5) {
        ctx.fillRect(x, mid - peakH, 1, peakH * 2);
      }
    }
  }, [audioData]);

  useEffect(() => {
    draw();
    const obs = new ResizeObserver(draw);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  const { currentTime, duration, isPlaying, soloPlayingTrackId, soloCurrentTime, soloDuration } = useAudioStore();

  // Determine playhead position: solo track takes priority
  let playheadPct = 0;
  let showLine = false;
  if (showPlayhead) {
    if (trackId && soloPlayingTrackId === trackId && soloDuration > 0) {
      playheadPct = (soloCurrentTime / soloDuration) * 100;
      showLine = true;
    } else if (isPlaying && duration > 0) {
      playheadPct = (currentTime / duration) * 100;
      showLine = true;
    }
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden rounded relative" style={{ height }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {showLine && (
        <div
          className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        />
      )}
    </div>
  );
}

function FullMixDropZone({ projectId, onFilesAdded }: { projectId: string; onFilesAdded: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a|aac)$/i)
    );
    if (droppedFiles.length === 0) {
      setStatus('No audio files detected');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    setUploading(true);
    setStatus(`Uploading ${droppedFiles.length} file(s)...`);
    try {
      for (const file of droppedFiles) {
        const { fileId } = await api.uploadFile(projectId, file);
        const trackName = file.name.replace(/\.[^.]+$/, '');
        await api.addTrack(projectId, { name: trackName, type: 'fullmix', fileId, fileName: file.name } as any);
      }
      setStatus(`Added ${droppedFiles.length} mix(es)`);
      onFilesAdded();
    } catch (err: any) {
      setStatus(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.wav,.mp3,.flac,.aiff,.ogg,.m4a,.aac';
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const fakeEvent = {
          preventDefault: () => {},
          dataTransfer: { files: input.files },
        } as unknown as React.DragEvent;
        handleDrop(fakeEvent);
      }
    };
    input.click();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`bg-ghost-surface rounded-lg overflow-hidden transition-colors border-2 border-dashed ${
        dragOver ? 'border-ghost-green' : 'border-white/40'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button className="w-7 h-7 rounded-full border border-ghost-border flex items-center justify-center text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green transition-colors">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
        </button>
        <span className="text-xs font-bold text-ghost-text-muted uppercase tracking-wider">Full Mix</span>
        <div className="flex-1" />
      </div>
      <div className={`h-[80px] relative overflow-hidden rounded-b-lg transition-colors ${dragOver ? 'bg-ghost-green/5' : 'bg-ghost-bg'}`}>
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <Waveform seed="fullmix-demo-placeholder" height={80} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-4 px-6">
          {uploading ? (
            <span className="text-sm text-ghost-green animate-pulse">{status}</span>
          ) : status ? (
            <span className="text-sm text-ghost-green">{status}</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00FFC8' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className={`text-sm font-semibold ${dragOver ? 'text-ghost-green' : 'text-white'}`}>Drop your mix here</span>
              <div className="flex-1" />
              <button
                onClick={handleBrowse}
                className="px-3 py-1 text-xs font-semibold bg-ghost-surface-light border border-white/80 rounded-md text-white hover:text-ghost-green hover:border-ghost-green transition-colors shrink-0"
              >
                + Add File
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StemRow({
  name, type, onDelete, onRename, fileId, projectId, trackId,
}: {
  name: string; type: string;
  onDelete: () => void;
  onRename: (newName: string) => void;
  fileId?: string | null; projectId?: string; trackId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const { loadedTracks, loadTrack, playSoloTrack, stopSoloTrack, soloPlayingTrackId } = useAudioStore();
  const loaded = loadedTracks.has(trackId);
  const isThisPlaying = soloPlayingTrackId === trackId;

  // Auto-load track audio when it has a file
  useEffect(() => {
    if (fileId && projectId && !loaded) {
      loadTrack(trackId, fileId, projectId);
    }
  }, [fileId, projectId, trackId, loaded]);

  const downloadUrl = fileId && projectId ? api.getDirectDownloadUrl(projectId, fileId) : null;

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = name + '.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!downloadUrl) return;

    if (isPlugin) {
      // In plugin mode, cancel the browser drag and trigger JUCE native drag
      e.preventDefault();
      const ghostUrl = `ghost://drag-to-daw?url=${encodeURIComponent(downloadUrl)}&fileName=${encodeURIComponent(name + '.wav')}`;
      window.location.href = ghostUrl;
      return;
    }

    // Browser/standalone: use Chromium DownloadURL
    e.dataTransfer.setData('DownloadURL', `audio/wav:${name}.wav:${downloadUrl}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePlay = () => {
    if (isThisPlaying) {
      stopSoloTrack();
    } else if (loaded) {
      playSoloTrack(trackId);
    }
  };

  return (
    <div
      draggable={!!fileId}
      onDragStart={handleDragStart}
      className={`flex items-center bg-ghost-surface border border-ghost-border rounded-lg overflow-hidden h-[72px] ${fileId ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Play button */}
      <div className="w-14 shrink-0 flex items-center justify-center border-r border-ghost-border">
        <button
          onClick={handlePlay}
          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
            isThisPlaying
              ? 'border-ghost-green text-ghost-green bg-ghost-green/10'
              : loaded
                ? 'border-ghost-border text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green'
                : 'border-ghost-border text-ghost-text-muted opacity-40'
          }`}
          disabled={!loaded}
        >
          {isThisPlaying ? (
            <svg width="10" height="10" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" rx="1" />
              <rect x="8" y="0" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
          )}
        </button>
      </div>

      {/* Name + type */}
      <div className="w-28 shrink-0 px-3 overflow-hidden">
        {editing ? (
          <input
            autoFocus
            className="text-xs font-semibold text-ghost-text-primary bg-ghost-bg border border-ghost-green/50 rounded px-1 py-0.5 outline-none focus:border-ghost-green w-full"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName.trim() && editName !== name) onRename(editName.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setEditName(name); setEditing(false); }
            }}
          />
        ) : (
          <p
            className="text-xs font-semibold text-ghost-text-primary truncate cursor-pointer hover:text-ghost-green transition-colors"
            onClick={() => { setEditName(name); setEditing(true); }}
            title="Click to rename"
          >
            {name}
          </p>
        )}
        <p className="text-[10px] text-ghost-text-muted uppercase mt-0.5">{type === 'audio' ? 'stem' : type === 'fullmix' ? 'mix' : type}</p>
      </div>

      {/* Waveform */}
      <div className="flex-1 h-full overflow-hidden bg-ghost-bg">
        <Waveform seed={name + type} height={72} fileId={fileId} projectId={projectId} showPlayhead trackId={trackId} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-3 shrink-0">
        <button
          onClick={handleDownload}
          title="Download"
          className="w-8 h-8 rounded text-xs font-bold text-ghost-text-muted hover:text-ghost-green hover:bg-ghost-green/10 transition-colors flex items-center justify-center"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded text-xs font-bold text-ghost-text-muted hover:text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors"
        >
          X
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TransportBar() {
  const { isPlaying, currentTime, duration, play, pause, stop, seekTo } = useAudioStore();

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else play();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-14 bg-ghost-surface border-t border-ghost-border flex flex-col shrink-0">
      {/* Seek bar */}
      <div
        className="h-1.5 bg-ghost-bg cursor-pointer hover:h-2.5 transition-all"
        onClick={handleSeek}
      >
        <div className="h-full bg-ghost-green" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center px-4 gap-3">
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className={`w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
            isPlaying
              ? 'border-ghost-green text-ghost-green'
              : 'border-ghost-border text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green'
          }`}
        >
          {isPlaying ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" rx="1" />
              <rect x="8" y="0" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          className="w-9 h-9 rounded-md border border-ghost-border flex items-center justify-center text-ghost-text-secondary hover:text-ghost-text-primary transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="0" y="0" width="12" height="12" rx="1" />
          </svg>
        </button>

        {/* Time display */}
        <span className="text-sm font-mono text-ghost-text-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Playing indicator */}
        {isPlaying && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-ghost-green font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-ghost-green animate-pulse" />
            Playing
          </span>
        )}
      </div>
    </div>
  );
}

function DropZone({ projectId, onFilesAdded }: { projectId: string; onFilesAdded: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a|aac|stem)$/i)
    );

    if (droppedFiles.length === 0) {
      setStatus('No audio files detected');
      setTimeout(() => setStatus(''), 2000);
      return;
    }

    setUploading(true);
    setStatus(`Uploading ${droppedFiles.length} file(s)...`);

    try {
      for (const file of droppedFiles) {
        const { fileId } = await api.uploadFile(projectId, file);
        const trackName = file.name.replace(/\.[^.]+$/, '');
        await api.addTrack(projectId, { name: trackName, type: 'audio', fileId, fileName: file.name });
      }
      setStatus(`Added ${droppedFiles.length} track(s)`);
      onFilesAdded();
    } catch (err: any) {
      setStatus(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.wav,.mp3,.flac,.aiff,.ogg,.m4a,.aac';
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const fakeEvent = {
          preventDefault: () => {},
          dataTransfer: { files: input.files },
        } as unknown as React.DragEvent;
        handleDrop(fakeEvent);
      }
    };
    input.click();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`bg-ghost-surface rounded-lg overflow-hidden transition-colors border-2 border-dashed ${
        dragOver ? 'border-ghost-green' : 'border-white/40'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button className="w-7 h-7 rounded-full border border-ghost-border flex items-center justify-center text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green transition-colors">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
        </button>
        <span className="text-xs font-bold text-ghost-text-muted uppercase tracking-wider">Stems</span>
        <div className="flex-1" />
      </div>
      <div className={`h-[80px] relative overflow-hidden rounded-b-lg transition-colors ${dragOver ? 'bg-ghost-green/5' : 'bg-ghost-bg'}`}>
        {/* Faded demo waveform in background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <Waveform seed="stems-demo-placeholder" height={80} />
        </div>
        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-4 px-6">
          {uploading ? (
            <span className="text-sm text-ghost-green animate-pulse">{status}</span>
          ) : status ? (
            <span className="text-sm text-ghost-green">{status}</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00FFC8' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className={`text-sm font-semibold ${dragOver ? 'text-ghost-green' : 'text-white'}`}>Drop your stems here</span>
              <div className="flex-1" />
              <button
                onClick={handleBrowse}
                className="px-3 py-1 text-xs font-semibold bg-ghost-surface-light border border-white/80 rounded-md text-white hover:text-ghost-green hover:border-ghost-green transition-colors shrink-0"
              >
                + Add File
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PluginLayout() {
  const { user, logout } = useAuthStore();
  const { projects, currentProject, fetchProjects, fetchProject, createProject, updateProject, addTrack, updateTrack, deleteTrack } = useProjectStore();
  const { join, leave } = useSessionStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [friends, setFriends] = useState<{ id: string; displayName: string; avatarUrl: string | null }[]>([]);
  const fullMixTracks = currentProject?.tracks.filter((t: any) => t.type === 'fullmix') || [];
  const [editingField, setEditingField] = useState<'name' | 'tempo' | 'key' | 'genre' | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchInvitations();
    api.listUsers().then(setFriends).catch(() => {});
    const interval = setInterval(fetchInvitations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      selectProject(projects[0].id);
    }
  }, [projects]);

  const audioCleanup = useAudioStore((s) => s.cleanup);

  const selectProject = (id: string) => {
    if (selectedProjectId) { leave(); audioCleanup(); }
    setSelectedProjectId(id);
    fetchProject(id);
    join(id);
  };

  const handleCreate = async () => {
    const p = await createProject({ name: 'New Project', tempo: 140, key: 'C' });
    await fetchProjects();
    selectProject(p.id);
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + '/invitations',
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token}` } }
      );
      const json = await res.json();
      if (json.data) setInvitations(json.data);
    } catch {}
  };

  const acceptInvite = async (id: string) => {
    try {
      await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + `/invitations/${id}/accept`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` }, body: '{}' }
      );
      fetchInvitations();
      fetchProjects();
    } catch {}
  };

  const declineInvite = async (id: string) => {
    try {
      await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + `/invitations/${id}/decline`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` }, body: '{}' }
      );
      fetchInvitations();
    } catch {}
  };

  const members = currentProject?.members || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ghost-bg relative">
      {/* Left sidebar: project list + collaborators */}
      <div className="w-[200px] shrink-0 bg-ghost-surface border-r border-ghost-border flex flex-col">
        <div className="flex-1 min-h-0">
          <ProjectListSidebar
            projects={projects}
            selectedId={selectedProjectId}
            onSelect={selectProject}
            onCreate={handleCreate}
          />
        </div>
        <div className="shrink-0 overflow-y-auto" style={{ maxHeight: '45%' }}>
          <FriendsPanel friends={friends} />
          <CollaboratorPanel
            members={members as any}
            onInvite={() => setShowInvite(!showInvite)}
            isOwner={members.some((m: any) => m.userId === user?.id && m.role === 'owner')}
            onRemove={async (userId, name) => {
              if (!currentProject || !confirm(`Remove ${name} from this project?`)) return;
              try {
                await api.removeMember(currentProject.id, userId);
                fetchProject(currentProject.id);
              } catch (err: any) {
                alert(err.message || 'Failed to remove member');
              }
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="h-12 bg-ghost-surface border-b border-ghost-border flex items-center px-4 gap-4 shrink-0">
          {currentProject ? (
            <>
              {/* Project name */}
              {editingField === 'name' ? (
                <input
                  autoFocus
                  className="text-[13px] font-bold text-white bg-ghost-bg border border-ghost-green/60 rounded px-2 py-1 outline-none focus:border-ghost-green w-44"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim() && editValue !== currentProject.name) {
                      updateProject(currentProject.id, { name: editValue.trim() });
                    }
                    setEditingField(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingField(null);
                  }}
                />
              ) : (
                <h2
                  className="group flex items-center gap-1.5 text-[13px] font-bold text-white truncate cursor-pointer hover:text-ghost-green transition-colors"
                  onClick={() => { setEditingField('name'); setEditValue(currentProject.name); }}
                >
                  {currentProject.name}
                  <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </h2>
              )}

              {/* Divider */}
              <div className="w-px h-5 bg-ghost-border/40 shrink-0" />

              {/* BPM readout */}
              <div
                className="flex items-center gap-1.5 cursor-pointer group shrink-0"
                onClick={() => { if (editingField !== 'tempo') { setEditingField('tempo'); setEditValue(String(currentProject.tempo || 120)); } }}
              >
                <span className="text-[10px] font-semibold text-ghost-text-muted uppercase tracking-wider">BPM</span>
                {editingField === 'tempo' ? (
                  <input
                    autoFocus
                    type="number"
                    className="text-[13px] font-bold text-ghost-green bg-ghost-bg border border-ghost-green/50 rounded px-1.5 py-0.5 outline-none w-12 text-center"
                    style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(editValue);
                      if (val > 0 && val !== currentProject.tempo) {
                        updateProject(currentProject.id, { tempo: val });
                      }
                      setEditingField(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                ) : (
                  <span
                    className="text-[13px] font-bold text-white group-hover:text-ghost-green transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
                  >
                    {currentProject.tempo || 120}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-ghost-border/40 shrink-0" />

              {/* Key readout */}
              <div
                className="flex items-center gap-1.5 cursor-pointer group shrink-0"
                onClick={() => { if (editingField !== 'key') { setEditingField('key'); setEditValue(currentProject.key || 'C'); } }}
              >
                <span className="text-[10px] font-semibold text-ghost-text-muted uppercase tracking-wider">KEY</span>
                {editingField === 'key' ? (
                  <select
                    autoFocus
                    className="text-[13px] font-bold text-ghost-green bg-ghost-bg border border-ghost-green/50 rounded px-1 py-0.5 outline-none"
                    style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      if (e.target.value !== currentProject.key) {
                        updateProject(currentProject.id, { key: e.target.value });
                      }
                      setEditingField(null);
                    }}
                    onBlur={() => setEditingField(null)}
                  >
                    {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
                      'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
                    ].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="text-[13px] font-bold text-white group-hover:text-ghost-green transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
                  >
                    {currentProject.key || 'C'}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-ghost-border/40 shrink-0" />

              {/* Genre readout */}
              <div
                className="flex items-center gap-1.5 cursor-pointer group shrink-0"
                onClick={() => { if (editingField !== 'genre') { setEditingField('genre'); setEditValue((currentProject as any).genre || ''); } }}
              >
                <span className="text-[10px] font-semibold text-ghost-text-muted uppercase tracking-wider">GENRE</span>
                {editingField === 'genre' ? (
                  <input
                    autoFocus
                    className="text-[13px] font-bold text-ghost-green bg-ghost-bg border border-ghost-green/50 rounded px-1.5 py-0.5 outline-none w-24"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      if (editValue !== ((currentProject as any).genre || '')) {
                        updateProject(currentProject.id, { genre: editValue.trim() });
                      }
                      setEditingField(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                    placeholder="Hip-Hop, Trap..."
                  />
                ) : (
                  <span
                    className="text-[13px] font-bold text-white group-hover:text-ghost-green transition-colors"
                  >
                    {(currentProject as any).genre || '—'}
                  </span>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />
            </>
          ) : (
            <span className="text-sm text-ghost-text-muted italic flex-1">Select a project</span>
          )}

          {/* Bell icon */}
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowSettings(false); }}
            className="text-ghost-text-secondary hover:text-ghost-purple transition-colors shrink-0"
          >
            <BellIcon count={invitations.length} />
          </button>

          {/* Settings gear */}
          <button
            onClick={() => { setShowSettings(!showSettings); setShowNotifs(false); }}
            className="text-ghost-text-secondary hover:text-ghost-purple transition-colors shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Popups */}
        {showSettings && (
          <SettingsPopup
            user={user}
            onSignOut={() => { setShowSettings(false); logout(); }}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showNotifs && (
          <NotificationPopup
            invitations={invitations}
            onAccept={(id) => { acceptInvite(id); }}
            onDecline={(id) => { declineInvite(id); }}
          />
        )}
        {showInvite && selectedProjectId && (
          <InviteModal open={showInvite} onClose={() => setShowInvite(false)} projectId={selectedProjectId} />
        )}

        {/* Arrangement content + chat */}
        <div className="flex-1 flex min-h-0">
          {currentProject ? (
            <>
              <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto px-3 pt-3 pb-0">
                {/* Full Mix drop zone */}
                <FullMixDropZone projectId={selectedProjectId!} onFilesAdded={() => fetchProject(selectedProjectId!)} />

                {/* Full Mix rows */}
                <div className="space-y-1.5 mt-1.5">
                  {fullMixTracks.map((t: any) => (
                    <StemRow
                      key={t.id}
                      trackId={t.id}
                      name={t.name || t.fileName || 'Full Mix'}
                      type="fullmix"
                      fileId={t.fileId}
                      projectId={selectedProjectId!}
                      onDelete={() => deleteTrack(selectedProjectId!, t.id)}
                      onRename={(newName) => updateTrack(selectedProjectId!, t.id, { name: newName })}
                    />
                  ))}
                </div>

                {/* Drop zone for adding stems */}
                <div className="mt-3">
                  <DropZone projectId={selectedProjectId!} onFilesAdded={() => fetchProject(selectedProjectId!)} />
                </div>

                {/* Stem rows */}
                <div className="space-y-1.5 mt-1.5">
                  {currentProject.tracks.filter((t: any) => t.type !== 'fullmix').map((t) => (
                    <StemRow
                      key={t.id}
                      trackId={t.id}
                      name={t.name}
                      type={t.type || 'audio'}
                      fileId={t.fileId}
                      projectId={selectedProjectId!}
                      onDelete={() => deleteTrack(selectedProjectId!, t.id)}
                      onRename={(newName) => updateTrack(selectedProjectId!, t.id, { name: newName })}
                    />
                  ))}
                </div>
              </div>

              {/* Transport bar */}
              <TransportBar />
              </div>

              {/* Right chat panel */}
              <div className="w-56 shrink-0 border-l border-ghost-border flex flex-col min-h-0 overflow-hidden">
                <ChatPanel />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ghost-text-muted text-sm italic">
              Select a project or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
