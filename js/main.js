import { fetchAPI } from './api.js';

async function init() {
  const container = document.getElementById('categories-container');
  const emptyState = document.getElementById('empty-state');
  const siteTitle = document.getElementById('site-title');
  const siteDesc = document.getElementById('site-description');
  
  try {
    // 1 ŽINGSNIS: Užkrauname TIK konfigūraciją ir kategorijas (tai trunka milisekundes)
    const [config, categories] = await Promise.all([
      fetchAPI('getConfig'),
      fetchAPI('getCategories')
    ]);
    
    if (siteTitle && config.site_title) siteTitle.textContent = config.site_title;
    if (siteDesc && config.site_description) siteDesc.textContent = config.site_description;
    
    categories.unshift({
      ID: 'all',
      Name: 'Visi filmai',
      Description: 'Pilnas visų kolekcijoje esančių filmų sąrašas.'
    });

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
      
      // Laikinai rodome (...) kol fone parsiųs filmus
      a.innerHTML = `
        <div class="cat-content">
          <h2>${cat.Name} <span class="cat-count" id="count-${cat.ID}">(...)</span></h2>
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

    // 2 ŽINGSNIS: Fone atsisiunčiame VISUS filmus (nepristabdant lankytojo UI!)
    fetchAPI('getMovies').then(allMovies => {
      categories.forEach(cat => {
        const countEl = document.getElementById(`count-${cat.ID}`);
        if(countEl) {
          const movieCount = cat.ID === 'all' 
            ? allMovies.length 
            : allMovies.filter(m => String(m.Category) === String(cat.ID)).length;
          countEl.textContent = `(${movieCount})`;
        }
      });
    }).catch(err => console.log("Fonas: Nepavyko atsiųsti filmų", err));

  } catch (e) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

init();
