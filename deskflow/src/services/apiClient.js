export const BASE_URL = '/api-glpi/apirest.php'; 
export const APP_TOKEN = 'RlEaH5TceSTvlhGuEsWOH3Be1bHAtYQS2rVE7fKKP'; 
export const USER_TOKEN = 'RlEaH5TceSTvlhGuEsWOH3Be1bHAtYQS2rVE7flK';
export const TEMP_SESSION_TOKEN = 'amdFdStuTVdKamkrd1Vpd05qNTRDMUZuZ3ZjS3cxU0JVUGhDZTQrZUxuSFgweXFaQkh0dit2WDNLcGFsSDhUSVoyRFh3bURzb3lUTE1jVFRHSWJWUDN0Vg==';

export async function fetchGlpiData(resourcePath) {
  const url = `${BASE_URL}/${resourcePath}`; 
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'App-Token': APP_TOKEN,
        'Session-Token': TEMP_SESSION_TOKEN
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur API GLPI (Statut ${response.status}) : ${errorText}`);
    }

    const jsonData = await response.json();
    return jsonData;

  } catch (error) {
    console.error(`Erreur GET sur ${resourcePath} :`, error);
    throw error;
  }
}
