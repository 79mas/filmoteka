import { fetchAPI } from './api.js';

async function init() {
  const container = document.getElementById('categories-container');
  try {
    const categories = await fetchAPI('getCategories');
    container.innerHTML = '';
    categories.forEach(cat => {
      const a = document.createElement('a');
      a.href = `category.html?id=${cat.ID}`;
      a.className = 'card';
      a.innerHTML = `<h2>${cat.Name}</h2><p>${cat.Description || ''}</p>`;
      container.appendChild(a);
    });
  } catch (e) {
    container.innerHTML = '';
  }
}

init();