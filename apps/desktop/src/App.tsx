import { useAuthStore } from './stores/authStore';
import PluginLayout from './components/plugin/PluginLayout';
import LoginPage from './pages/LoginPage';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <LoginPage />;
  return <PluginLayout />;
}
