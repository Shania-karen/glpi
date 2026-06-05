export default function P({ className = '', children, ...rest }) {
  return (
    <p className={`text-sm leading-relaxed text-neutral-600 ${className}`} {...rest}>
      {children}
    </p>
  );
}
