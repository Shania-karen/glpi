import { useState , useEffect} from 'react';
import { fetchGlpiData, fetchDataAPIRest } from '../services/apiClient';

const fetchAllRest = async (resource) => {
    const limit = 500;
    let start = 0;
    let all = [];
    const separator = resource.includes('?') ? '&' : '?';
    try {
        while (true) {
            const url = `${resource}${separator}range=${start}-${start + limit - 1}`;
            const data = await fetchDataAPIRest(url);
            if (!data || !Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < limit) break;
            start += limit;
        }
        return all;
    } catch (err) {
        console.warn(`warning fetching REST ${resource}:`, err);
        return [];
    }
};

const standardItemtypes = [
    'Computer', 'Monitor', 'NetworkEquipment', 'Peripheral', 'Phone', 'Printer',
    'Software', 'SoftwareLicense', 'Certificate', 'Unmanaged', 'Appliance',
    'Database', 'Enclosure', 'Rack', 'PassiveDCEquipment', 'CartridgeItem',
    'PDU', 'Cable', 'ConsumableItem'
];

export function useAssets(){
    const [assets, setAssets] = useState([]);
    const [ loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAssets=async()=>{
        setLoading(true);
        try{
            const lists = await Promise.all(
                standardItemtypes.map(async (type) => {
                    const items = await fetchAllRest(`${type}?expand_dropdowns=true`);
                    return items.map(item => ({
                        ...item,
                        itemtype: type,
                        _itemtype: type
                    }));
                })
            );
            setAssets(lists.flat());
        }catch(err){
            setError(err.message);
        }finally{
            setLoading(false);
        }
    };
    useEffect(()=>{ loadAssets(); },[]);

    return {assets, loading, error, loadAssets};
}