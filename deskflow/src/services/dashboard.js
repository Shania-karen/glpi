import { fetchGlpiData, fetchDataAPIRest } from "./apiClient";

export async function getElements() {
    let elements = [];
    try {
        const safeFetch = async (url) => {
            try {
                return await fetchGlpiData(url);
            } catch (err) {
                console.warn(`warning fetching ${url}:`, err);
                return [];
            }
        };

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

        const [resAssets, docs, docLinks] = await Promise.all([
            safeFetch('/Assets'),
            fetchAllRest('Document'),
            fetchAllRest('Document_Item')
        ]);

        // --- DIAGNOSTIC ---
        console.log("DASHBOARD: total docs fetched:", docs?.length, "total docLinks:", docLinks?.length);
        const validDocs = Array.isArray(docs) ? docs.filter(d => d.filepath) : [];
        console.log("DASHBOARD: valid docs (with filepath):", validDocs.map(d => ({ id: d.id, name: d.name, filepath: d.filepath })));


        const docsMap = {};
        if (Array.isArray(docLinks) && Array.isArray(docs)) {
            const docsById = {};
            docs.forEach(d => {
                docsById[d.id] = d;
            });
            docLinks.forEach(link => {
                const key = `${link.itemtype}_${link.items_id}`;
                if (!docsMap[key]) docsMap[key] = [];
                const doc = docsById[link.documents_id];
                if (doc) {
                    docsMap[key].push(doc);
                }
            });
        }

        console.log("DASHBOARD: docsMap keys:", Object.keys(docsMap));

        const standardAssets = [
            { itemtype: 'Computer', name: 'Ordinateurs' },
            { itemtype: 'Monitor', name: 'Moniteurs' },      
            { itemtype: 'Phone', name: 'Téléphones' }    
        ];

        const assets = standardAssets.map(std =>
            {const found = resAssets.find(a => a.itemType === std.itemtype);
            return  found ? { ...found, ...std} : std;
        });
        const assetsTable = await Promise.all(assets.map(async asset => {
            const items = await fetchAllRest(`${asset.itemtype}?expand_dropdowns=true`) || [];
            const mappedItems = items.map(item => {
                const key = `${asset.itemtype}_${item.id}`;
                return {
                    ...item,
                    _documents: docsMap[key] || []
                };
            });
            return {
                ...asset,
                itemName: asset.itemtype,
                allItems: mappedItems
            };
        }));

        elements = assetsTable;
    } catch (error) {
        console.log('Erreur: ' + error)
    }
    return elements;
}
