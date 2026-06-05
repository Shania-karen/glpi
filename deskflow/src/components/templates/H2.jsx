export default function H2({ className = '', children, ...rest }) {
  return (
    <h2 className={`text-2xl font-semibold tracking-tight text-black ${className}`} {...rest}>
      {children}
    </h2>
  );
}
