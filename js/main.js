import { fetchAPI } from './api.js';

async function init() {
  const container = document.getElementById('categories-container');
  const emptyState = document.getElementById('empty-state');
  const siteTitle = document.getElementById('site-title');
  const siteDesc = document.getElementById('site-description');
  
  try {
    // Siunčiame tris užklausas vienu metu: Konfigūracija, Kategorijos, Filmai
    const [config, categories, allMovies] = await Promise.all([
      fetchAPI('getConfig'),
      fetchAPI('getCategories'),
      fetchAPI('getMovies')
    ]);
    
    // Atnaujiname svetainės pavadinimą ir aprašymą iš Google Sheets
    if (siteTitle && config.site_title) siteTitle.textContent = config.site_title;
    if (siteDesc && config.site_description) siteDesc.textContent = config.site_description;
    
    if (!categories || categories.length === 0) {
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = '';
    categories.forEach((cat, index) => {
      const movieCount = allMovies.filter(m => String(m.Category) === String(cat.ID)).length;
      
      const a = document.createElement('a');
      a.href = `category.html?id=${cat.ID}`;
      a.className = 'card';
      
      a.innerHTML = `
        <div class="cat-content">
          <h2>${cat.Name} <span class="cat-count">(${movieCount})</span></h2>
          <p>${cat.Description || ''}</p>
        </div>
      `;
      
      container.appendChild(a);
      
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
