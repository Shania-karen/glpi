import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SidebarLayout from './components/layouts/SidebarLayout';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import Accueil from './pages/Accueil';
import ExempleUI from './pages/ExempleUI';
import TicketList from './components/ticket/TicketList';
import BackOffice from './components/backoffice/BackOffice';
import ResetForm from './components/ticket/ResetForm';
import Dashboard from './components/backoffice/Dashboard';
import ImportData from './pages/backoffice/Import';
import TicketKanban from './components/ticket/TicketKanban';
import AssetList from './pages/frontoffice/AssetList';
import TicketCreate from './pages/frontoffice/TicketCreate';
import ColorManager from './pages/backoffice/ColorManager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Accueil />} />
          <Route path="tickets" element={<ProtectedRoute><TicketList /></ProtectedRoute>} />
          <Route path="tickets/new" element={<TicketCreate />} />
          <Route path="mes-elements" element={<AssetList />} />
          <Route path="exemple" element={<ExempleUI />} />
          <Route path="tickets/kanban" element={<TicketKanban />} />  
          <Route path="backoffice" element={<ProtectedRoute><BackOffice /></ProtectedRoute>} />
          <Route path="reset" element={<ProtectedRoute><ResetForm /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="backoffice/import" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
          <Route path="backoffice/colors" element={<ProtectedRoute><ColorManager /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
