/**
 * FormGroup — Label + Input wrapper with error display
 * @param {string}  [label]
 * @param {boolean} [required]
 * @param {string}  [error]
 * @param {string}  [htmlFor]
 * Accepts all native <div> props.
 */
export default function FormGroup({
  label,
  required = false,
  error,
  htmlFor,
  className = '',
  children,
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} {...rest}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-black">
          {label}
          {required && <span className="ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <span className="text-xs text-neutral-500 mt-0.5">{error}</span>}
    </div>
  );
}

