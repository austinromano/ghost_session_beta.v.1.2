interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-ghost-text-secondary font-medium">{label}</label>}
      <input className={`ghost-input ${className}`} {...props} />
    </div>
  );
}
