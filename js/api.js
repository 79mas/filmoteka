const API_URL = 'https://script.google.com/macros/s/AKfycbzXqzOYaVhbg2SEGAVk-Bwo4hDNqNUNyAo2whemrCjgf5x-rn9pxSnWEyKFcxLMbSYB/exec';

export async function fetchAPI(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Klaida');
    return await res.json();
  } catch (error) {
    document.getElementById('error-message').classList.remove('hidden');
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
  imgElement.src = 'images/placeholder.png';
}
