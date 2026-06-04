export const BASE_URL = '/api-glpi/api.php/v2.3';
export const API_REST_URL = '/api-glpi/apirest.php';
export const TOKEN_URL = '/api-glpi/api.php/token'; 
export const APP_TOKEN = 'RlEaH5TceSTvlhGuEsWOH3Be1bHAtYQS2rVE7fKKP'; 
export const USER_TOKEN = 'RlEaH5TceSTvlhGuEsWOH3Be1bHAtYQS2rVE7flK';
export const TEMP_SESSION_TOKEN = 'blFkRXVobWxnUlFiVFYwTmFaSVNPNFpyOE94VzRHMGYzMDEzblFHUUgvTHA3RjJPS3MxWU1QaEFCTlh5YVRxb0ZwdERva0pJL0ZYd005NHhZNU5TOWRtSQ==';

let currentAccessToken = null;
async function refreshAccessToken() {
  console.log(" Génération d'un nouveau token GLPI...");
  
  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('client_id', '5a3243a8335e81d52438181a74ee07d3c22d78ce4bee21736fd778995b4e55f9');        
  formData.append('client_secret', 'c1783325860da338a77072b67536ca4fae3d36520f165b1b4fce337047b9b919'); 
  formData.append('scope', 'api');
  formData.append('username', 'glpi');
  formData.append('password', 'glpi');
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });

  if (!response.ok) throw new Error("Impossible de générer le token GLPI");
  
  const data = await response.json();
  currentAccessToken = data.access_token; 
  return currentAccessToken;
}

export async function fetchGlpiData(resourcePath, options={}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : null;
  if (!currentAccessToken) {
    await refreshAccessToken();
  }
  const url = `${BASE_URL}/${resourcePath}`; 
  const headers= {
    'Content-Type': 'application/json',
    'App-Token': APP_TOKEN,
    'Authorization': `Bearer ${currentAccessToken}`
  };
  if( method ==='GET'){
    delete headers['Content-Type'];
  }
  const fetchOptions = { method, headers };
  if (body && method !== 'GET') {
    fetchOptions.body = body;
  }

  let response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    console.warn(" Token expiré, renouvellement en cours...");
    await refreshAccessToken();
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
    response = await fetch(url, fetchOptions);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API GLPI (Statut ${response.status}) : ${errorText}`);
  }
  const textResponse = await response.text();
  return textResponse ? JSON.parse(textResponse) : null;
}
export async function fetchDataAPIRest(resourcePath, options={}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : null;
  if (!currentAccessToken) {
    await refreshAccessToken();
  }
  const url = `${API_REST_URL}/${resourcePath}`;
  const headers= {
    'Content-Type': 'application/json',
    'App-Token': APP_TOKEN,
    'Session-Token': TEMP_SESSION_TOKEN
  };
  if( method ==='GET'){
    delete headers['Content-Type'];
  }
  const fetchOptions = { method, headers };
  if (body && method !== 'GET') {
    fetchOptions.body = body;
  }

  let response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    console.warn(" Token expiré, renouvellement en cours...");
    await refreshAccessToken();
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
    response = await fetch(url, fetchOptions);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API GLPI (Statut ${response.status}) : ${errorText}`);
  }
  const textResponse = await response.text();
  return textResponse ? JSON.parse(textResponse) : null;
}

