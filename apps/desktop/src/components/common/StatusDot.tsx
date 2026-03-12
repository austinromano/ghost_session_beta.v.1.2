interface StatusDotProps {
  online: boolean;
  size?: 'sm' | 'md';
}

export default function StatusDot({ online, size = 'sm' }: StatusDotProps) {
  const px = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  return (
    <span
      className={`${px} rounded-full inline-block ${online ? 'bg-ghost-online-green' : 'bg-ghost-text-muted'}`}
    />
  );
}
