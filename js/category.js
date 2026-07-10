import { fetchAPI } from './api.js';

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const catId = urlParams.get('id');
  const container = document.getElementById('movies-container');
  const emptyState = document.getElementById('empty-state');
  const titleEl = document.getElementById('category-title');
  const descEl = document.getElementById('category-description');

  try {
    const categories = await fetchAPI('getCategories');
    
    let currentCat = categories.find(c => String(c.ID) === String(catId));
    if (catId === 'all') {
      currentCat = { Name: 'Visi filmai', Description: 'Pilnas visų kolekcijoje esančių filmų sąrašas.' };
    }

    if (currentCat) {
      titleEl.textContent = currentCat.Name;
      descEl.textContent = currentCat.Description || '';
    } else {
      titleEl.textContent = 'Kategorija';
    }

    const allMovies = await fetchAPI('getMovies');
    
    const catMovies = catId === 'all'
      ? allMovies.sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)))
      : allMovies.filter(m => String(m.Category) === String(catId)).sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)));

    if (catMovies.length === 0) {
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    container.innerHTML = '';
    catMovies.forEach(m => {
      const a = document.createElement('a');
      a.href = `movie.html?id=${m.ID}&category=${catId}`;
      a.className = 'card';
      
      let dubCode = m.Dubbing ? m.Dubbing.split(',')[0].trim().toLowerCase() : '';
      let subCode = m.Subtitles ? m.Subtitles.split(',')[0].trim().toLowerCase() : '';

      let flagBg = dubCode ? `<div class="card-bg-flag" style="background-image: url('images/logos/flag_${dubCode}.svg');"></div>` : '';
      let subHtml = subCode ? `<img src="images/logos/flag_${subCode}.svg" class="inline-flag"> subtitrai, ` : '';
      
      let genreYear = [m.Genre, m.Year].filter(Boolean).join(' ');
      
      a.innerHTML = `
        ${flagBg}
        <div class="card-content">
          <div class="list-title ellipsis">${m.OriginalTitle || ''}</div>
          <div class="list-title-lt ellipsis">${m.LithuanianTitle || ''}</div>
          <div class="list-meta ellipsis">${subHtml}${genreYear}</div>
        </div>
      `;
      container.appendChild(a);
    });
  } catch (e) {
    container.classList.add('hidden');
    document.getElementById('error-message').classList.remove('hidden');
  }
}

init();
