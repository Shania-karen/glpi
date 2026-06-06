import { Modal } from "../templates";

export default function Detail({ element,onClose } ){
    return (
        <Modal
        open={true}
        onClose={onClose}
        title={`Détails de ${element.name}`}
        >
            <Modal.Body className="max-h-[70vh] overflow-y-auto">
                <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(element, null, 2)}</pre>
            </Modal.Body>
            <Modal.Footer>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Fermer</button>
            </Modal.Footer>
        </Modal>
    );

}