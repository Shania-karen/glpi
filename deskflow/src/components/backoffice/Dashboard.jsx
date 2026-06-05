import { use, useEffect, useState } from 'react';
import { getElements } from '../../services/dashboard';
import { Card , H1} from '../templates';

export default function Dashboard() {
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getElements();
                setElements(data);
            
            } catch (error) {
                console.error("Erreur lors de la récupération:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []); 


    if (loading) {
        return <p>Chargement des données du tableau de bord...</p>;
    }
    return (
        <div>
            <h1>Tableau de bord</h1>
            <p>Total d'éléments : {elements.length}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
                {elements.map((element, index) => (
                <Card key={index} className="flex flex-col h-full">
                    <Card.Header>{element.name}</Card.Header>
                    <Card.Body className="flex-grow">
                        <H1>Type</H1>
                    </Card.Body>
                    <Card.Footer>{element.type || element.itemtype}</Card.Footer>
                </Card>
                ))}
            </div>
            
        </div>
    );
}