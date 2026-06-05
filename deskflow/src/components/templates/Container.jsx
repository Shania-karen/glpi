export default function Container({ className = '', children, ...rest }) {
  return (
    <div className={`w-full max-w-7xl mx-auto px-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}
