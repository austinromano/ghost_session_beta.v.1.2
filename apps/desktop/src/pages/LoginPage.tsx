import { useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { login, register, loading, error } = useAuthStore();

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await register(email, password, displayName);
      if (!useAuthStore.getState().isAuthenticated) return;

      if (avatarFile) {
        try {
          const { avatarUrl } = await api.uploadAvatar(avatarFile);
          const user = useAuthStore.getState().user;
          if (user) {
            const updated = { ...user, avatarUrl };
            useAuthStore.setState({ user: updated });
            localStorage.setItem('ghost_user', JSON.stringify(updated));
          }
        } catch {
          // Non-critical
        }
      }
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ghost-bg">
      <div className="ghost-card p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">
            <span className="text-ghost-green">Ghost</span> Session
          </h1>
          <p className="text-sm text-ghost-text-muted mt-1">{isRegister ? 'Create your account' : 'Sign in to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-ghost-border hover:border-ghost-green transition-colors flex items-center justify-center overflow-hidden bg-ghost-surface cursor-pointer group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-text-muted group-hover:text-ghost-green transition-colors">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </button>
                <span className="text-[11px] text-ghost-text-muted">
                  {avatarPreview ? 'Click to change' : 'Add profile photo'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>

              <Input
                label="Producer Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your producer name"
                required
              />
            </>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? 'Min 8 characters' : 'Enter password'}
            required
          />

          {error && (
            <p className="text-sm text-ghost-error-red">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (isRegister ? 'Creating...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <p className="text-center text-sm text-ghost-text-muted mt-6">
          {isRegister ? 'Already have an account? ' : 'No account? '}
          <button onClick={() => setIsRegister(!isRegister)} className="text-ghost-green hover:underline">
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
