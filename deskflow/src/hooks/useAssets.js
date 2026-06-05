import { useState , useEffect} from 'react';
import { fetchGlpiData } from '../services/apiClient';

export function useAssets(){
    const [assets, setAssets] = useState([]);
    const [ loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAssets=async()=>{
        setLoading(true);
        try{
            const data = await fetchGlpiData('/Assets?expand_dropdowns=true');
            setAssets(data);
        }catch(err){
            setError(err.message);
        }finally{
            setLoading(false);
        }
    };
    useEffect(()=>{ loadAssets(); },[]);

    return {assets, loading, error, loadAssets};
}