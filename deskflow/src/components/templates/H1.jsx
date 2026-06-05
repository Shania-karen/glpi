export default function H1({ className = '', children, ...rest }) {
  return (
    <h1 className={`text-3xl font-bold tracking-tight text-black ${className}`} {...rest}>
      {children}
    </h1>
  );
}
