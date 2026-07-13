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
    
    // Sinchronizuojame virtualią kategoriją sąrašo pradžioje
    if (!categories.some(c => c.ID === 'all')) {
      categories.unshift({ Name: 'Visi filmai', Description: 'Pilnas visų kolekcijoje esančių filmų sąrašas.', ID: 'all' });
    }
    
    let currentCat = categories.find(c => String(c.ID) === String(catId));

    if (currentCat) {
      titleEl.textContent = currentCat.Name;
      descEl.textContent = currentCat.Description || '';
    } else {
      titleEl.textContent = 'Kategorija';
    }

    // 5 PUNKTAS: Kategorijų puslapio navigacijos valdymas (No loop)
    setupCategoryNavigation(categories, currentCat);

    const rawMovies = await fetchAPI('getMovies');
    
    // Front-end sanitizacija: tuščias grafas paverčiame į 0 kategoriją
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

    // 7 PUNKTAS: Išsitraukiame peržiūrėtų filmų sąrašą iš sesijos atminties
    const viewedMovies = JSON.parse(sessionStorage.getItem('viewed_movies') || '[]');

    container.innerHTML = '';
    catMovies.forEach(m => {
      const a = document.createElement('a');
      a.href = `movie.html?id=${m.ID}&category=${catId}`;
      
      // Jeigu filmo ID yra sesijos atmintyje, pridedame papildomą klasę .movie-viewed
      const isViewed = viewedMovies.includes(String(m.ID));
      a.className = isViewed ? 'card movie-viewed' : 'card';
      
      let dubCode = m.Dubbing ? m.Dubbing.split(',')[0].trim().toLowerCase() : '';
      let flagBg = (dubCode && dubCode !== '-') ? `<img src="images/logos/flag_${dubCode}.svg" class="card-bg-flag" onerror="this.style.display='none'">` : '';
      
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
          <div class="list-title">${m.OriginalTitle || ''}</div>
          <div class="list-title-lt">${m.LithuanianTitle || ''}</div>
          <div class="list-meta">${subHtml}${genreYear}</div>
        </div>
      `;
      container.appendChild(a);
    });
  } catch (e) {
    container.classList.add('hidden');
    document.getElementById('error-message').classList.remove('hidden');
  }
}

function setupCategoryNavigation(categories, currentCat) {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  if(!btnPrev || !btnNext || !currentCat) return;

  const currentIndex = categories.findIndex(c => String(c.ID) === String(currentCat.ID));

  if (currentIndex > 0) {
    btnPrev.disabled = false;
    btnPrev.onclick = () => window.location.href = `category.html?id=${categories[currentIndex - 1].ID}`;
  } else {
    btnPrev.disabled = true;
  }

  if (currentIndex < categories.length - 1 && currentIndex !== -1) {
    btnNext.disabled = false;
    btnNext.onclick = () => window.location.href = `category.html?id=${categories[currentIndex + 1].ID}`;
  } else {
    btnNext.disabled = true;
  }
}

init();
