export const generateDurationOptions = () => {
  const options = [{ label: '-----', value: 0 }];
  for (let h = 0; h <= 23; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 0 && m === 0) continue;
      options.push({ label: `${h}h${m.toString().padStart(2, '0')}`, value: h * 3600 + m * 60 });
    }
  }
  options.push({ label: '1 jour', value: 86400 });
  return options;
};

export const initialFormData = {
  date: '', type: 1, itilcategories_id: '', status: 1,
  requesttypes_id: 1, urgency: 3, impact: 3, priority: 3,
  actiontime: 0, external_id: '', name: '', content: '',
  _users_id_requester: '', _users_id_observer: '', _users_id_assign: '', items_id: ''
};