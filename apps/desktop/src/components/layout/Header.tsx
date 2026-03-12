import { useSessionStore } from '../../stores/sessionStore';
import Avatar from '../common/Avatar';
import StatusDot from '../common/StatusDot';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { isConnected, onlineUsers } = useSessionStore();

  return (
    <header className="h-12 bg-ghost-surface border-b border-ghost-border flex items-center justify-between px-5">
      <h2 className="text-sm font-semibold text-ghost-text-primary">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 5).map((u) => (
                <Avatar key={u.userId} name={u.displayName} colour={u.colour} size="sm" />
              ))}
            </div>
            {onlineUsers.length > 5 && (
              <span className="text-xs text-ghost-text-muted ml-1">+{onlineUsers.length - 5}</span>
            )}
          </div>
        )}

        {/* Connection status */}
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-ghost-text-muted">
            <StatusDot online={true} />
            Live
          </div>
        )}
      </div>
    </header>
  );
}
