export default function Tr({ className = '', children, ...rest }) {
  return (
    <tr
      className={`border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors duration-100 ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}
