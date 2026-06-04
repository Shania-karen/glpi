export const exportTicketsToCSV = (tickets) => {
  const headers = "ID;Titre;Statut;Date;Priorité;Demandeur;Technicien;Catégorie";
  const rows = tickets.map(ticket => {
    const id = ticket.id;
    const name = ticket.name || 'Sans titre';
    const status = ticket.status?.name || ticket.status || '-';
    const date = ticket.date || '-';
    const priority = ticket.priority?.name || ticket.priority || '-';
    const requester = ticket.team?.find(t => t.role === 'requester')?.name || ticket.user_recipient?.name || '-';
    const technician = ticket.team?.find(t => t.role === 'assigned')?.name || 'Non assigné';
    const category = ticket.category?.name || 'Sans catégorie';

    return `${id};${name};${status};${date};${priority};${requester};${technician};${category}`;
  });

  const csvContent = headers + "\n" + rows.join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
 
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "export_tickets.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};