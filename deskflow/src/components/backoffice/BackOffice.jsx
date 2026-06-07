import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { H1, P } from '../templates';

const IconImport = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
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

      <div className="mt-6 flex flex-col gap-4">
        <p>Ici vous pouvez gérer les paramètres de l'application.</p>

        {/* ── Bouton Import ── */}
        <button
          onClick={() => navigate('/backoffice/import')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#fff',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
            width: 'fit-content',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <IconImport />
          Importer des données dans GLPI
        </button>

        <button
          onClick={handleLogout}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          style={{ width: 'fit-content' }}
        >
          Se déconnecter du BackOffice
        </button>
      </div>
    </div>
  );
}
