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

        const safeFetchRest = async (resource) => {
            try {
                return await fetchDataAPIRest(resource);
            } catch (err) {
                console.warn(`warning fetching REST ${resource}:`, err);
                return [];
            }
        };

        const [resAssets, docs, docLinks] = await Promise.all([
            safeFetch('/Assets'),
            safeFetchRest('Document?range=0-1000'),
            safeFetchRest('Document_Item?range=0-1000')
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

        const assets = resAssets || [];
        const assetsTable = await Promise.all(assets.map(async asset => {
            const rawItems = await safeFetchRest(`${asset.itemtype}?expand_dropdowns=true`) || [];
            const items = Array.isArray(rawItems) ? rawItems : [];
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
