import { fetchAPI } from './api.js';

async function init() {
  const container = document.getElementById('categories-container');
  const emptyState = document.getElementById('empty-state');
  
  try {
    // Siunčiame dvi užklausas vienu metu: gauti kategorijas ir visus filmus.
    // Tai ne tik leis suskaičiuoti filmus, bet ir iškart "užkešuoti" filmų sąrašą 
    // sekantiems lankytojo paspaudimams!
    const [categories, allMovies] = await Promise.all([
      fetchAPI('getCategories'),
      fetchAPI('getMovies')
    ]);
    
    if (!categories || categories.length === 0) {
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = '';
    categories.forEach((cat, index) => {
      // Suskaičiuojame, kiek filmų priklauso šiai konkrečiai kategorijai
      const movieCount = allMovies.filter(m => String(m.Category) === String(cat.ID)).length;
      
      const a = document.createElement('a');
      a.href = `category.html?id=${cat.ID}`;
      a.className = 'card';
      
      // Pridedame .cat-count su suskaičiuotu filmų kiekiu
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
