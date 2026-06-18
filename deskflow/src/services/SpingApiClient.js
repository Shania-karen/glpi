export async function fetchSpringData(resourcePath){
  const url = `/api/${resourcePath}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if(!response.ok){
      const errorText = await response.text();
      throw new Error(`Erreur API Spring (Statut ${response.status}) : ${errorText}`);
    }
    const jsonData = await response.json();
    console.log(`Données reçues de Spring pour ${resourcePath} :`, jsonData);
    return jsonData;
  } catch (error) {
    console.error(`Erreur GET sur ${resourcePath} :`, error);
    throw error;
  }
}

