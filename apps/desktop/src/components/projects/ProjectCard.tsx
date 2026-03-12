import { useNavigate } from 'react-router-dom';
import type { Project } from '@ghost/types';
import Badge from '../common/Badge';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="ghost-card p-5 text-left hover:border-ghost-green/30 transition-colors w-full group"
    >
      <h3 className="text-base font-semibold text-ghost-text-primary group-hover:text-ghost-green transition-colors truncate">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-xs text-ghost-text-muted mt-1 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Badge colour="#42A5F5">{project.tempo} BPM</Badge>
        {project.key && <Badge colour="#8B5CF6">{project.key}</Badge>}
        <Badge colour="#555570" variant="outline">{project.timeSignature}</Badge>
      </div>

      <p className="text-[10px] text-ghost-text-muted mt-3">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </p>
    </button>
  );
}
