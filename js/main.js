import { fetchAPI } from './api.js';

async function init() {
  const container = document.getElementById('categories-container');
  const emptyState = document.getElementById('empty-state');
  
  try {
    const categories = await fetchAPI('getCategories');
    
    // Tuščios būsenos patikrinimas
    if (!categories || categories.length === 0) {
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = '';
    categories.forEach((cat, index) => {
      const a = document.createElement('a');
      a.href = `category.html?id=${cat.ID}`;
      a.className = 'card';
      a.innerHTML = `<h2>${cat.Name}</h2><p>${cat.Description || ''}</p>`;
      container.appendChild(a);
      
      // Pridedame vizualų atskyrimą tarp kategorijų (išskyrus po paskutinės)
      if (index < categories.length - 1) {
        const div = document.createElement('div');
        div.className = 'category-divider';
        container.appendChild(div);
      }
    });
  } catch (e) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

init();
