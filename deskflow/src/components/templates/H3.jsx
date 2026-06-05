export default function H3({ className = '', children, ...rest }) {
  return (
    <h3 className={`text-lg font-semibold text-black ${className}`} {...rest}>
      {children}
    </h3>
  );
}
