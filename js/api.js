const API_URL = 'https://script.google.com/macros/s/AKfycbw8TrNM5laiDoJE77pF7PMVIdOtlUhYyFJvUq5A_0HCHCDI5v__YkNCwyUMOh-Teu3c/exec';

export async function fetchAPI(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  const cacheKey = `cache_${action}_${new URLSearchParams(params).toString()}`;
  // Pridėtas getConfig, kad svetainės nustatymai taip pat būtų saugomi naršyklės atmintyje
  const useCache = ['getConfig', 'getCategories', 'getMovies', 'getMovie'].includes(action);
  
  if (useCache) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Klaida');
    const data = await res.json();
    
    if (useCache && !data.error) {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }
    return data;
  } catch (error) {
    const errMsg = document.getElementById('error-message');
    if(errMsg) errMsg.classList.remove('hidden');
    throw error;
  }
}

export async function postAPI(payload) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    alert('Klaida siunčiant duomenis');
  }
}

export function handleImageError(imgElement) {
  imgElement.onerror = null;
  imgElement.src = 'images/mov_0000.png';
}
