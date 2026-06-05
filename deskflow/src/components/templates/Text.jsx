/**
 * Text — Inline text span
 * @param {'default'|'sm'|'xs'|'muted'} [variant]
 * Accepts all native <span> props.
 */
export default function Text({ variant = 'default', className = '', children, ...rest }) {
  const variants = {
    default: 'text-sm text-neutral-600',
    sm:      'text-xs text-neutral-600',
    xs:      'text-[11px] text-neutral-500',
    muted:   'text-sm text-neutral-400',
  };

  return (
    <span className={`${variants[variant] || variants.default} ${className}`} {...rest}>
      {children}
    </span>
  );
}
