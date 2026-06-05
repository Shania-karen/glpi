import {fetchGlpiData, fetchGlpiAPI} from "./apiClient";

export async function getElements() {
    let elements = [];
    try {
        const resAssets = await fetchGlpiData('Assets');
        const assets = resAssets;
        console.log(assets)
        const assetsTable =await Promise.all(assets.map(async asset => ({
            ...asset,
            itemName: asset.itemtype,
            allItems: (await fetchGlpiAPI(asset.href)).data
        })))

        elements = assetsTable;
        console.log(elements)
    } catch (error) {
        console.log('Erreur: ' + error)
    }
    return elements;
}
