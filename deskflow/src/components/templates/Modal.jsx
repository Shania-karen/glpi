/**
 * Modal — Dialog overlay
 * @param {string}   title
 * @param {boolean}  open
 * @param {function} onClose
 * Sub-components: Modal.Body, Modal.Footer
 */
export default function Modal({ title, open, onClose, className = '', children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease]"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden animate-[slideUp_250ms_ease] ${className}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

Modal.Body = function ModalBody({ className = '', children, ...rest }) {
  return (
    <div className={`px-6 py-5 overflow-y-auto ${className}`} {...rest}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-center justify-end gap-2 px-6 py-3 border-t border-neutral-100 ${className}`} {...rest}>
      {children}
    </div>
  );
};
