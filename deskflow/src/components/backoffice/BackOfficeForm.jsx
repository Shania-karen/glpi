import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from '../templates';

export default function BackOfficeForm({ onClose }) {
    const [ formData, setFormData ] = useState({ value: 'motDePasse' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e)=>{
        e.preventDefault();
        if(isSubmitting) return;
        setIsSubmitting(true);
        setErrorMsg("");
        
        try{
            if(formData.value === "motDePasse"){
                // Enregistrer l'authentification dans la session
                sessionStorage.setItem('isBackOfficeAuth', 'true');
                if (onClose) onClose(); // Fermer le modal
                navigate('/backoffice'); // Redirection correcte
            }else{
                setErrorMsg("Mot de passe incorrect");
                setIsSubmitting(false);
            }
        }catch(err){
            setErrorMsg("Erreur : " + err.message);
            setIsSubmitting(false);
        }
    };

    return(
        <Modal
        title={`Acceder au BackOffice`}
        open={true}
        onClose={onClose}
    >
        <form onSubmit={handleSubmit}>
            <Modal.Body>
                {errorMsg && <p className="text-red-500 mb-2">{errorMsg}</p>}
                <input 
                  type="password" 
                  name="value" 
                  value={formData.value}
                  className="w-full border border-gray-300 rounded p-2"
                  onChange={handleChange} 
                  placeholder="Entrez le mot de passe"
                  required
                />       
            </Modal.Body>
            <Modal.Footer>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Vérification...' : 'Valider'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
    );
}
