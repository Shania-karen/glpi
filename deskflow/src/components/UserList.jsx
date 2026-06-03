import { useEffect, useState } from 'react';
import { fetchSpringData } from '../services/SpringApiClient';

function UserList() {
  const [users, setUsers] = useState([]);
  const [ loading, setLoading] = useState(true);
  const [ error, setError] = useState(null);

  useEffect(() => {
    const loadUsers= async ()=>{
      try {
        const data = await fetchSpringData('users');
        setUsers(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []); 

  if(loading) return <div>Chargement des utilisateurs...</div>
  if(error) return <div>Erreur : {error}</div>

  return (
    <div>
      <h3>Utilisateurs de mon App</h3>
      {
        users.length === 0 ? (
          <p>Aucun utilisateur trouvé</p>
        ) : (
          <ul>
            {users.map(user => (
              <li key={user.id}>{user.username}</li>
            ))}
          </ul>
        )
      }
    </div>
  );
};
export default UserList;