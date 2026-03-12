interface BadgeProps {
  children: React.ReactNode;
  colour?: string;
  variant?: 'solid' | 'outline';
}

export default function Badge({ children, colour = '#00FFC8', variant = 'solid' }: BadgeProps) {
  if (variant === 'outline') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border"
        style={{ borderColor: colour + '60', color: colour }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
      style={{ backgroundColor: colour + '20', color: colour }}
    >
      {children}
    </span>
  );
}
