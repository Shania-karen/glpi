import { H1, P } from '../components/templates';
import { Button, Modal } from '../components/templates';
import { useState } from 'react';
import BackOfficeForm from '../components/backoffice/BackOfficeForm';
export default function Accueil() {
  const[ isModalOpen, setIsModalOpen ] = useState(false);
  const openModalForBackOffice = () => {
      setIsModalOpen(true);
    };
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <H1>Bienvenue sur DeskFlow</H1>
      <P className="mt-3 max-w-md">
        Votre outil de gestion de tickets GLPI. Selectionnez une section dans le menu pour commencer.
      </P>
       <Button variant="success" onClick={openModalForBackOffice}>Acceder BackOffice</Button> 

    {isModalOpen && (
      <BackOfficeForm onClose={() => setIsModalOpen(false)} />
      )
    }
    </div>
  );
}
