import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [downloadDir, setDownloadDir] = useState('');
  const [volume, setVolume] = useState(80);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-ghost-text-primary">Settings</h1>

      <div className="ghost-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ghost-text-secondary uppercase tracking-wider">Connection</h2>
        <Input
          label="Server URL"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:3000"
        />
        <Input
          label="Download Directory"
          value={downloadDir}
          onChange={(e) => setDownloadDir(e.target.value)}
          placeholder="/Users/you/Music/Ghost Sessions"
        />
      </div>

      <div className="ghost-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ghost-text-secondary uppercase tracking-wider">Audio</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ghost-text-secondary font-medium">Listen Volume: {volume}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="accent-ghost-green"
          />
        </div>
      </div>

      <div className="ghost-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ghost-text-secondary uppercase tracking-wider">Account</h2>
        {user && (
          <div className="text-sm text-ghost-text-primary">
            Signed in as <span className="font-semibold text-ghost-green">{user.displayName}</span> ({user.email})
          </div>
        )}
        <Button variant="danger" onClick={handleLogout}>Sign Out</Button>
      </div>
    </div>
  );
}
