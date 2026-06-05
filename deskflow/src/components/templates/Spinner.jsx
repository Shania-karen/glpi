/**
 * Spinner — Loading indicator
 * @param {'sm'|'lg'} [size]
 * @param {string}    [label] — text below spinner
 */
export default function Spinner({ size = 'sm', label, className = '', ...rest }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    lg: 'w-9 h-9 border-3',
  };

  const spinner = (
    <span
      className={`inline-block rounded-full border-neutral-200 border-t-black animate-spin ${sizes[size] || sizes.sm} ${className}`}
      {...rest}
    />
  );

  if (label) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-neutral-500">
        {spinner}
        <span>{label}</span>
      </div>
    );
  }

  return spinner;
}
