import { H1, P } from '../components/templates';

export default function Accueil() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <H1>Bienvenue sur DeskFlow</H1>
      <P className="mt-3 max-w-md">
        Votre outil de gestion de tickets GLPI. Selectionnez une section dans le menu pour commencer.
      </P>
    </div>
  );
}
