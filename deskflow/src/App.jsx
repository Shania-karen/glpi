import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SidebarLayout from './components/layouts/SidebarLayout';
import Accueil from './pages/Accueil';
import ExempleUI from './pages/ExempleUI';
import TicketList from './components/ticket/TicketList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Accueil />} />
          <Route path="tickets" element={<TicketList />} />
          <Route path="exemple" element={<ExempleUI />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
