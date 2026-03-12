import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import ProjectCard from '../components/projects/ProjectCard';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import Button from '../components/common/Button';

export default function ProjectsPage() {
  const { projects, fetchProjects, loading } = useProjectStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ghost-text-primary">Your Projects</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Project</Button>
      </div>

      {loading && projects.length === 0 ? (
        <p className="text-ghost-text-muted text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="ghost-card p-12 text-center">
          <p className="text-ghost-text-muted mb-4">No projects yet. Start your first session.</p>
          <Button onClick={() => setShowCreate(true)}>Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
