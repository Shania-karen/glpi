import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { H1, P } from '../templates';

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
      
      <div className="mt-6">
        <p>Ici vous pouvez gérer les paramètres de l'application.</p>
        <button 
          onClick={handleLogout}
          className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Se déconnecter du BackOffice
        </button>
      </div>
    </div>
  );
}
