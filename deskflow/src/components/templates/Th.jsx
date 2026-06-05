export default function Th({ className = '', children, ...rest }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-black first:rounded-tl-xl last:rounded-tr-xl ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}
