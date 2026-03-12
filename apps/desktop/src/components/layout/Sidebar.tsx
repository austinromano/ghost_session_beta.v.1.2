import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../common/Avatar';

const navItems = [
  { to: '/projects', label: 'Projects', icon: '{}' },
  { to: '/settings', label: 'Settings', icon: '*' },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="w-60 h-full bg-ghost-surface border-r border-ghost-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-ghost-border">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-ghost-green">Ghost</span>
          <span className="text-ghost-text-primary"> Session</span>
        </h1>
        <p className="text-[10px] text-ghost-text-muted mt-0.5">collaborative production</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-ghost-green/10 text-ghost-green'
                  : 'text-ghost-text-secondary hover:text-ghost-text-primary hover:bg-ghost-surface-light'
              }`
            }
          >
            <span className="text-xs font-mono w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="px-4 py-3 border-t border-ghost-border flex items-center gap-3">
          <Avatar name={user.displayName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm text-ghost-text-primary truncate">{user.displayName}</p>
            <p className="text-[10px] text-ghost-text-muted truncate">{user.email}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
