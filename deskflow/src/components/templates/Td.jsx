export default function Td({ className = '', children, ...rest }) {
  return (
    <td className={`px-4 py-3 text-neutral-700 ${className}`} {...rest}>
      {children}
    </td>
  );
}
