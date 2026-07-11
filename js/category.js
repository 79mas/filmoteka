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

    const rawMovies = await fetchAPI('getMovies');
    
    // Front-end sanitizacija: paverčiame tuščias kategorijas į 0
    const allMovies = rawMovies.map(m => {
      if (m.Category === undefined || m.Category === null || String(m.Category).trim() === '') {
        m.Category = 0;
      }
      return m;
    });
    
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
      let flagBg = (dubCode && dubCode !== '-') ? `<img src="images/logos/flag_${dubCode}.svg" class="card-bg-flag" onerror="this.style.display='none'">` : '';
      
      // SUTVARKITI SUBTITRAI: Jei tuščia arba "-", nerodome nieko
      let subHtml = '';
      if (m.Subtitles && String(m.Subtitles).trim() !== '-' && String(m.Subtitles).trim() !== '') {
        const subCodes = String(m.Subtitles).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (subCodes.length > 0) {
          const flagsHtml = subCodes.map(code => `<img src="images/logos/flag_${code}.svg" class="inline-flag" onerror="this.style.display='none'">`).join('');
          subHtml = `${flagsHtml} subtitrai, `;
        }
      }
      
      const cleanGenre = (m.Genre && String(m.Genre).trim() !== '-') ? m.Genre : '';
      const cleanYear = (m.Year && String(m.Year).trim() !== '-') ? m.Year : '';
      let genreYear = [cleanGenre, cleanYear].filter(Boolean).join(' ');
      
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
