/**
 * Badge — Status pill / tag
 * @param {'default'|'dark'|'outline'|'success'|'warning'|'danger'} [variant]
 * Accepts all native <span> props.
 */
export default function Badge({ variant = 'default', className = '', children, ...rest }) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-700',
    dark:    'bg-black text-white',
    outline: 'bg-white text-neutral-700 border border-neutral-300',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-orange-100 text-orange-800',
    danger:  'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${variants[variant] || variants.default} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
