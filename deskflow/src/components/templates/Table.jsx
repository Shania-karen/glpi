export default function Table({ striped = false, className = '', children, ...rest }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
      <table
        className={`w-full text-sm text-left border-collapse ${className}`}
        data-striped={striped || undefined}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}
