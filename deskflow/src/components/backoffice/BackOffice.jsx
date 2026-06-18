import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { H1, P , Button} from '../templates';

const IconImport = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconColor = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-2.22 1.124l-3.125 3.811a.596.596 0 00.471.983h14.688a.596.596 0 00.471-.983l-3.125-3.811a3 3 0 00-2.22-1.124H9.53z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a6 6 0 00-6 6v5a1 1 0 00.293.707l1.543 1.543A1 1 0 008.543 15h6.914a1 1 0 00.707-.293l1.543-1.543A1 1 0 0018 13V8a6 6 0 00-6-6z" />
  </svg>
);

export default function BackOffice() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isBackOfficeAuth');
    if (isAuthenticated !== 'true') {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isBackOfficeAuth');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="p-6">
      <H1>Administration du BackOffice</H1>
      <P className="mt-4 text-green-600 font-semibold border-b pb-4">
        Bienvenue dans le tableau de bord sécurisé.
      </P>

      <div className="mt-4 flex flex-col gap-3">
        <p>Ici vous pouvez gérer les paramètres de l'application.</p>

        {/* ── Bouton Import ── */}
        <Button
          onClick={() => navigate('/backoffice/import')}
          variant="outline"
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <IconImport />
          Importer des données dans GLPI
        </Button>

        {/* ── Bouton Import SQLite ── */}
        <Button
          onClick={() => navigate('/backoffice/importSqlite')}
          variant="outline"
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <IconImport />
          Importer des coûts dans SQLite (CSV)
        </Button>

        {/* ── Bouton Couleurs ── */}
        <Button
          onClick={() => navigate('/backoffice/colors')}
          variant="outline"
          type="button"
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <IconColor />
          Gérer les couleurs des statuts
        </Button>

        <Button
          onClick={handleLogout}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          style={{ width: 'fit-content' }}
        >
          Se déconnecter du BackOffice
        </Button>
      </div>
    </div>
  );
}
