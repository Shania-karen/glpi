/**
 * Textarea — Styled multi-line input
 * @param {boolean} [error]
 * Accepts all native <textarea> props (onChange, rows, etc.)
 */
export default function Textarea({ error = false, className = '', ...rest }) {
  return (
    <textarea
      className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-black placeholder:text-neutral-400 resize-y min-h-[80px] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 ${
        error
          ? 'border-black'
          : 'border-neutral-300 focus:border-neutral-500'
      } ${className}`}
      {...rest}
    />
  );
}
