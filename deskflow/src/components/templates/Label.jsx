/**
 * Label — Form label
 * @param {boolean} [required] — shows asterisk
 * Accepts all native <label> props (htmlFor, etc.)
 */
export default function Label({ required = false, className = '', children, ...rest }) {
  return (
    <label
      className={`text-sm font-medium text-black ${className}`}
      {...rest}
    >
      {children}
      {required && <span className="text-black ml-0.5">*</span>}
    </label>
  );
}
