interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-ghost-green text-ghost-bg hover:bg-ghost-green/90 font-semibold',
  secondary: 'bg-ghost-surface-light text-ghost-text-primary hover:bg-ghost-surface-hover border border-ghost-border',
  danger: 'bg-ghost-error-red/10 text-ghost-error-red hover:bg-ghost-error-red/20 border border-ghost-error-red/30',
  ghost: 'text-ghost-text-secondary hover:text-ghost-text-primary hover:bg-ghost-surface-light',
};

const sizes = {
  sm: 'px-2.5 py-1 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-2.5 text-base rounded-lg',
};

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
