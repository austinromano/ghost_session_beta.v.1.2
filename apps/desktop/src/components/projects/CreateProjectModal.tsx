import { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useProjectStore } from '../../stores/projectStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tempo, setTempo] = useState('140');
  const [key, setKey] = useState('C');
  const [timeSig, setTimeSig] = useState('4/4');
  const createProject = useProjectStore((s) => s.createProject);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const project = await createProject({
      name,
      description,
      tempo: parseFloat(tempo),
      key,
      timeSignature: timeSig,
    });
    onClose();
    navigate(`/projects/${project.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Project Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Beat" required />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Tempo" type="number" value={tempo} onChange={(e) => setTempo(e.target.value)} />
          <Input label="Key" value={key} onChange={(e) => setKey(e.target.value)} />
          <Input label="Time Sig" value={timeSig} onChange={(e) => setTimeSig(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Modal>
  );
}
