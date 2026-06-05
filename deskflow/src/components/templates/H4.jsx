export default function H4({ className = '', children, ...rest }) {
  return (
    <h4 className={`text-base font-semibold text-black ${className}`} {...rest}>
      {children}
    </h4>
  );
}
