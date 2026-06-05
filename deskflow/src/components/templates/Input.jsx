/**
 * Input — Styled text input
 * @param {boolean} [error] — dark border for validation
 * Accepts all native <input> props (onChange, value, placeholder, type, etc.)
 */
export default function Input({ error = false, className = '', ...rest }) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-black placeholder:text-neutral-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 ${
        error
          ? 'border-black'
          : 'border-neutral-300 focus:border-neutral-500'
      } ${className}`}
      {...rest}
    />
  );
}
