import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SidebarLayout from './components/layouts/SidebarLayout';
import Accueil from './pages/Accueil';
import ExempleUI from './pages/ExempleUI';
import TicketList from './components/ticket/TicketList';
import BackOffice from './components/backoffice/BackOffice';
import ResetForm from './components/ticket/ResetForm';
import Dashboard from './components/backoffice/Dashboard';

import AssetList from './pages/frontoffice/AssetList';
import TicketCreate from './pages/frontoffice/TicketCreate';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Accueil />} />
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/new" element={<TicketCreate />} />
          <Route path="mes-elements" element={<AssetList />} />
          <Route path="exemple" element={<ExempleUI />} />
          <Route path="backoffice" element={<BackOffice />} />
          <Route path="reset" element={<ResetForm />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
