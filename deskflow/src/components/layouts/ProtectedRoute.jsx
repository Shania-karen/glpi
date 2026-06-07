import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — accessible uniquement si isBackOfficeAuth === 'true'
 * Redirige vers '/' dans le cas contraire.
 */
export default function ProtectedRoute({ children }) {
  const isAuth = sessionStorage.getItem('isBackOfficeAuth') === 'true';
  return isAuth ? children : <Navigate to="/" replace />;
}
