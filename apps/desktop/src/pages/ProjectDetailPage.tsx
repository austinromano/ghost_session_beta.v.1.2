import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useSessionStore } from '../stores/sessionStore';
import TrackRow from '../components/session/TrackRow';
import ChatPanel from '../components/session/ChatPanel';
import CommentThread from '../components/comments/CommentThread';
import VersionRow from '../components/versions/VersionRow';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';

type Tab = 'tracks' | 'comments' | 'versions' | 'members';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentProject, fetchProject, versions, comments,
    fetchVersions, fetchComments, addTrack, updateTrack, deleteTrack,
    addComment, deleteComment, createVersion,
  } = useProjectStore();
  const { join, leave } = useSessionStore();
  const [tab, setTab] = useState<Tab>('tracks');
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [trackType, setTrackType] = useState('audio');
  const [commentText, setCommentText] = useState('');
  const [showVersion, setShowVersion] = useState(false);
  const [versionName, setVersionName] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchProject(id);
    fetchVersions(id);
    fetchComments(id);
    join(id);
    return () => { leave(); };
  }, [id]);

  if (!currentProject) return <p className="text-ghost-text-muted">Loading...</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tracks', label: 'Tracks' },
    { key: 'comments', label: 'Comments' },
    { key: 'versions', label: 'Versions' },
    { key: 'members', label: 'Members' },
  ];

  return (
    <div className="flex gap-6 h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-ghost-text-primary">{currentProject.name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge colour="#42A5F5">{currentProject.tempo} BPM</Badge>
              <Badge colour="#8B5CF6">{currentProject.key}</Badge>
              <Badge colour="#555570" variant="outline">{currentProject.timeSignature}</Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-ghost-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'text-ghost-green border-ghost-green'
                  : 'text-ghost-text-muted border-transparent hover:text-ghost-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'tracks' && (
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={() => setShowAddTrack(true)}>+ Add Track</Button>
            </div>
            {currentProject.tracks.length === 0 ? (
              <div className="ghost-card p-8 text-center text-ghost-text-muted text-sm">
                No tracks yet — add one to get started
              </div>
            ) : (
              currentProject.tracks.map((t) => (
                <TrackRow
                  key={t.id}
                  track={t as any}
                  onMute={(tid, m) => updateTrack(id!, tid, { muted: m })}
                  onSolo={(tid, s) => updateTrack(id!, tid, { soloed: s })}
                  onDelete={(tid) => deleteTrack(id!, tid)}
                />
              ))
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className="ghost-input flex-1 text-sm"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    addComment(id!, { text: commentText.trim() });
                    setCommentText('');
                  }
                }}
              />
              <Button size="sm" onClick={() => {
                if (commentText.trim()) {
                  addComment(id!, { text: commentText.trim() });
                  setCommentText('');
                }
              }}>
                Post
              </Button>
            </div>
            {comments.map((c) => (
              <CommentThread key={c.id} comment={c} onDelete={(cid) => deleteComment(id!, cid)} />
            ))}
          </div>
        )}

        {tab === 'versions' && (
          <div className="space-y-3">
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={() => setShowVersion(true)}>+ Save Version</Button>
            </div>
            {versions.map((v) => (
              <VersionRow key={v.id} version={v} />
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-2">
            {currentProject.members.map((m) => (
              <div key={m.userId} className="ghost-card p-3 flex items-center gap-3">
                <Avatar name={m.displayName} src={m.avatarUrl} />
                <div>
                  <p className="text-sm font-semibold text-ghost-text-primary">{m.displayName}</p>
                  <Badge colour={m.role === 'owner' ? '#FFD700' : '#00FFC8'}>{m.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar: chat */}
      <div className="w-72 shrink-0 hidden xl:block">
        <ChatPanel />
      </div>

      {/* Add Track Modal */}
      <Modal open={showAddTrack} onClose={() => setShowAddTrack(false)} title="Add Track">
        <form onSubmit={(e) => {
          e.preventDefault();
          addTrack(id!, { name: trackName, type: trackType as any });
          setShowAddTrack(false);
          setTrackName('');
        }} className="space-y-4">
          <Input label="Track Name" value={trackName} onChange={(e) => setTrackName(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ghost-text-secondary font-medium">Type</label>
            <select
              className="ghost-input text-sm"
              value={trackType}
              onChange={(e) => setTrackType(e.target.value)}
            >
              <option value="audio">Audio</option>
              <option value="midi">MIDI</option>
              <option value="drum">Drums</option>
              <option value="loop">Loop</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setShowAddTrack(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      {/* Save Version Modal */}
      <Modal open={showVersion} onClose={() => setShowVersion(false)} title="Save Version">
        <form onSubmit={(e) => {
          e.preventDefault();
          createVersion(id!, { name: versionName });
          setShowVersion(false);
          setVersionName('');
        }} className="space-y-4">
          <Input label="Version Name" value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="e.g. Rough Mix v2" required />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setShowVersion(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
