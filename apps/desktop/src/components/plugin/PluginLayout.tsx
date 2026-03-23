import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import { onGlobalOnlineUsers } from '../../lib/socket';
import Avatar from '../common/Avatar';
import ChatPanel from '../session/ChatPanel';
import { useSessionStore } from '../../stores/sessionStore';
import { useAudioStore } from '../../stores/audioStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const SERVER_BASE = API_BASE.replace('/api/v1', '');

interface Invitation {
  id: string;
  projectName: string;
  inviterName: string;
}

interface SamplePack {
  id: string;
  name: string;
  samples: { id: string; name: string; fileId?: string }[];
  updatedAt?: string;
}

function ProjectListSidebar({
  projects,
  allProjects,
  selectedId,
  onSelect,
  onCreate,
  onCreateBeat,
  samplePacks,
  selectedPackId,
  onSelectPack,
  onCreatePack,
  friends,
}: {
  projects: { id: string; name: string }[];
  allProjects: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onCreateBeat: () => void;
  samplePacks: SamplePack[];
  selectedPackId: string | null;
  onSelectPack: (id: string) => void;
  onCreatePack: () => void;
  friends: { id: string; displayName: string; avatarUrl: string | null }[];
}) {
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [beatsOpen, setBeatsOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ghost_favorites') || '[]')); } catch { return new Set(); }
  });
  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('ghost_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Ghost Session branding */}
      <div className="px-3 h-14 flex items-center gap-2 shrink-0">
        <span className="text-[15px] font-bold tracking-[0.12em] uppercase whitespace-nowrap flex items-center justify-center gap-1.5 w-full" style={{ background: 'linear-gradient(135deg, #00FFC8 0%, #00B4D8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Ghost
          <motion.svg
            width="22" height="24" viewBox="0 0 20 22" fill="none" className="shrink-0"
            style={{ WebkitTextFillColor: 'initial', filter: 'drop-shadow(0 0 6px rgba(0,255,200,0.4))' }}
            animate={{ y: [0, -2, 0], rotate: [0, -3, 0, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id="ghostGrad" x1="0" y1="0" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00FFC8" />
                <stop offset="100%" stopColor="#00B4D8" />
              </linearGradient>
            </defs>
            <path d="M10 1C5.5 1 2 4.5 2 9v8l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V9c0-4.5-3.5-8-8-8z" fill="rgba(0,255,200,0.1)" stroke="url(#ghostGrad)" strokeWidth="1.3" strokeLinejoin="round" />
            <ellipse cx="7.5" cy="9.5" rx="1.6" ry="1.8" fill="url(#ghostGrad)" opacity="0.9" />
            <ellipse cx="12.5" cy="9.5" rx="1.6" ry="1.8" fill="url(#ghostGrad)" opacity="0.9" />
            <ellipse cx="7.5" cy="9.2" rx="0.6" ry="0.7" fill="#0A0412" />
            <ellipse cx="12.5" cy="9.2" rx="0.6" ry="0.7" fill="#0A0412" />
          </motion.svg>
          Session
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Projects dropdown */}
        <div>
          <button
            onClick={() => setProjectsOpen((v) => !v)}
            className="h-9 px-3 mx-2 mt-1.5 w-[calc(100%-16px)] flex items-center justify-between rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors"
          >
            <span className="flex items-center gap-1.5 flex-1">
              <span className="text-[13px] font-bold text-white/80 uppercase tracking-[0.08em]">
                Collabs
              </span>
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${projectsOpen ? 'rotate-90' : ''}`}>
              <polygon points="2,0 8,5 2,10" />
            </svg>
          </button>
          {projectsOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              <button onClick={onCreate} className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-purple-400 hover:text-purple-300 hover:bg-white/[0.04] rounded-md transition-colors">
                <span className="text-[15px]">+</span> New Collabs
              </button>
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`group flex items-center w-full px-2 py-1.5 text-[13px] rounded-md transition-colors cursor-pointer ${
                    selectedId === p.id && !selectedPackId
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-ghost-text-muted font-normal hover:bg-white/[0.04] hover:text-ghost-text-secondary'
                  }`}
                  onClick={() => onSelect(p.id)}
                >
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-text-muted shrink-0">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                    className="text-yellow-400 transition-colors hover:text-yellow-300 shrink-0 ml-2"
                    title={favoriteIds.has(p.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteIds.has(p.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Beats dropdown */}
        <div>
          <div className="h-9 px-3 mx-2 mt-1.5 w-[calc(100%-16px)] flex items-center justify-between rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors">
            <button
              onClick={() => setBeatsOpen((v) => !v)}
              className="flex items-center justify-between flex-1"
            >
              <span className="text-[13px] font-bold text-white/80 uppercase tracking-[0.08em]">
                Projects
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${beatsOpen ? 'rotate-90' : ''}`}>
                <polygon points="2,0 8,5 2,10" />
              </svg>
            </button>
          </div>
          {beatsOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              <button onClick={onCreateBeat} className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-purple-400 hover:text-purple-300 hover:bg-white/[0.04] rounded-md transition-colors">
                <span className="text-[15px]">+</span> New Projects
              </button>
              {allProjects.filter((p: any) => p.projectType === 'beat').map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => { onSelect(p.id); }}
                  className={`flex items-center w-full px-2 py-1.5 text-[13px] rounded-md transition-colors cursor-pointer ${
                    selectedId === p.id && !selectedPackId
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-ghost-text-muted font-normal hover:bg-white/[0.04] hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-green shrink-0">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                    className="text-yellow-400 transition-colors hover:text-yellow-300 shrink-0 ml-2"
                    title={favoriteIds.has(p.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteIds.has(p.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              ))}
              {allProjects.filter((p: any) => p.projectType === 'beat').length === 0 && (
                <p className="px-2 py-1.5 text-[13px] text-ghost-text-muted italic">No beats yet</p>
              )}
            </div>
          )}
        </div>

        {/* Favorites dropdown */}
        <div>
          <button
            onClick={() => setFavoritesOpen((v) => !v)}
            className="h-9 px-3 mx-2 mt-1.5 w-[calc(100%-16px)] flex items-center justify-between rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors"
          >
            <span className="flex items-center gap-1.5 flex-1">
              <span className="text-[13px] font-bold text-white/80 uppercase tracking-[0.08em]">
                Favorites
              </span>
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${favoritesOpen ? 'rotate-90' : ''}`}>
              <polygon points="2,0 8,5 2,10" />
            </svg>
          </button>
          {favoritesOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              {allProjects.filter((p: any) => favoriteIds.has(p.id)).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={`w-full text-left px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                    selectedId === p.id && !selectedPackId
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-ghost-text-muted font-normal hover:bg-white/[0.04] hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-green shrink-0">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {p.name}
                  </span>
                </button>
              ))}
              {samplePacks.filter((sp) => favoriteIds.has(sp.id)).map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => onSelectPack(sp.id)}
                  className={`w-full text-left px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                    selectedPackId === sp.id
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-ghost-text-muted font-normal hover:bg-white/[0.04] hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ghost-purple">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    {sp.name}
                  </span>
                </button>
              ))}
              {projects.filter((p) => favoriteIds.has(p.id)).length === 0 && samplePacks.filter((sp) => favoriteIds.has(sp.id)).length === 0 && (
                <p className="px-2 py-1.5 text-[13px] text-ghost-text-muted italic">No favorites yet</p>
              )}
            </div>
          )}
        </div>

        {/* Sample Packs dropdown */}
        <div>
          <button
            onClick={() => setPacksOpen((v) => !v)}
            className="h-9 px-3 mx-2 mt-1.5 w-[calc(100%-16px)] flex items-center justify-between rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors"
          >
            <span className="text-[13px] font-bold text-white/80 uppercase tracking-[0.08em]">
              My Samples
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${packsOpen ? 'rotate-90' : ''}`}>
              <polygon points="2,0 8,5 2,10" />
            </svg>
          </button>
          {packsOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              <button onClick={onCreatePack} className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-purple-400 hover:text-purple-300 hover:bg-white/[0.04] rounded-md transition-colors">
                <span className="text-[15px]">+</span> New Samples
              </button>
              {samplePacks.length === 0 && (
                <p className="text-[11px] text-ghost-text-muted italic px-2 py-1">No packs yet</p>
              )}
              {samplePacks.map((sp) => (
                <div
                  key={sp.id}
                  onClick={() => onSelectPack(sp.id)}
                  className={`group flex items-center w-full px-2 py-1.5 text-[13px] rounded-md transition-colors cursor-pointer ${
                    selectedPackId === sp.id
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-ghost-text-muted font-normal hover:bg-white/[0.04] hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ghost-purple">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    <span className="truncate">{sp.name}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(sp.id); }}
                    className="text-yellow-400 transition-colors hover:text-yellow-300 shrink-0 ml-2"
                    title={favoriteIds.has(sp.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteIds.has(sp.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends */}
      </div>
    </div>
  );
}

function FriendsPanel({ friends }: { friends: { id: string; displayName: string; avatarUrl: string | null }[] }) {
  const [open, setOpen] = useState(true);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    onGlobalOnlineUsers((users) => {
      setOnlineIds(new Set(users.map(u => u.userId)));
    });
  }, []);

  const onlineFriends = friends.filter(f => onlineIds.has(f.id));
  const offlineFriends = friends.filter(f => !onlineIds.has(f.id));

  return (
    <div className="shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 mx-2 mt-1.5 w-[calc(100%-16px)] flex items-center justify-between rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors"
      >
        <span className="flex items-center gap-1.5 flex-1">
          <span className="text-[13px] font-bold text-white/80 uppercase tracking-[0.08em]">
            My Friends
          </span>
          {onlineFriends.length > 0 && (
            <span className="text-[10px] font-bold text-ghost-green bg-ghost-green/15 px-1.5 py-0.5 rounded-full">{onlineFriends.length} online</span>
          )}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${open ? 'rotate-90' : ''}`}>
          <polygon points="2,0 8,5 2,10" />
        </svg>
      </button>
      {open && (
        <div className="px-2 pb-1.5 space-y-px">
          {friends.length === 0 ? null : (
            <>
              {onlineFriends.map((f) => (
                <div key={f.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-ghost-surface-hover cursor-pointer group transition-colors">
                  <div className="relative">
                    <Avatar name={f.displayName} src={f.avatarUrl} size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23A559] border-[2.5px] border-ghost-surface" />
                  </div>
                  <span className="text-[13px] font-medium text-ghost-text-secondary group-hover:text-white flex-1 truncate transition-colors">{f.displayName}</span>
                </div>
              ))}
              {offlineFriends.map((f) => (
                <div key={f.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-ghost-surface-hover cursor-pointer group transition-colors">
                  <div className="relative">
                    <Avatar name={f.displayName} src={f.avatarUrl} size="sm" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-ghost-text-muted/40 border-2 border-ghost-surface" />
                  </div>
                  <span className="text-[13px] font-medium text-ghost-text-muted/50 group-hover:text-ghost-text-primary flex-1 truncate transition-colors">{f.displayName}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
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
    <div className="mt-1">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ghost-text-secondary uppercase tracking-wide">
          Collaborators
        </span>
        <button
          onClick={onInvite}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-ghost-text-muted hover:text-ghost-text-primary transition-colors"
        >
          + Invite
        </button>
      </div>
      <div className="px-2 space-y-0.5">
        {[...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m) => (
          <div key={m.userId} className="group flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-ghost-surface-hover/50 cursor-pointer">
            <div className="relative">
              <Avatar name={m.displayName} src={m.avatarUrl} size="sm" colour={m.role === 'owner' ? '#F0B232' : '#23A559'} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ghost-online-green border-2 border-ghost-sidebar" />
            </div>
            <span className="text-[14px] text-ghost-text-muted flex-1 truncate hover:text-ghost-text-secondary">{m.displayName}</span>
            {m.role === 'owner' ? (
              <span className="text-[10px] font-semibold text-ghost-host-gold bg-ghost-host-gold/15 px-1.5 py-0.5 rounded">HOST</span>
            ) : isOwner ? (
              <button
                onClick={() => onRemove(m.userId, m.displayName)}
                className="opacity-0 group-hover:opacity-100 text-ghost-text-muted hover:text-ghost-error-red transition-all"
                title={`Remove ${m.displayName}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPopup({ user, onSignOut, onDeleteAccount, onClose, onProfile }: { user: any; onSignOut: () => void; onDeleteAccount: () => void; onClose: () => void; onProfile?: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const { avatarUrl } = await api.uploadAvatar(file);
      const updated = { ...user, avatarUrl };
      useAuthStore.setState({ user: updated });
      localStorage.setItem('ghost_user', JSON.stringify(updated));
    } catch {}
    setUploading(false);
  };

  return (
    <div className="absolute right-2 top-12 w-56 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 p-2 border border-white/5">
      <div className="p-2 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
            <Avatar name={user?.displayName || '?'} src={user?.avatarUrl} size="lg" />
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <span className="text-[9px] text-white font-bold">...</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ghost-text-primary">{user?.displayName || 'Unknown'}</p>
            <p className="text-[12px] text-ghost-text-muted">{user?.email || ''}</p>
          </div>
        </div>
      </div>
      <div className="h-px bg-white/5 mx-1 mb-1" />
      <button
        onClick={() => { onClose(); if (onProfile) onProfile(); }}
        className="w-full px-2 py-1.5 text-[13px] text-left rounded text-ghost-text-secondary hover:bg-ghost-surface-hover hover:text-white transition-colors"
      >
        My Profile
      </button>
      <button
        onClick={onSignOut}
        className="w-full px-2 py-1.5 text-[13px] text-left rounded text-ghost-text-secondary hover:bg-ghost-error-red hover:text-white transition-colors"
      >
        Sign Out
      </button>
      <div className="h-px bg-white/5 mx-1 my-1" />
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full px-2 py-1.5 text-[13px] text-left rounded text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Delete Account
        </button>
      ) : (
        <div className="p-2 space-y-2">
          <p className="text-[12px] text-red-400">Are you sure? This is permanent.</p>
          <div className="flex gap-2">
            <button onClick={onDeleteAccount} className="flex-1 px-2 py-1 text-[12px] rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Yes, Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="flex-1 px-2 py-1 text-[12px] rounded bg-white/10 text-ghost-text-secondary hover:bg-white/15 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

function NotificationPopup({ invitations, onAccept, onDecline, notifications, onMarkRead }: {
  invitations: Invitation[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  notifications: Notification[];
  onMarkRead: () => void;
}) {
  return (
    <div className="absolute right-14 top-12 w-80 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 border border-white/5 max-h-80 overflow-y-auto">
      {/* Invitations section */}
      {invitations.length > 0 && (
        <>
          <div className="p-3 pb-1">
            <span className="text-[12px] font-semibold text-ghost-text-secondary uppercase tracking-wide">Invitations</span>
          </div>
          <div>
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
        </>
      )}

      {/* Notifications section */}
      {notifications.length > 0 && (
        <>
          <div className="p-3 pb-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ghost-text-secondary uppercase tracking-wide">Messages</span>
            <button onClick={onMarkRead} className="text-[11px] text-ghost-purple hover:text-ghost-purple/80 font-medium">Mark all read</button>
          </div>
          <div>
            {notifications.map((n) => (
              <div key={n.id} className="px-3 py-2 border-b border-ghost-border/50 flex gap-2 items-start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5865F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-ghost-text-secondary leading-snug">{n.message}</p>
                  <p className="text-[10px] text-ghost-text-muted mt-0.5">
                    {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {invitations.length === 0 && notifications.length === 0 && (
        <div className="p-4 text-center text-[13px] text-ghost-text-muted italic">No new notifications</div>
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
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      api.listUsers().then(setAllUsers).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const matches = allUsers.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    setSuggestions(matches.slice(0, 5));
  }, [query, allUsers]);

  if (!open) return null;

  const handleInvite = async (emailOrName: string) => {
    if (!emailOrName.trim()) return;
    try {
      const isEmail = emailOrName.includes('@');
      if (isEmail) {
        await api.inviteMember(projectId, emailOrName.trim());
      } else {
        await api.inviteMember(projectId, '', emailOrName.trim());
      }
      setStatus('Invited!');
      setQuery('');
      setSuggestions([]);
      setTimeout(() => { setStatus(''); onClose(); }, 1000);
    } catch (err: any) {
      setStatus(err.message || 'Invite failed');
    }
  };

  return (
    <div className="absolute right-2 top-12 w-72 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 p-4 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-ghost-text-secondary uppercase tracking-wide">Invite Collaborator</span>
        <button onClick={onClose} className="text-ghost-text-muted hover:text-ghost-text-primary text-sm">X</button>
      </div>
      <div className="relative">
        <input
          className="ghost-input w-full text-sm mb-0"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInvite(query)}
          autoFocus
        />
        {suggestions.length > 0 && (
          <div ref={suggestionsRef} className="mt-1 bg-[#0a0a12] rounded-lg border border-white/5 overflow-hidden">
            {suggestions.map((u) => (
              <button
                key={u.id}
                onClick={() => handleInvite(u.email)}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-ghost-surface-hover transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-ghost-green text-black flex items-center justify-center text-[11px] font-bold shrink-0">
                  {u.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{u.displayName}</p>
                  <p className="text-[12px] text-ghost-text-muted truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {suggestions.length === 0 && query.trim() && (
        <button onClick={() => handleInvite(query)} className="w-full mt-2 px-3 py-2 text-[13px] font-medium bg-ghost-purple text-white rounded hover:bg-[#4752C4] transition-colors">
          Send Invite
        </button>
      )}
      {status && <p className={`text-xs mt-2 ${status === 'Invited!' ? 'text-ghost-green' : 'text-ghost-error-red'}`}>{status}</p>}
    </div>
  );
}

// Stores raw audio channel data for pixel-accurate rendering
const rawDataCache = new Map<string, Float32Array>();
// Stores decoded AudioBuffers for playback
const audioBufferCache = new Map<string, AudioBuffer>();
// Stores in-flight download promises to avoid duplicate fetches
const downloadPromises = new Map<string, Promise<ArrayBuffer>>();

function debugLog(msg: string) {
  fetch(`${API_BASE}/debug`, { method: 'POST', body: msg }).catch(() => {});
}

function getAudioData(projectId: string, fileId: string): Promise<{ buffer: AudioBuffer; channelData: Float32Array }> {
  debugLog('getAudioData called: ' + fileId);

  if (audioBufferCache.has(fileId)) {
    debugLog('cache hit: ' + fileId);
    const buffer = audioBufferCache.get(fileId)!;
    const channelData = rawDataCache.get(fileId) || buffer.getChannelData(0);
    return Promise.resolve({ buffer, channelData });
  }

  let downloadPromise = downloadPromises.get(fileId);
  if (!downloadPromise) {
    debugLog('starting download: ' + fileId);
    downloadPromise = api.downloadFile(projectId, fileId);
    downloadPromises.set(fileId, downloadPromise);
  } else {
    debugLog('reusing download: ' + fileId);
  }

  return downloadPromise.then((buf) => {
    debugLog('download done: ' + fileId + ' size=' + buf.byteLength);
    if (audioBufferCache.has(fileId)) {
      debugLog('another caller already decoded: ' + fileId);
      const buffer = audioBufferCache.get(fileId)!;
      return { buffer, channelData: rawDataCache.get(fileId) || buffer.getChannelData(0) };
    }
    debugLog('decoding: ' + fileId);
    const ctx = new AudioContext();
    return ctx.decodeAudioData(buf.slice(0)).then((decoded) => {
      ctx.close();
      debugLog('decode SUCCESS: ' + fileId + ' duration=' + decoded.duration);
      audioBufferCache.set(fileId, decoded);
      const channelData = decoded.getChannelData(0);
      rawDataCache.set(fileId, channelData);
      downloadPromises.delete(fileId);
      return { buffer: decoded, channelData };
    }).catch((err) => {
      ctx.close();
      debugLog('decode FAILED: ' + fileId + ' err=' + err.message);
      throw err;
    });
  }).catch((err) => {
    debugLog('getAudioData FAILED: ' + fileId + ' err=' + err.message);
    throw err;
  });
}

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

  const [loadFailed, setLoadFailed] = useState(false);

  // Load raw audio data
  useEffect(() => {
    if (!fileId || !projectId) return;
    if (rawDataCache.has(fileId)) { setRawData(rawDataCache.get(fileId)!); return; }

    let cancelled = false;

    getAudioData(projectId, fileId)
      .then(({ channelData }) => {
        if (!cancelled) setRawData(channelData);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => { cancelled = true; };
  }, [fileId, projectId]);

  // Generate fake audio-like data from seed (also used as fallback when load fails)
  const fakeData = useMemo(() => {
    if (rawData) return null;
    if (fileId && projectId && !loadFailed) return null;
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
  }, [seed, rawData, fileId, projectId, loadFailed]);

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
    ctx.fillStyle = '#000000';
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

function FullMixDropZone({ projectId, onFilesAdded, isBeat }: { projectId: string; onFilesAdded: () => void; isBeat?: boolean }) {
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
      className={`rounded-xl overflow-hidden transition-all ${
        dragOver ? 'bg-ghost-green/[0.04] border border-ghost-green/30 shadow-glow-green' : 'glass-subtle'
      }`}
    >
      <div className={`h-[72px] relative overflow-hidden rounded-xl transition-colors ${dragOver ? 'bg-ghost-green/[0.04]' : 'bg-black/20'}`}>
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
          <Waveform seed="fullmix-demo-placeholder" height={72} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-3 px-5">
          {uploading ? (
            <span className="text-[13px] text-ghost-green animate-pulse">{status}</span>
          ) : status ? (
            <span className="text-[13px] text-ghost-green">{status}</span>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00FFC8' : 'rgba(192,132,252,0.8)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className={`text-[14px] font-semibold ${dragOver ? 'text-ghost-green' : 'text-purple-300'}`}>Drag audio files here</span>
              <div className="flex-1" />
              <button
                onClick={handleBrowse}
                className="flex items-center justify-center gap-1.5 w-[110px] h-9 text-[14px] font-semibold bg-purple-600 border border-purple-500 rounded-lg text-white hover:bg-purple-500 transition-all shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function StemRow({
  name, type, onDelete, onRename, fileId, projectId, trackId, createdAt,
}: {
  name: string; type: string;
  onDelete: () => void;
  onRename: (newName: string) => void;
  fileId?: string | null; projectId?: string; trackId: string;
  createdAt?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const downloadUrl = fileId && projectId ? api.getDirectDownloadUrl(projectId, fileId) : null;

  // Poll the audioBufferCache until the Waveform child populates it
  const [ready, setReady] = useState(fileId ? audioBufferCache.has(fileId) : false);
  useEffect(() => {
    if (!fileId || ready) return;
    const id = setInterval(() => {
      if (audioBufferCache.has(fileId)) { setReady(true); clearInterval(id); }
    }, 200);
    return () => clearInterval(id);
  }, [fileId, ready]);

  const handlePlay = () => {
    if (isPlaying && sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
      setIsPlaying(false);
      return;
    }
    const buffer = fileId ? audioBufferCache.get(fileId) : null;
    if (!buffer) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => { setIsPlaying(false); sourceRef.current = null; };
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
  };

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

  const dragTriggeredRef = useRef(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!downloadUrl) return;
    e.dataTransfer.clearData();
    e.dataTransfer.effectAllowed = 'none';
    e.dataTransfer.dropEffect = 'none';
    if (dragTriggeredRef.current) return;
    dragTriggeredRef.current = true;
    setTimeout(() => { dragTriggeredRef.current = false; }, 2000);
    const ghostUrl = `ghost://drag-to-daw?url=${encodeURIComponent(downloadUrl)}&fileName=${encodeURIComponent(name + '.wav')}`;
    window.location.href = ghostUrl;
  };

  return (
    <div
      draggable={!!fileId}
      onDragStart={handleDragStart}
      className={`flex items-center bg-ghost-surface border border-ghost-border rounded-lg overflow-hidden h-[72px] ${fileId ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Waveform full width with overlay controls */}
      <div className="flex-1 h-full overflow-hidden bg-ghost-bg relative">
        <Waveform seed={name + type} height={72} fileId={fileId} projectId={projectId} showPlayhead trackId={trackId} />
        {/* Play button overlay */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handlePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isPlaying
                ? 'bg-ghost-green/20 text-ghost-green'
                : ready
                  ? 'bg-black/40 text-white hover:text-ghost-green hover:bg-black/60'
                  : 'bg-black/30 text-ghost-text-muted opacity-40'
            }`}
            disabled={!ready}
          >
            {isPlaying ? (
              <svg width="10" height="10" viewBox="0 0 12 14" fill="currentColor">
                <rect x="0" y="0" width="4" height="14" rx="1" />
                <rect x="8" y="0" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
            )}
          </button>
        </div>
        {/* Name overlay */}
        <div className="absolute left-12 top-1 z-10">
          {editing ? (
            <input
              autoFocus
              className="text-xs font-semibold text-white bg-black/50 border border-ghost-green/50 rounded px-1 py-0.5 outline-none focus:border-ghost-green"
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
              className="text-[11px] font-semibold text-white/90 truncate cursor-pointer hover:text-ghost-green transition-colors drop-shadow-md"
              onClick={() => { setEditName(name); setEditing(true); }}
              title="Click to rename"
            >
              {name}
            </p>
          )}
          <p className="text-[9px] text-white/50 uppercase">{type === 'audio' ? 'stem' : type === 'fullmix' ? 'mix' : type}</p>
        </div>
        {/* Time overlay */}
        {createdAt && (
          <div className="absolute left-12 bottom-1 z-10">
            <p className="text-[10px] text-ghost-green font-medium drop-shadow-md" title={new Date(createdAt).toLocaleString()}>
              {formatDate(createdAt)}
            </p>
          </div>
        )}
        {/* Action buttons overlay */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          <button
            onClick={handleDownload}
            title="Download"
            className="w-9 h-9 rounded-lg bg-black/50 text-white/80 hover:text-ghost-green hover:bg-black/70 transition-colors flex items-center justify-center backdrop-blur-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-lg bg-black/50 text-white/80 hover:text-ghost-error-red hover:bg-black/70 transition-colors flex items-center justify-center backdrop-blur-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
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
    <div className="h-14 bg-ghost-surface flex flex-col shrink-0">
      {/* Seek bar */}
      <div
        className="h-1 bg-ghost-bg cursor-pointer hover:h-2 transition-all group"
        onClick={handleSeek}
      >
        <div className="h-full bg-ghost-green group-hover:bg-ghost-green" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center px-4 gap-3">
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isPlaying
              ? 'bg-ghost-green text-black'
              : 'bg-ghost-surface-hover text-ghost-text-secondary hover:bg-ghost-surface-hover hover:text-white'
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
          className="w-8 h-8 rounded-full bg-ghost-surface-hover flex items-center justify-center text-ghost-text-secondary hover:text-white transition-colors"
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

function SamplePackContentView({
  pack,
  onRenamePack,
  onDeletePack,
  onRemoveSample,
  onRefresh,
  members,
  onInvite,
}: {
  pack: SamplePack & { items?: any[] };
  onRenamePack: (id: string, name: string) => void;
  onDeletePack: (id: string) => void;
  onRemoveSample: (packId: string, itemId: string) => void;
  onRefresh: (id: string) => void;
  members: { userId: string; displayName: string; role: string; avatarUrl?: string | null }[];
  onInvite: () => void;
}) {
  const items = pack.items || [];
  const [packDragOver, setPackDragOver] = useState(false);
  const [packUploading, setPackUploading] = useState(false);
  const [showPackMenu, setShowPackMenu] = useState(false);
  const packMenuRef = useRef<HTMLDivElement>(null);
  const [packStatus, setPackStatus] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (packMenuRef.current && !packMenuRef.current.contains(e.target as Node)) {
        setShowPackMenu(false);
      }
    };
    if (showPackMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPackMenu]);

  const handlePackDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setPackDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a|aac)$/i)
    );
    if (droppedFiles.length === 0) {
      setPackStatus('No audio files detected');
      setTimeout(() => setPackStatus(''), 2000);
      return;
    }
    setPackUploading(true);
    setPackStatus(`Uploading ${droppedFiles.length} file(s)...`);
    try {
      for (const file of droppedFiles) {
        const { fileId } = await api.uploadFile(pack.id, file);
        const sampleName = file.name.replace(/\.[^.]+$/, '');
        await api.addSamplePackItem(pack.id, { name: sampleName, fileId });
      }
      setPackStatus(`Added ${droppedFiles.length} sample(s)`);
      onRefresh(pack.id);
    } catch (err: any) {
      setPackStatus(err.message || 'Upload failed');
    } finally {
      setPackUploading(false);
      setTimeout(() => setPackStatus(''), 3000);
    }
  };

  const handlePackBrowse = () => {
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
        handlePackDrop(fakeEvent);
      }
    };
    input.click();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {/* Pack info bar */}
        <div className="mb-4">
          <div className="flex items-center gap-3 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 px-5 py-3 min-w-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5865F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <input
              className="text-[15px] font-bold text-white bg-transparent border-none outline-none hover:bg-ghost-surface-hover px-2 py-1 rounded-lg transition-colors min-w-[60px] flex-1"
              value={pack.name}
              onChange={(e) => onRenamePack(pack.id, e.target.value)}
            />
            <span className="text-[12px] text-ghost-text-muted shrink-0">{items.length} sample{items.length !== 1 ? 's' : ''}</span>
            {pack.updatedAt && (
              <>
                <div className="w-px h-4 bg-ghost-border shrink-0" />
                <span className="text-[12px] text-ghost-text-muted flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-ghost-green font-medium">
                    {new Date(pack.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </span>
              </>
            )}
            {/* Three-dot menu */}
            <div className="relative" ref={packMenuRef}>
              <button
                onClick={() => setShowPackMenu(!showPackMenu)}
                className="w-6 h-6 flex items-center justify-center rounded text-ghost-text-muted hover:text-white hover:bg-ghost-surface-hover transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showPackMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 border border-white/5 py-1">
                  <button
                    onClick={() => {
                      if (confirm('Delete this sample pack? This cannot be undone.')) {
                        onDeletePack(pack.id);
                      }
                      setShowPackMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Pack
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project info bar */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 glass-subtle px-5 py-3 min-w-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00FFC8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <input
                      className="text-[15px] font-bold text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-ghost-green/30 px-2 py-1 rounded-md transition-colors min-w-[60px] flex-1 cursor-text"
                      value={projectName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjectName(val);
                        if (projectNameTimer.current) clearTimeout(projectNameTimer.current);
                        projectNameTimer.current = setTimeout(() => {
                          if (val.trim()) updateProject(currentProject.id, { name: val });
                        }, 500);
                      }}
                      onBlur={() => {
                        if (projectNameTimer.current) clearTimeout(projectNameTimer.current);
                        if (projectName.trim() && projectName !== currentProject.name) {
                          updateProject(currentProject.id, { name: projectName });
                        }
                      }}
                    />
                    <span className="text-[12px] text-ghost-text-muted uppercase tracking-wider font-semibold shrink-0">BPM</span>
                    {editingField === 'tempo' ? (
                      <input
                        autoFocus
                        type="number"
                        className="w-14 text-[14px] font-bold text-white bg-ghost-surface-hover px-1.5 py-0.5 rounded border border-ghost-green/50 outline-none shrink-0"
                        style={{ fontFamily: "'Consolas', monospace" }}
                        defaultValue={currentProject.tempo || ''}
                        placeholder="___"
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) updateProject(currentProject.id, { tempo: val });
                          setEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingField('tempo')}
                        className="text-[14px] font-bold text-white shrink-0 cursor-pointer hover:text-ghost-green transition-colors"
                        style={{ fontFamily: "'Consolas', monospace" }}
                      >{currentProject.tempo || '___'}</span>
                    )}
                    <div className="w-px h-4 bg-ghost-border shrink-0" />
                    <span className="text-[12px] text-ghost-text-muted uppercase tracking-wider font-semibold shrink-0">Key</span>
                    {editingField === 'key' ? (
                      <input
                        autoFocus
                        className="w-12 text-[14px] font-bold text-white bg-ghost-surface-hover px-1.5 py-0.5 rounded border border-ghost-green/50 outline-none shrink-0"
                        style={{ fontFamily: "'Consolas', monospace" }}
                        defaultValue={currentProject.key || ''}
                        placeholder="_"
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val) updateProject(currentProject.id, { key: val });
                          setEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingField('key')}
                        className="text-[14px] font-bold text-white shrink-0 cursor-pointer hover:text-ghost-green transition-colors"
                        style={{ fontFamily: "'Consolas', monospace" }}
                      >{currentProject.key || '_'}</span>
                    )}
                    {currentProject.updatedAt && (
                      <>
                        <div className="w-px h-4 bg-ghost-border shrink-0" />
                        <span className="text-[11px] text-ghost-text-muted flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span className="text-ghost-green font-medium">
                            {new Date(currentProject.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </span>
                      </>
                    )}
                    {/* Project menu — far right */}
                    <div className="relative" ref={projectMenuRef}>
                      <button
                        onClick={() => setShowProjectMenu(!showProjectMenu)}
                        className="w-6 h-6 flex items-center justify-center rounded text-ghost-text-muted hover:text-white hover:bg-ghost-surface-hover transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {showProjectMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 border border-white/5 py-1">
                          <button
                            onClick={handleShareProject}
                            className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-text-secondary hover:bg-ghost-surface-hover hover:text-white transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                              <polyline points="16 6 12 2 8 6" />
                              <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                            Share to Feed
                          </button>
                          <button
                            onClick={() => { setShowProjectMenu(false); setShowInvite(true); }}
                            className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-text-secondary hover:bg-ghost-surface-hover hover:text-white transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Invite Collaborator
                          </button>
                          <div className="h-px bg-white/5 mx-2 my-1" />
                          {currentProject.ownerId === user?.id ? (
                            <button
                              onClick={handleDeleteProject}
                              className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete Project
                            </button>
                          ) : (
                            <button
                              onClick={handleLeaveProject}
                              className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                              </svg>
                              Leave Project
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collaborators bar */}
        {(() => {
          const { user } = useAuthStore.getState();
          const displayMembers = members.length > 0 ? members : user ? [{ userId: user.id, displayName: user.displayName, role: 'owner', avatarUrl: user.avatarUrl }] : [];
          return displayMembers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-4 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 px-5 py-3">
                <div className="flex items-center -space-x-2.5">
                  {[...displayMembers].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any) => (
                    <div key={m.userId} className="relative group cursor-pointer transition-transform hover:scale-110 hover:z-10" title={m.displayName} style={{ border: '3px solid #0F0F18', borderRadius: '50%' }}>
                      <Avatar name={m.displayName || '?'} src={m.avatarUrl} size="md" colour={m.role === 'owner' ? '#F0B232' : '#23A559'} />
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ghost-online-green" style={{ border: '2.5px solid #0F0F18' }} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    {[...displayMembers].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any, i: number) => (
                      <span key={m.userId} className="flex items-center gap-1">
                        <span className={`text-[14px] ${m.role === 'owner' ? 'font-bold text-ghost-host-gold' : 'font-medium text-ghost-text-primary'}`}>{m.displayName}</span>
                        {m.role === 'owner' && <span className="text-[10px] font-bold uppercase tracking-wider text-ghost-host-gold/70 bg-ghost-host-gold/10 px-1.5 py-px rounded">host</span>}
                        {i < displayMembers.length - 1 && <span className="text-ghost-text-muted/40 mx-0.5">/</span>}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ghost-online-green animate-pulse" />
                    <span className="text-[14px] text-ghost-text-muted">{displayMembers.length} collaborator{displayMembers.length !== 1 ? 's' : ''} online</span>
                  </div>
                </div>

                <button
                  onClick={onInvite}
                  className="shrink-0 px-4 py-1.5 text-[14px] font-bold bg-ghost-green text-black rounded-lg hover:bg-ghost-green/85 transition-colors"
                >
                  Invite
                </button>

              </div>
            </div>
          );
        })()}

        {/* Samples drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setPackDragOver(true); }}
          onDragLeave={() => setPackDragOver(false)}
          onDrop={handlePackDrop}
          className={`rounded-xl overflow-hidden transition-all ${
            packDragOver ? 'bg-ghost-green/[0.04] border border-ghost-green/30 shadow-glow-green' : 'glass-subtle'
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button className="w-7 h-7 rounded-full bg-ghost-surface-hover/60 flex items-center justify-center text-ghost-text-muted hover:text-ghost-green transition-colors">
              <svg width="9" height="11" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
            </button>
            <span className="text-[11px] font-semibold text-ghost-text-muted/80 uppercase tracking-[0.1em]">Samples</span>
            <div className="flex-1" />
          </div>
          <div className={`h-[72px] relative overflow-hidden transition-colors ${packDragOver ? 'bg-ghost-green/5' : 'bg-ghost-bg/50'}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <Waveform seed="samplepack-demo-placeholder" height={72} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-3 px-5">
              {packUploading ? (
                <span className="text-[13px] text-ghost-green animate-pulse">{packStatus}</span>
              ) : packStatus ? (
                <span className="text-[13px] text-ghost-green">{packStatus}</span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={packDragOver ? '#00FFC8' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={`text-[14px] font-semibold ${packDragOver ? 'text-ghost-green' : 'text-purple-300'}`}>Drag audio files here</span>
                  <div className="flex-1" />
                  <button
                    onClick={handlePackBrowse}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-white/5 border border-white/10 rounded-lg text-ghost-text-secondary hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
                  >
                    + Add File
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sample rows */}
        <div className="space-y-2 mt-2">
          {items.map((sample: any) => (
            <StemRow
              key={sample.id}
              trackId={sample.id}
              name={sample.name}
              type="audio"
              fileId={sample.fileId}
              projectId={pack.id}
              onDelete={() => onRemoveSample(pack.id, sample.id)}
              onRename={() => {}}
            />
          ))}
        </div>
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
      className={`rounded-xl overflow-hidden transition-all ${
        dragOver ? 'bg-ghost-green/[0.04] border border-ghost-green/30 shadow-glow-green' : 'glass-subtle'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-ghost-text-muted hover:text-ghost-green hover:bg-ghost-green/10 transition-all">
          <svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
        </button>
        <span className="text-[12px] font-semibold text-white/50 uppercase tracking-[0.1em]">Stems</span>
        <div className="flex-1" />
      </div>
      <div className={`h-[68px] relative overflow-hidden transition-colors ${dragOver ? 'bg-ghost-green/[0.03]' : 'bg-black/20'}`}>
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <Waveform seed="stems-demo-placeholder" height={68} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-3 px-5">
          {uploading ? (
            <span className="text-[13px] text-ghost-green animate-pulse">{status}</span>
          ) : status ? (
            <span className="text-[13px] text-ghost-green">{status}</span>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00FFC8' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className={`text-[13px] ${dragOver ? 'text-ghost-green font-medium' : 'text-white/30'}`}>Drop your stems here</span>
              <div className="flex-1" />
              <button
                onClick={handleBrowse}
                className="flex items-center justify-center gap-1.5 w-[110px] h-9 text-[14px] font-semibold bg-purple-600 border border-purple-500 rounded-lg text-white hover:bg-purple-500 transition-all shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SocialAudioPlayer({ audioFileId }: { audioFileId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [waveData, setWaveData] = useState<Float32Array | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${API_BASE}/social/audio/${audioFileId}`;
    const token = localStorage.getItem('ghost_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(buf => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf.slice(0)).then(decoded => { ctx.close(); return decoded; });
      })
      .then(decoded => {
        if (cancelled) return;
        bufferRef.current = decoded;
        setWaveData(decoded.getChannelData(0));
        setReady(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [audioFileId]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !waveData) return;
    const draw = () => {
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
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      const mid = h / 2;
      const spp = waveData.length / w;
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const r = Math.round(0x00 + (0x8B - 0x00) * t);
        const g = Math.round(0xFF + (0x5C - 0xFF) * t);
        const b = Math.round(0xC8 + (0xF6 - 0xC8) * t);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        let max = 0;
        const start = Math.floor(x * spp);
        const end = Math.min(Math.floor((x + 1) * spp), waveData.length);
        for (let j = start; j < end; j++) { const abs = Math.abs(waveData[j]); if (abs > max) max = abs; }
        const peakH = max * mid * 0.84;
        if (peakH > 0.5) ctx.fillRect(x, mid - peakH, 1, peakH * 2);
      }
    };
    draw();
    const obs = new ResizeObserver(draw);
    obs.observe(container);
    return () => obs.disconnect();
  }, [waveData]);

  const handlePlay = () => {
    if (isPlaying && sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
      setIsPlaying(false);
      return;
    }
    if (!bufferRef.current) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(ctx.destination);
    source.onended = () => { setIsPlaying(false); sourceRef.current = null; };
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden flex items-center h-[60px] bg-[#0a0a14]">
      <button
        onClick={handlePlay}
        disabled={!ready}
        className={`w-12 h-full flex items-center justify-center shrink-0 border-r border-purple-500/20 transition-colors ${
          isPlaying ? 'bg-purple-500/20 text-purple-300' : ready ? 'hover:bg-purple-500/10 text-purple-400' : 'text-white/20'
        }`}
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14" rx="1" /><rect x="8" y="0" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
        )}
      </button>
      <div ref={containerRef} className="flex-1 h-full overflow-hidden">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
}

function SocialFeed({ user, friends }: { user: any; friends: any[] }) {
  const [tab, setTab] = useState<'feed' | 'explore' | 'activity'>('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [dropDragOver, setDropDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exploreUsers, setExploreUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('ghost_token')}` };
  const BASE = `${API_BASE}/social`;

  const loadFeed = () => { setLoading(true); fetch(`${BASE}/feed`, { headers: authHeader }).then(r => r.json()).then(d => { if (d.data) setPosts(d.data); }).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { loadFeed(); }, []);
  const loadExplore = () => { fetch(`${BASE}/explore`, { headers: authHeader }).then(r => r.json()).then(d => { if (d.data) setExploreUsers(d.data); }).catch(() => {}); };
  const loadActivity = () => { fetch(`${BASE}/activity`, { headers: authHeader }).then(r => r.json()).then(d => { if (d.data) setActivities(d.data); }).catch(() => {}); };
  const loadProfile = (userId: string) => { fetch(`${BASE}/profile/${userId}`, { headers: authHeader }).then(r => r.json()).then(d => { if (d.data) setProfileUser(d.data); }).catch(() => {}); };

  const handlePost = async () => {
    if (!newPost.trim() && !dropFile) return;
    setUploading(true);
    try {
      let audioUrl = null;
      let fileName = null;
      if (dropFile) {
        // Upload the file to a temporary "shared" project
        const formData = new FormData();
        formData.append('file', dropFile);
        // Use a special shared uploads endpoint or reuse existing
        const uploadRes = await fetch(`${API_BASE}/social/upload`, {
          method: 'POST', headers: authHeader, body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.data) {
          audioUrl = uploadData.data.fileId;
          fileName = dropFile.name;
        }
      }
      const text = newPost.trim() || (fileName ? `🎵 ${fileName.replace(/\.[^.]+$/, '')}` : '');
      const res = await fetch(`${BASE}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ text, audioFileId: audioUrl }),
      });
      const d = await res.json();
      if (d.data) { if (fileName) d.data.audioFileName = fileName; setPosts(prev => [d.data, ...prev]); }
      setNewPost(''); setDropFile(null);
    } catch {}
    setUploading(false);
  };
  const toggleLike = async (postId: string) => {
    await fetch(`${BASE}/posts/${postId}/like`, { method: 'POST', headers: authHeader });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 } : p));
  };
  const addReaction = async (postId: string, emoji: string) => {
    const res = await fetch(`${BASE}/posts/${postId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ emoji }) });
    const d = await res.json();
    if (d.data) setPosts(prev => prev.map(p => { if (p.id !== postId) return p; const rc = { ...p.reactionCounts }; const ur = [...(p.userReactions || [])]; if (d.data.reacted) { rc[emoji] = (rc[emoji] || 0) + 1; ur.push(emoji); } else { rc[emoji] = Math.max(0, (rc[emoji] || 0) - 1); if (!rc[emoji]) delete rc[emoji]; const i = ur.indexOf(emoji); if (i >= 0) ur.splice(i, 1); } return { ...p, reactionCounts: rc, userReactions: ur }; }));
  };
  const toggleFollow = async (userId: string) => {
    const res = await fetch(`${BASE}/follow/${userId}`, { method: 'POST', headers: authHeader }); const d = await res.json();
    if (d.data) { setExploreUsers(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: d.data.following } : u)); if (profileUser?.id === userId) setProfileUser({ ...profileUser, isFollowing: d.data.following }); }
  };
  const toggleComments = async (postId: string) => {
    const next = new Set(expandedComments); if (next.has(postId)) { next.delete(postId); } else { next.add(postId); if (!postComments[postId]) { const res = await fetch(`${BASE}/posts/${postId}/comments`, { headers: authHeader }); const d = await res.json(); if (d.data) setPostComments(prev => ({ ...prev, [postId]: d.data })); } } setExpandedComments(next);
  };
  const submitComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim(); if (!text) return;
    const res = await fetch(`${BASE}/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ text }) });
    const d = await res.json(); if (d.data) { setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), d.data] })); setCommentTexts(prev => ({ ...prev, [postId]: '' })); setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)); }
  };

  const REACTIONS = ['❤️', '🔥'];

  const renderPost = (post: any) => (
    <div key={post.id} className="bg-[#1a1a2e]/80 rounded-2xl border border-white/5 p-4 hover:border-white/10 transition-all">
      {/* Author row */}
      <div className="flex items-center gap-3 mb-2">
        <div className="cursor-pointer hover:scale-105 transition-transform" onClick={() => { setProfileUser(null); loadProfile(post.userId); }}>
          <Avatar name={post.displayName || '?'} src={post.avatarUrl} size="md" />
        </div>
        <div className="flex-1">
          <span className="text-[15px] font-bold text-white cursor-pointer hover:text-purple-400 transition-colors" onClick={() => { setProfileUser(null); loadProfile(post.userId); }}>{post.displayName}</span>
          <p className="text-[12px] text-white/30">{new Date(post.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
        </div>
      </div>

      {/* Post text */}
      <p className="text-[15px] text-white/85 leading-relaxed whitespace-pre-wrap">{post.text}</p>

      {/* Audio waveform */}
      {post.audioFileId && (
        <div className="mt-4 rounded-xl overflow-hidden">
          <SocialAudioPlayer audioFileId={post.audioFileId} />
        </div>
      )}

      {/* Shared project card */}
      {post.projectName && (
        <div className="mt-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-xl border border-purple-500/20 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B794F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-white truncate">{post.projectName}</p>
            <p className="text-[12px] text-purple-300/50">Shared project</p>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5">
        <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5 ${post.liked ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          {post.likeCount > 0 ? post.likeCount : 'Like'}
        </button>
        <button onClick={() => addReaction(post.id, '🔥')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5 ${post.userReactions?.includes('🔥') ? 'text-orange-400' : 'text-white/40 hover:text-orange-400'}`}>
          🔥 {(post.reactionCounts?.['🔥'] || 0) > 0 ? post.reactionCounts['🔥'] : ''}
        </button>
        <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5 ${expandedComments.has(post.id) ? 'text-purple-400' : 'text-white/40 hover:text-purple-400'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          {post.commentCount > 0 ? post.commentCount : 'Comment'}
        </button>
      </div>

      {/* Comments section */}
      {expandedComments.has(post.id) && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          {(postComments[post.id] || []).map((c: any) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.displayName || '?'} src={c.avatarUrl} size="sm" />
              <div className="bg-white/5 rounded-xl px-3.5 py-2.5 flex-1">
                <span className="text-[12px] font-bold text-white">{c.displayName}</span>
                <p className="text-[13px] text-white/70 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={commentTexts[post.id] || ''} onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') submitComment(post.id); }} placeholder="Write a comment..." className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none border border-white/5 focus:border-purple-500/30 transition-colors" />
            <button onClick={() => submitComment(post.id)} className="px-4 py-2 rounded-xl text-[12px] font-bold bg-purple-500 text-white hover:bg-purple-400 transition-colors">Send</button>
          </div>
        </div>
      )}
    </div>
  );

  if (profileUser) return (
    <div className="flex-1 flex flex-col min-h-0"><div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
      <button onClick={() => setProfileUser(null)} className="text-[13px] text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>Back</button>
      <div className="bg-ghost-surface rounded-xl border border-ghost-border/30 p-6 mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={profileUser.displayName} src={profileUser.avatarUrl} size="lg" />
          <div className="flex-1"><h2 className="text-xl font-bold text-white">{profileUser.displayName}</h2><p className="text-[12px] text-white/40 mt-0.5">Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <div className="flex gap-4 mt-2 text-[13px]"><span className="text-white/60"><span className="font-bold text-white">{profileUser.followerCount}</span> followers</span><span className="text-white/60"><span className="font-bold text-white">{profileUser.followingCount}</span> following</span><span className="text-white/60"><span className="font-bold text-white">{profileUser.postCount}</span> posts</span></div>
          </div>
          {profileUser.id !== user?.id && <button onClick={() => toggleFollow(profileUser.id)} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${profileUser.isFollowing ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400' : 'bg-purple-500 text-white hover:bg-purple-600'}`}>{profileUser.isFollowing ? 'Unfollow' : 'Follow'}</button>}
        </div>
      </div>
      <h3 className="text-[14px] font-bold text-white/50 uppercase tracking-wider mb-3">Posts</h3>
      <div className="space-y-4">{(profileUser.posts || []).map(renderPost)}{(!profileUser.posts || profileUser.posts.length === 0) && <p className="text-[13px] text-white/30 italic text-center py-8">No posts yet</p>}</div>
    </div></div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-2 px-6 pt-3 pb-2">{(['feed', 'explore', 'activity'] as const).map(t => (
        <button key={t} onClick={() => { setTab(t); if (t === 'explore') loadExplore(); if (t === 'activity') loadActivity(); }}
          className={`px-5 py-2 rounded-xl text-[14px] font-bold transition-all capitalize ${tab === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'text-white/35 hover:text-white/60 hover:bg-white/5 border border-transparent'}`}>{t}</button>
      ))}</div>
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-3">
        {tab === 'feed' && (<>
          <div
            className={`bg-ghost-surface/60 rounded-xl border px-4 py-3 mb-4 transition-all ${dropDragOver ? 'border-purple-400/60 bg-purple-500/5' : 'border-white/[0.06]'}`}
            onDragOver={(e) => { e.preventDefault(); setDropDragOver(true); }}
            onDragLeave={() => setDropDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDropDragOver(false);
              const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a)$/i));
              if (file) setDropFile(file);
            }}
          ><div className="flex items-start gap-3"><Avatar name={user?.displayName || '?'} src={user?.avatarUrl} size="md" /><div className="flex-1">
            <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="What are you working on?" className="w-full bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none resize-none min-h-[36px]" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }} />
            {dropFile && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B794F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                <span className="text-[13px] text-purple-300 flex-1 truncate">{dropFile.name}</span>
                <button onClick={() => setDropFile(null)} className="text-white/30 hover:text-white text-xs">X</button>
              </div>
            )}
            {!dropFile && (
              <p className="text-[16px] text-white/30 mt-1 font-medium">Drag & drop a sample or beat to share</p>
            )}
            <div className="flex justify-end mt-2"><button onClick={handlePost} disabled={(!newPost.trim() && !dropFile) || uploading} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{uploading ? 'Uploading...' : 'Post'}</button></div>
          </div></div></div>
          {loading ? <div className="text-center text-white/30 py-12">Loading...</div> : posts.length === 0 ? (
            <div className="text-center py-16"><div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B794F6" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div><p className="text-[16px] text-white font-semibold">No posts yet</p><p className="text-[13px] text-white/40 mt-1">Share what you're working on</p></div>
          ) : <div className="space-y-3">{posts.map(renderPost)}</div>}
        </>)}
        {tab === 'explore' && (<div className="space-y-3"><p className="text-[13px] text-white/40 mb-4">Discover producers</p>{exploreUsers.map(u => (
          <div key={u.id} className="bg-ghost-surface rounded-xl border border-ghost-border/30 p-4 flex items-center gap-4">
            <div className="cursor-pointer" onClick={() => loadProfile(u.id)}><Avatar name={u.displayName} src={u.avatarUrl} size="md" /></div>
            <div className="flex-1 min-w-0"><span className="text-[14px] font-semibold text-white cursor-pointer hover:text-purple-400 transition-colors" onClick={() => loadProfile(u.id)}>{u.displayName}</span><p className="text-[12px] text-white/30">{u.followerCount} followers &middot; {u.postCount} posts</p></div>
            <button onClick={() => toggleFollow(u.id)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${u.isFollowing ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400' : 'bg-purple-500 text-white hover:bg-purple-600'}`}>{u.isFollowing ? 'Following' : 'Follow'}</button>
          </div>
        ))}{exploreUsers.length === 0 && <p className="text-center text-white/30 py-12 italic">No users to discover</p>}</div>)}
        {tab === 'activity' && (<div className="space-y-2"><p className="text-[13px] text-white/40 mb-4">Recent activity</p>{activities.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-ghost-surface rounded-lg border border-ghost-border/30">
            <Avatar name={a.displayName || '?'} src={a.avatarUrl} size="sm" />
            <div className="flex-1 min-w-0"><p className="text-[13px] text-white/80"><span className="font-semibold text-white">{a.displayName}</span> {a.message}</p><p className="text-[11px] text-white/30">{new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p></div>
            {a.type === 'upload' && <span className="text-[10px] font-bold text-ghost-green bg-ghost-green/10 px-2 py-0.5 rounded uppercase">Upload</span>}
          </div>
        ))}{activities.length === 0 && <p className="text-center text-white/30 py-12 italic">No recent activity</p>}</div>)}
      </div>
    </div>
  );
}

export default function PluginLayout() {
  const { user, logout } = useAuthStore();
  const { projects, currentProject, fetchProjects, fetchProject, createProject, updateProject, addTrack, updateTrack, deleteTrack, versions, fetchVersions } = useProjectStore();
  const { join, leave } = useSessionStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSocial, setShowSocial] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const prevViewRef = useRef<{ projectId: string | null; packId: string | null }>({ projectId: null, packId: null });
  const [shareStatus, setShareStatus] = useState('');
  const [isBeatView, setIsBeatView] = useState(false);

  const handleCreateBeat = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('ghost_token')}` },
        body: JSON.stringify({ name: 'Untitled', projectType: 'beat' }),
      });
      const d = await res.json();
      if (d.data) {
        await fetchProjects();
        selectProject(d.data.id);
      }
    } catch {}
  };
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const friendSearchRef = useRef<HTMLDivElement>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [chatNotifications, setChatNotifications] = useState<Notification[]>([]);
  const [friends, setFriends] = useState<{ id: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [samplePacks, setSamplePacks] = useState<SamplePack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<(SamplePack & { items?: any[] }) | null>(null);
  const fullMixTracks = currentProject?.tracks.filter((t: any) => t.type === 'fullmix') || [];
  const [editingField, setEditingField] = useState<'name' | 'tempo' | 'key' | 'genre' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [reverting, setReverting] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const [projectName, setProjectName] = useState('');
  const projectNameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSamplePacks = async () => {
    try {
      const packs = await api.listSamplePacks();
      setSamplePacks(packs.map((p: any) => ({ id: p.id, name: p.name, samples: [], updatedAt: p.updatedAt })));
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setChatNotifications(notifs);
    } catch {}
  };

  useEffect(() => {
    fetchProjects();
    fetchInvitations();
    fetchNotifications();
    fetchSamplePacks();
    api.listUsers().then(setFriends).catch(() => {});
    const pollInterval = setInterval(() => {
      fetchInvitations();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Real-time polling: refresh project data every 3 seconds
  useEffect(() => {
    if (!selectedProjectId) return;
    const poll = setInterval(() => {
      fetchProject(selectedProjectId);
      fetchVersions(selectedProjectId);
      fetchNotifications();
    }, 3000);
    return () => clearInterval(poll);
  }, [selectedProjectId]);

  // Sync project name local state
  useEffect(() => {
    if (currentProject) setProjectName(currentProject.name);
  }, [currentProject?.id, currentProject?.name]);

  // Friend search — debounced query against user list
  useEffect(() => {
    if (!friendSearchQuery.trim()) { setFriendSearchResults([]); return; }
    const q = friendSearchQuery.toLowerCase();
    const matches = friends.filter(
      (f) => f.displayName.toLowerCase().includes(q) || (f as any).email?.toLowerCase().includes(q)
    );
    if (matches.length > 0) { setFriendSearchResults(matches as any); return; }
    // Fallback: search all users from API
    const timer = setTimeout(() => {
      api.listUsers().then((users) => {
        const filtered = users.filter(
          (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
        setFriendSearchResults(filtered);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [friendSearchQuery, friends]);

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      selectProject(projects[0].id);
    }
  }, [projects]);

  const audioCleanup = useAudioStore((s) => s.cleanup);

  const selectProject = async (id: string) => {
    if (selectedProjectId) { leave(); audioCleanup(); }
    // Handle "New Beat" — create a new project for the beat
    if (id === '__beats__') {
      const p = await createProject({ name: 'Untitled', projectType: 'beat' } as any);
      await fetchProjects();
      setSelectedProjectId(p.id);
      setSelectedPackId(null);
      setShowSocial(false);
      setIsBeatView(true);
      fetchProject(p.id);
      return;
    }
    setSelectedProjectId(id);
    setSelectedPackId(null);
    setShowSocial(false);
    setShowMarketplace(false);
    const proj = projects.find((p: any) => p.id === id);
    setIsBeatView(proj?.projectType === 'beat');
    fetchProject(id);
    fetchVersions(id);
    join(id);
  };

  const handleRevert = async (versionId: string) => {
    if (!selectedProjectId || reverting) return;
    setReverting(true);
    try {
      await api.revertToVersion(selectedProjectId, versionId);
      await fetchProject(selectedProjectId);
      await fetchVersions(selectedProjectId);
    } catch (err: any) {
      console.error('Revert failed:', err);
    } finally {
      setReverting(false);
    }
  };

  // Close project menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        const portalMenu = document.querySelector('[data-project-menu-portal]');
        if (portalMenu && portalMenu.contains(target)) return;
        setShowProjectMenu(false);
      }
    };
    if (showProjectMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProjectMenu]);

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await api.deleteProject(selectedProjectId);
      leave();
      audioCleanup();
      setSelectedProjectId(null);
      setShowProjectMenu(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
      setShowProjectMenu(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Leave this project? You will need a new invite to rejoin.')) return;
    try {
      await api.leaveProject(selectedProjectId);
      leave();
      audioCleanup();
      setSelectedProjectId(null);
      setShowProjectMenu(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to leave project');
      setShowProjectMenu(false);
    }
  };

  const handleShareProject = async () => {
    if (!selectedProjectId || !currentProject) return;
    setShowProjectMenu(false);
    try {
      await fetch(`${API_BASE}/social/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('ghost_token')}` },
        body: JSON.stringify({ text: `Check out my project "${currentProject.name}" 🎵`, projectId: selectedProjectId }),
      });
      setShareStatus('Shared to feed!');
      setTimeout(() => setShareStatus(''), 3000);
    } catch { setShareStatus('Failed to share'); setTimeout(() => setShareStatus(''), 3000); }
  };

  const handleCreate = async () => {
    const p = await createProject({ name: 'Untitled' });
    await fetchProjects();
    selectProject(p.id);
  };

  const handleCreatePack = async () => {
    try {
      const pack = await api.createSamplePack({ name: 'New Pack' });
      await fetchSamplePacks();
      setSelectedPackId(pack.id);
      setSelectedProjectId(null);
      fetchPackDetail(pack.id);
    } catch {}
  };

  const fetchPackDetail = async (id: string) => {
    try {
      const detail = await api.getSamplePack(id);
      setSelectedPack(detail);
    } catch {}
  };

  const handleSelectPack = (id: string) => {
    setSelectedPackId(id);
    setSelectedProjectId(null);
    if (selectedProjectId) { leave(); audioCleanup(); }
    fetchPackDetail(id);
  };

  const handleRenamePack = async (id: string, name: string) => {
    setSamplePacks((prev) => prev.map((sp) => sp.id === id ? { ...sp, name } : sp));
    setSelectedPack((prev) => prev && prev.id === id ? { ...prev, name } : prev);
    try { await api.updateSamplePack(id, { name }); } catch {}
  };

  const handleDeletePack = async (id: string) => {
    try {
      await api.deleteSamplePack(id);
      setSamplePacks((prev) => prev.filter((sp) => sp.id !== id));
      if (selectedPackId === id) { setSelectedPackId(null); setSelectedPack(null); }
    } catch {}
  };

  const handleAddSampleToPack = async (packId: string, sample: { name: string; fileId?: string }) => {
    try {
      await api.addSamplePackItem(packId, { name: sample.name, fileId: sample.fileId });
      fetchPackDetail(packId);
    } catch {}
  };

  const handleRemoveSampleFromPack = async (packId: string, itemId: string) => {
    try {
      await api.removeSamplePackItem(packId, itemId);
      fetchPackDetail(packId);
    } catch {}
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch(
        API_BASE + '/invitations',
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token}` } }
      );
      const json = await res.json();
      if (json.data) setInvitations(json.data);
    } catch {}
  };

  const acceptInvite = async (id: string) => {
    try {
      await fetch(
        API_BASE + `/invitations/${id}/accept`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` }, body: '{}' }
      );
      fetchInvitations();
      fetchProjects();
    } catch {}
  };

  const declineInvite = async (id: string) => {
    try {
      await fetch(
        API_BASE + `/invitations/${id}/decline`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` }, body: '{}' }
      );
      fetchInvitations();
    } catch {}
  };

  const members = currentProject?.members || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden relative p-2 gap-2">
      {/* Left sidebar */}
      <div className="w-[210px] shrink-0 glass glass-glow flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col">
          <ProjectListSidebar
            projects={projects.filter((p: any) => p.projectType !== 'beat')}
            allProjects={projects}
            selectedId={selectedProjectId}
            onSelect={selectProject}
            onCreate={handleCreate}
            onCreateBeat={handleCreateBeat}
            samplePacks={samplePacks}
            selectedPackId={selectedPackId}
            onSelectPack={handleSelectPack}
            onCreatePack={handleCreatePack}
            friends={friends}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center shrink-0 relative h-14 gap-2">
          <div className="flex-1 flex items-center px-4 gap-3 glass glass-glow rounded-2xl h-11 min-w-0">
            {/* Social button */}
            <button
              onClick={() => {
                if (!showSocial) {
                  prevViewRef.current = { projectId: selectedProjectId, packId: selectedPackId };
                  setSelectedProjectId(null); setSelectedPackId(null); setShowSocial(true);
                } else {
                  setShowSocial(false);
                  const prev = prevViewRef.current;
                  if (prev.projectId) selectProject(prev.projectId);
                  else if (prev.packId) { setSelectedPackId(prev.packId); }
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-[12px] transition-all whitespace-nowrap shrink-0 bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25 hover:border-purple-500/30 active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={showSocial ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Social
            </button>
            {/* Marketplace button */}
            <button
              onClick={() => { setShowMarketplace(!showMarketplace); if (!showMarketplace) { setShowSocial(false); setSelectedProjectId(null); setSelectedPackId(null); } }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-[12px] transition-all whitespace-nowrap shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/30 active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Marketplace
            </button>
            {/* Search bar — always visible */}
            <div ref={friendSearchRef} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={friendSearchQuery}
                  onChange={(e) => { setFriendSearchQuery(e.target.value); if (!showFriendSearch) setShowFriendSearch(true); }}
                  onFocus={() => setShowFriendSearch(true)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setShowFriendSearch(false); setFriendSearchQuery(''); (e.target as HTMLInputElement).blur(); } }}
                  placeholder="Search"
                  className="w-full h-9 pl-9 pr-3 rounded-lg glass-subtle text-[13px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/15 transition-all"
                />
                {friendSearchQuery.trim() && showFriendSearch && (
                  <div className="absolute left-0 right-0 top-full mt-1 glass rounded-lg shadow-popup z-50 max-h-48 overflow-y-auto">
                    {friendSearchResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-[13px] text-ghost-text-muted">No users found</p>
                    ) : (
                      friendSearchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setShowFriendSearch(false); setFriendSearchQuery(''); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-ghost-purple/30 flex items-center justify-center text-[11px] font-bold text-ghost-purple shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              u.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-[13px] text-ghost-text-primary font-medium truncate">{u.displayName}</span>
                            <span className="text-[11px] text-ghost-text-muted truncate">{u.email}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {friendSearchQuery && (
                <button
                  onClick={() => { setShowFriendSearch(false); setFriendSearchQuery(''); }}
                  className="text-white/30 hover:text-white transition-colors shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Icons box in header */}
          <div className="w-[248px] flex items-center justify-evenly shrink-0 glass glass-glow rounded-2xl h-11">
            <button onClick={() => { setShowFriendSearch(!showFriendSearch); setFriendSearchQuery(''); }} className="text-white/40 hover:text-ghost-green transition-colors" title="Add Friend">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            </button>
            <button onClick={() => { setShowNotifs(!showNotifs); setShowSettings(false); if (!showNotifs && chatNotifications.length > 0) { api.markNotificationsRead().then(() => setChatNotifications([])).catch(() => {}); } }} className="text-white/40 hover:text-ghost-green transition-colors">
              <BellIcon count={invitations.length + chatNotifications.length} />
            </button>
            <button className="text-white/40 hover:text-ghost-green transition-colors" title="Inbox">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
            </button>
            <button onClick={() => { setShowSettings(!showSettings); setShowNotifs(false); }} className="shrink-0 rounded-full hover:ring-2 hover:ring-ghost-green/50 transition-all">
              <Avatar name={user?.displayName || '?'} src={user?.avatarUrl} size="sm" />
            </button>
          </div>

        </div>

        {/* Popups */}
        {showSettings && (
          <SettingsPopup
            user={user}
            onSignOut={() => { setShowSettings(false); logout(); }}
            onDeleteAccount={async () => { setShowSettings(false); await useAuthStore.getState().deleteAccount(); }}
            onClose={() => setShowSettings(false)}
            onProfile={() => { setShowSocial(true); setSelectedProjectId(null); setSelectedPackId(null); }}
          />
        )}
        {showNotifs && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
            <NotificationPopup
              invitations={invitations}
              onAccept={(id) => { acceptInvite(id); }}
              onDecline={(id) => { declineInvite(id); }}
              notifications={chatNotifications}
              onMarkRead={() => { api.markNotificationsRead().then(() => setChatNotifications([])).catch(() => {}); }}
            />
          </>
        )}
        {showInvite && selectedProjectId && (
          <InviteModal open={showInvite} onClose={() => setShowInvite(false)} projectId={selectedProjectId} />
        )}
        {showInvite && selectedPackId && !selectedProjectId && (
          <InviteModal open={showInvite} onClose={() => setShowInvite(false)} projectId={selectedPackId} />
        )}

        {/* Arrangement content + chat */}
        <div className="flex-1 flex min-h-0 gap-2 pb-2">
          {selectedProjectId && currentProject ? (
            <>
              <div className="flex-1 flex flex-col min-w-0 glass glass-glow rounded-2xl overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                {shareStatus && <div className="mb-3 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-[13px] text-purple-300 font-medium text-center">{shareStatus}</div>}
                {/* Project info bar */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 glass-subtle px-5 py-3 min-w-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00FFC8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <input
                      className="text-[15px] font-bold text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-ghost-green/30 px-2 py-1 rounded-md transition-colors min-w-[60px] flex-1 cursor-text"
                      value={projectName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjectName(val);
                        if (projectNameTimer.current) clearTimeout(projectNameTimer.current);
                        projectNameTimer.current = setTimeout(() => {
                          if (val.trim()) updateProject(currentProject.id, { name: val });
                        }, 500);
                      }}
                      onBlur={() => {
                        if (projectNameTimer.current) clearTimeout(projectNameTimer.current);
                        if (projectName.trim() && projectName !== currentProject.name) {
                          updateProject(currentProject.id, { name: projectName });
                        }
                      }}
                    />
                    <div className="w-px h-5 bg-white/10 shrink-0" />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-ghost-text-muted/60 uppercase tracking-wider">BPM</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        className="w-12 text-[14px] font-bold text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-ghost-green/30 px-1.5 py-1 rounded-md transition-colors text-center cursor-text"
                        style={{ fontFamily: "'Consolas', monospace" }}
                        value={currentProject.tempo || ''}
                        placeholder=""
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                          if (val) updateProject(currentProject.id, { tempo: parseInt(val) });
                        }}
                      />
                    </div>
                    <div className="w-px h-5 bg-white/10 shrink-0" />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-ghost-text-muted/60 uppercase tracking-wider">Key</span>
                      <input
                        type="text"
                        maxLength={2}
                        className="w-10 text-[14px] font-bold text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-ghost-green/30 px-1.5 py-1 rounded-md transition-colors text-center cursor-text"
                        style={{ fontFamily: "'Consolas', monospace" }}
                        value={currentProject.key || ''}
                        placeholder=""
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 2);
                          updateProject(currentProject.id, { key: val });
                        }}
                      />
                    </div>
                    {currentProject.updatedAt && (
                      <>
                        <div className="w-px h-5 bg-white/10 shrink-0" />
                        <span className="text-[13px] text-ghost-green font-medium shrink-0 whitespace-nowrap">
                          {new Date(currentProject.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </>
                    )}
                    <div className="relative z-20" ref={projectMenuRef}>
                      <button onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} className="w-8 h-8 flex items-center justify-center rounded-md text-ghost-text-muted hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                      </button>
                      {showProjectMenu && projectMenuRef.current && createPortal(
                        <div data-project-menu-portal className="fixed w-40 glass rounded-lg shadow-popup animate-popup border border-white/10 py-1" style={{ zIndex: 9999, top: (projectMenuRef.current.getBoundingClientRect().bottom || 0) + 4, left: (projectMenuRef.current.getBoundingClientRect().right || 0) - 160 }}>
                          <button onClick={handleShareProject} className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-text-secondary hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                            Share to Feed
                          </button>
                          <button onClick={() => { setShowProjectMenu(false); setShowInvite(true); }} className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-text-secondary hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                            Invite Collaborator
                          </button>
                          <div className="h-px bg-white/5 mx-2 my-1" />
                          {currentProject.ownerId === user?.id ? (
                            <button onClick={handleDeleteProject} className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              Delete Project
                            </button>
                          ) : (
                            <button onClick={handleLeaveProject} className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                              Leave Project
                            </button>
                          )}
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>

                {/* Collaborators bar */}
                <div className="mb-4">
                <div className="flex items-center gap-4 glass-subtle px-5 py-3">
                  <div className="flex items-center -space-x-2">
                    {[...members].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any) => (
                      <div key={m.userId} className="relative group cursor-pointer transition-transform hover:scale-105 hover:z-10" title={m.displayName} style={{ border: '2.5px solid #0A0A0F', borderRadius: '50%' }}>
                        <Avatar name={m.displayName || '?'} src={m.avatarUrl} size="md" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-ghost-online-green" style={{ border: '2px solid #0A0A0F' }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[...members].filter((m: any) => m.role === 'owner').map((m: any) => (
                        <span key={m.userId} className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-ghost-text-primary">{m.displayName}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-ghost-host-gold bg-ghost-host-gold/10 px-1.5 py-0.5 rounded">host</span>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ghost-online-green" />
                      <span className="text-[12px] text-ghost-text-muted">{members.length} collaborator{members.length !== 1 ? 's' : ''} online</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowVersionHistory(!showVersionHistory); if (!showVersionHistory && selectedProjectId) fetchVersions(selectedProjectId); }}
                    className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                      showVersionHistory
                        ? 'bg-ghost-purple text-white'
                        : 'bg-white/5 border border-white/10 text-ghost-text-secondary hover:text-white hover:bg-white/10'
                    }`}
                    title="Version History"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="flex items-center justify-center gap-1.5 w-[110px] h-9 text-[14px] font-semibold bg-purple-600 border border-purple-500 rounded-lg text-white hover:bg-purple-500 transition-all shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    Invite
                  </button>

                </div>
                </div>

                {/* Version History panel */}
                {showVersionHistory && (
                  <div className="mb-4 glass-subtle overflow-hidden">
                    <div className="px-4 py-2 border-b border-ghost-border/30 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-ghost-text-secondary uppercase tracking-wider">Version History</span>
                      <span className="text-[11px] text-ghost-text-muted">{versions.length} snapshot{versions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {versions.length === 0 ? (
                        <div className="px-4 py-4 text-center text-[12px] text-ghost-text-muted italic">
                          No snapshots yet — changes will be saved automatically
                        </div>
                      ) : (
                        versions.map((v: any) => (
                          <div key={v.id} className="flex items-center gap-3 px-4 py-2 border-b border-ghost-border/20 hover:bg-ghost-surface-light/30 transition-colors group">
                            {/* User avatar */}
                            <div className="shrink-0">
                              <Avatar name={v.createdByName || 'Unknown'} src={members.find((m: any) => m.userId === v.createdBy)?.avatarUrl || (v.createdBy === user?.id ? user?.avatarUrl : null)} size="sm" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-ghost-text-primary font-medium truncate">{v.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-ghost-text-muted">{v.createdByName || 'Unknown'}</span>
                                <span className="text-[11px] text-ghost-green font-medium">
                                  {new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            </div>

                            {/* Version number */}
                            <span className="text-[11px] font-mono text-ghost-purple bg-ghost-purple/10 px-2 py-0.5 rounded shrink-0">
                              V{v.versionNumber}
                            </span>

                            {/* Revert button */}
                            {(v.snapshotJson || v.snapshot) && (
                              <button
                                onClick={() => handleRevert(v.id)}
                                disabled={reverting}
                                className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold px-2 py-1 bg-ghost-surface-light border border-ghost-border rounded text-ghost-text-secondary hover:text-white hover:border-ghost-purple transition-all shrink-0"
                              >
                                {reverting ? '...' : 'Revert'}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Track slots — uploaded tracks fill from top, empty slots show drop zones */}
                <div className="space-y-2">
                  {Array.from({ length: Math.max(4, currentProject.tracks.length + 1) }).map((_, i) => {
                    const track = currentProject.tracks[i];
                    if (track) {
                      return (
                        <StemRow
                          key={track.id}
                          trackId={track.id}
                          name={track.name || track.fileName || 'Track'}
                          type={track.type || 'audio'}
                          fileId={track.fileId}
                          projectId={selectedProjectId!}
                          createdAt={track.createdAt}
                          onDelete={() => deleteTrack(selectedProjectId!, track.id)}
                          onRename={(newName) => updateTrack(selectedProjectId!, track.id, { name: newName })}
                        />
                      );
                    }
                    if (i < 4) {
                      return (
                        <div key={`drop-${i}`}>
                          <FullMixDropZone projectId={selectedProjectId!} onFilesAdded={() => fetchProject(selectedProjectId!)} isBeat={isBeatView} />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              </div>

              {/* Right panel: chat */}
              <div className="relative flex flex-col shrink-0 gap-2">
                <button
                  onClick={() => setChatCollapsed(!chatCollapsed)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-5 h-10 flex items-center justify-center rounded-full glass hover:bg-white/[0.08] transition-colors"
                  title={chatCollapsed ? 'Show chat' : 'Hide chat'}
                >
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ghost-text-muted">
                    {chatCollapsed ? <polyline points="2,1 6,6 2,11" /> : <polyline points="6,1 2,6 6,11" />}
                  </svg>
                </button>
                {!chatCollapsed && (
                  <div className="w-[248px] flex flex-col min-h-0 flex-1 overflow-hidden glass glass-glow rounded-2xl">
                    <div className="px-3 py-3 border-b border-white/[0.06] shrink-0">
                      {(() => {
                        const displayFriends = friends.length > 0 ? friends : [
                          { id: 'demo1', displayName: 'Alex Beats', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4' },
                          { id: 'demo2', displayName: 'Jay Producer', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay&backgroundColor=c0aede' },
                          { id: 'demo3', displayName: 'Kira Wave', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kira&backgroundColor=ffd5dc' },
                          { id: 'demo4', displayName: 'Rio Sound', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rio&backgroundColor=d1f4d1' },
                        ];
                        return (
                          <div className="flex items-center justify-evenly w-full">
                            {displayFriends.map((f) => (
                              <div key={f.id} className="relative group cursor-pointer hover:scale-110 transition-transform" title={f.displayName}>
                                <div className="w-10 h-10 rounded-full ring-2 ring-white/[0.08] group-hover:ring-ghost-green/40 transition-all overflow-hidden">
                                  <Avatar name={f.displayName} src={f.avatarUrl} size="md" />
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ghost-online-green border-2 border-[#0A0412]" />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <ChatPanel />
                  </div>
                )}
              </div>
            </>
          ) : selectedPackId && selectedPack ? (
            <>
              <SamplePackContentView
                pack={selectedPack}
                onRenamePack={handleRenamePack}
                onDeletePack={handleDeletePack}
                onRemoveSample={handleRemoveSampleFromPack}
                onRefresh={fetchPackDetail}
                members={members}
                onInvite={() => setShowInvite(true)}
              />
              {/* Right panel: chat */}
              <div className="relative flex flex-col shrink-0 gap-2">
                <button
                  onClick={() => setChatCollapsed(!chatCollapsed)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-5 h-10 flex items-center justify-center rounded-full glass hover:bg-white/[0.08] transition-colors"
                  title={chatCollapsed ? 'Show chat' : 'Hide chat'}
                >
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ghost-text-muted">
                    {chatCollapsed ? <polyline points="2,1 6,6 2,11" /> : <polyline points="6,1 2,6 6,11" />}
                  </svg>
                </button>
                {!chatCollapsed && (
                  <div className="w-[248px] flex flex-col min-h-0 flex-1 overflow-hidden glass glass-glow rounded-2xl">
                    <div className="px-3 py-3 border-b border-white/[0.06] shrink-0">
                      {(() => {
                        const displayFriends = friends.length > 0 ? friends : [
                          { id: 'demo1', displayName: 'Alex Beats', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4' },
                          { id: 'demo2', displayName: 'Jay Producer', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay&backgroundColor=c0aede' },
                          { id: 'demo3', displayName: 'Kira Wave', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kira&backgroundColor=ffd5dc' },
                          { id: 'demo4', displayName: 'Rio Sound', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rio&backgroundColor=d1f4d1' },
                        ];
                        return (
                          <div className="flex items-center justify-evenly w-full">
                            {displayFriends.map((f) => (
                              <div key={f.id} className="relative group cursor-pointer hover:scale-110 transition-transform" title={f.displayName}>
                                <div className="w-10 h-10 rounded-full ring-2 ring-white/[0.08] group-hover:ring-ghost-green/40 transition-all overflow-hidden">
                                  <Avatar name={f.displayName} src={f.avatarUrl} size="md" />
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ghost-online-green border-2 border-[#0A0412]" />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <ChatPanel />
                  </div>
                )}
              </div>
            </>
          ) : showSocial ? (
            <SocialFeed user={user} friends={friends} />
          ) : showMarketplace ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Marketplace</h2>
                <p className="text-[15px] text-white/40">Coming Soon</p>
                <p className="text-[13px] text-white/25 mt-2 max-w-xs mx-auto">Buy and sell beats, samples, and presets with producers around the world.</p>
              </div>
            </div>
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
