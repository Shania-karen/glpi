import { act, useEffect, useState } from 'react';
import { getElements } from '../../services/dashboard';
import { Card ,H2,P, H3, Button} from '../templates';
import { fetchGlpiData } from '../../services/apiClient';
import Detail from './Detail';
export default function Dashboard() {
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);
    const[ sumAllItems , setSumAllItems] = useState(0);
    const [ tickets , setTickets] = useState([]);
    const [ nbTicketIncident , setNbTicketIncident] = useState(0);
    const [ nbTicketDemande , setNbTicketDemande] = useState(0);
    const [ nbTicketGeneral , setNbTicketGeneral] = useState(0);
  
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getElements();
                setSumAllItems(data.reduce((acc, element) => acc + element.allItems.length, 0));
                setElements(data);
            
            } catch (error) {
                console.error("Erreur lors de la récupération:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []); 
    const openModalForDetails = (element) => {
        setSelectedElement(element);
        setIsModalOpen(true);
    }

    useEffect(()=>{
        const loadTickets = async()=>{
            try {
                const data = await fetchGlpiData('/Assistance/Ticket?expand_dropdowns=true');
                const activeTickets = data.filter(ticket => ticket.is_deleted !== true);
                setTickets(activeTickets);
            } catch (error) {
                console.error("Erreur lors de la récupération des tickets:", error);
            }finally{
                setLoading(false);
            }
        };
        loadTickets();
    },[]);

    useEffect(()=>{
        const countTickets = ()=>{
            const incidentTickets = tickets.filter(ticket => ticket.type === 'Incident' || ticket.type === 1);
            const demandeTickets = tickets.filter(ticket => ticket.type ===  'Demande' || ticket.type === 2);
            setNbTicketIncident(incidentTickets.length);
            setNbTicketDemande(demandeTickets.length);
            setNbTicketGeneral(tickets.length);
        }
        countTickets();
    },[tickets]);

    if (loading) {
        return <p>Chargement des données du tableau de bord...</p>;
    }
    return (
        <div>
            <H2>Tableau de bord</H2>
            <p>Total d'éléments : {sumAllItems}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
                {elements.map((element, index) => (
                <Card key={index} className="flex flex-col h-full">
                    <Card.Header>{element.name}</Card.Header>
                    <Card.Body className="flex-grow flex justify-between items-center">
                        <H3>{element.allItems?.length || 0}</H3>
                    </Card.Body>
                    <Card.Footer><Button variant="outline" onClick={() => openModalForDetails(element)}>Detail</Button></Card.Footer>
                </Card>


                ))}
                {isModalOpen &&(
                    <Detail
                    element={selectedElement} 
                    onClose={()=> setIsModalOpen(false)}/>
                )}
            </div>
            <P><H2>Nombre de Tickets general </H2></P> 
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
      
                <Card className="flex flex-col h-full">
                    <Card.Header>Incidents</Card.Header>
                    <Card.Body className="flex-grow flex justify-between items-center">
                        <H3>{nbTicketIncident}</H3>
                    </Card.Body>
                    <Card.Footer>
                        <Button variant="outline" onClick={() => openModalForDetails({ name: 'Incidents', allItems: tickets.filter(t => t.type === 'Incident' || t.type === 1) })}>
                            Detail
                        </Button>
                    </Card.Footer>
                </Card>

                <Card className="flex flex-col h-full">
                    <Card.Header>Demandes</Card.Header>
                    <Card.Body className="flex-grow flex justify-between items-center">
                        <H3>{nbTicketDemande}</H3>
                    </Card.Body>
                    <Card.Footer>
                        <Button variant="outline" onClick={() => openModalForDetails({ name: 'Demandes', allItems: tickets.filter(t => t.type === 'Demande' || t.type === 2) })}>
                            Detail
                        </Button>
                    </Card.Footer>
                </Card>

            </div>
            
        </div>
    );
}