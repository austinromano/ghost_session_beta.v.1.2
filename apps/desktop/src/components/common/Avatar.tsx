interface AvatarProps {
  name: string;
  src?: string | null;
  colour?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };

export default function Avatar({ name, src, colour = '#00FFC8', size = 'md' }: AvatarProps) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover border-2`}
        style={{ borderColor: colour }}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold border-2`}
      style={{ borderColor: colour, backgroundColor: colour + '20', color: colour }}
    >
      {initials}
    </div>
  );
}
