import type { Comment } from '@ghost/types';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';

interface CommentThreadProps {
  comment: Comment;
  onDelete?: (id: string) => void;
}

export default function CommentThread({ comment, onDelete }: CommentThreadProps) {
  const positionLabel = comment.positionBeats != null
    ? `Bar ${Math.floor(comment.positionBeats / 4) + 1}, Beat ${(comment.positionBeats % 4) + 1}`
    : null;

  return (
    <div className="ghost-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Avatar name={comment.authorName} src={comment.authorAvatarUrl} size="sm" />
        <span className="text-sm font-semibold text-ghost-text-primary">{comment.authorName}</span>
        <span className="text-[10px] text-ghost-text-muted ml-auto">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>

      {positionLabel && <Badge colour="#00FFC8" variant="outline">{positionLabel}</Badge>}

      <p className="text-sm text-ghost-text-primary">{comment.text}</p>

      {onDelete && (
        <button
          onClick={() => onDelete(comment.id)}
          className="text-[10px] text-ghost-text-muted hover:text-ghost-error-red"
        >
          Delete
        </button>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 space-y-2 border-l border-ghost-border pl-3">
          {comment.replies.map((r) => (
            <CommentThread key={r.id} comment={r} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
