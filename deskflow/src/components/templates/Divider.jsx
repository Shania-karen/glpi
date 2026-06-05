export default function Divider({ className = '', ...rest }) {
  return <hr className={`border-none h-px bg-neutral-200 my-6 ${className}`} {...rest} />;
}
