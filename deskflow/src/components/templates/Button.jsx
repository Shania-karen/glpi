/**
 * Button
 * @param {'primary'|'secondary'|'ghost'|'outline'|'success'|'warning'|'danger'} [variant]
 * @param {'sm'|'md'|'lg'} [size]
 * Accepts all native <button> props (onClick, disabled, type, etc.)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400';

  const variants = {
    primary:   'bg-black text-white hover:bg-neutral-800 active:bg-neutral-900',
    secondary: 'bg-neutral-100 text-black hover:bg-neutral-200 active:bg-neutral-300',
    ghost:     'bg-transparent text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200',
    outline:   'bg-white text-black border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
    success:   'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
    warning:   'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-2.5',
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
