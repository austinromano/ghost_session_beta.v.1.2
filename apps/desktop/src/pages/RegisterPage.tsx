import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setLocalError('Passwords do not match');
      return;
    }
    setLocalError('');
    await register(email, password, displayName);
    if (useAuthStore.getState().isAuthenticated) navigate('/projects');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ghost-bg">
      <div className="ghost-card p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">
            <span className="text-ghost-green">Ghost</span> Session
          </h1>
          <p className="text-sm text-ghost-text-muted mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Producer name"
            required
          />
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
            placeholder="Min 8 characters"
            required
            minLength={8}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            required
          />

          {(error || localError) && (
            <p className="text-sm text-ghost-error-red">{localError || error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-ghost-text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ghost-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
