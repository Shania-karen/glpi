/**
 * Select — Styled select dropdown
 * @param {boolean} [error]
 * Accepts all native <select> props (onChange, value, etc.)
 */
export default function Select({ error = false, className = '', children, ...rest }) {
  return (
    <select
      className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-black transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 ${
        error
          ? 'border-black'
          : 'border-neutral-300 focus:border-neutral-500'
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
