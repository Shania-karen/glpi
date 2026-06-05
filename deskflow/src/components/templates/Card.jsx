/**
 * Card — Content container
 * @param {boolean} [hoverable]
 * Sub-components: Card.Header, Card.Body, Card.Footer
 * Accepts all native <div> props.
 */
export default function Card({ hoverable = false, className = '', children, ...rest }) {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-xl shadow-sm ${
        hoverable ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-neutral-100 ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ className = '', children, ...rest }) {
  return (
    <div className={`px-5 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100 ${className}`} {...rest}>
      {children}
    </div>
  );
};
