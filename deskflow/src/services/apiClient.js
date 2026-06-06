import axios from 'axios';

export const BASE_URL = '/api-glpi/api.php/v2.3';
export const API_REST_URL = '/api-glpi/apirest.php';
export const TOKEN_URL = '/api-glpi/api.php/token'; 
export const APP_TOKEN = 'RlEaH5TceSTvlhGuEsWOH3Be1bHAtYQS2rVE7fKKP'; 
export const USER_TOKEN = 'RlEaH5TceSTvlhGuEsWOH3Be1bHAtYQS2rVE7flK';
export const TEMP_SESSION_TOKEN = 'blFkRXVobWxnUlFiVFYwTmFaSVNPNFpyOE94VzRHMGYzMDEzblFHUUgvTHA3RjJPS3MxWU1QaEFCTlh5YVRxb0ZwdERva0pJL0ZYd005NHhZNU5TOWRtSQ==';

let currentAccessToken = null;

async function refreshAccessToken() {
  console.log("Génération d'un nouveau token GLPI...");
  
  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('client_id', '5a3243a8335e81d52438181a74ee07d3c22d78ce4bee21736fd778995b4e55f9');        
  formData.append('client_secret', 'c1783325860da338a77072b67536ca4fae3d36520f165b1b4fce337047b9b919'); 
  formData.append('scope', 'api');
  formData.append('username', 'glpi');
  formData.append('password', 'glpi');
  
  try {
    const response = await axios.post(TOKEN_URL, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    currentAccessToken = response.data.access_token; 
    return currentAccessToken;
  } catch (error) {
    throw new Error("Impossible de générer le token GLPI : " + error.message);
  }
}

export async function fetchGlpiData(resourcePath, options = {}) {
  if (!currentAccessToken) {
    await refreshAccessToken();
  }

  const axiosConfig = {
    method: options.method || 'GET',
    url: `${BASE_URL}${resourcePath}`,
    headers: {
      'App-Token': APP_TOKEN,
      'Authorization': `Bearer ${currentAccessToken}`
    },
    data: options.body 
  };
  try {
    const response = await axios(axiosConfig);
    return response.data; 
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn("Token expiré, renouvellement en cours...");
      await refreshAccessToken();
    
      axiosConfig.headers['Authorization'] = `Bearer ${currentAccessToken}`;
      const retryResponse = await axios(axiosConfig);
      return retryResponse.data;
    }
    const errorText = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Erreur API GLPI (Statut ${error.response?.status}) : ${errorText}`);
  }
}

let currentSessionToken = null;

async function initSession() {
  console.log("Initialisation d'une session GLPI (apirest)...");
  try {
    const response = await axios.get(`${API_REST_URL}/initSession`, {
      headers: {
        'App-Token': APP_TOKEN,
        'Authorization': 'Basic ' + btoa('glpi:glpi')
      }
    });
    currentSessionToken = response.data.session_token;
    return currentSessionToken;
  } catch (error) {
    throw new Error("Impossible d'initier la session GLPI : " + error.message);
  }
}

export async function fetchDataAPIRest(resourcePath, options = {}) {
  if (!currentSessionToken) {
    await initSession();
  }

  const axiosConfig = {
    method: options.method || 'GET',
    url: `${API_REST_URL}/${resourcePath}`,
    headers: {
      'Content-Type': 'application/json',
      'App-Token': APP_TOKEN,
      'Session-Token': currentSessionToken
    },
    data: options.body
  };

  try {
    const response = await axios(axiosConfig);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn("Session expirée, réinitialisation...");
      await initSession();
      axiosConfig.headers['Session-Token'] = currentSessionToken;
      const retryResponse = await axios(axiosConfig);
      return retryResponse.data;
    }

    const errorText = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Erreur API GLPI (Statut ${error.response?.status}) : ${errorText}`);
  }
}