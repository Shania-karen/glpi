import { useEffect, useState } from 'react';

function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
  
    fetch('http://localhost:8081/api/users')
      .then(response => response.json())
      .then(data => setUsers(data))
      .catch(error => console.error("Erreur de connexion :", error));
  }, []); 

  return (
    <div>
      <h3>Utilisateurs de mon App</h3>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.username}</li>
        ))}
      </ul>
    </div>
  );
};
export default UserList;