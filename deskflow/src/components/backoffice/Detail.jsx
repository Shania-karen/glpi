export default function Detail({ element,onClose } ){
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Détails de {element.name}</h2>
                <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(element, null, 2)}</pre>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Fermer</button>
            </div>
        </div>
    );

}