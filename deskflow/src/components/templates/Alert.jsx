/**
 * Alert — Notification banner
 * @param {function} [onClose] — if provided, show close button
 * Accepts all native <div> props.
 */
export default function Alert({ onClose, className = '', children, ...rest }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 text-sm rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 ${className}`}
      role="alert"
      {...rest}
    >
      <span className="flex-1">{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 text-neutral-400 hover:text-black transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          x
        </button>
      )}
    </div>
  );
}
