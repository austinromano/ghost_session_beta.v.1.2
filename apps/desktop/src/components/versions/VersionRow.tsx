import type { Version } from '@ghost/types';
import Badge from '../common/Badge';

interface VersionRowProps {
  version: Version;
}

export default function VersionRow({ version }: VersionRowProps) {
  return (
    <div className="ghost-card p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Badge colour="#00FFC8">v{version.versionNumber}</Badge>
          <span className="text-sm font-semibold text-ghost-text-primary">{version.name}</span>
        </div>
        {version.description && (
          <p className="text-xs text-ghost-text-muted mt-1">{version.description}</p>
        )}
        <p className="text-[10px] text-ghost-text-muted mt-1">
          by {version.createdByName} &middot; {new Date(version.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="text-right">
        <Badge colour="#42A5F5" variant="outline">
          {version.fileManifest.length} file{version.fileManifest.length !== 1 ? 's' : ''}
        </Badge>
      </div>
    </div>
  );
}
