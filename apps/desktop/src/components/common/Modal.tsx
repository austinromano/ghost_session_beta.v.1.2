interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-ghost-surface border border-ghost-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-ghost-text-primary mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
