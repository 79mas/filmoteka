import { fetchAPI } from './api.js';

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const catId = urlParams.get('id');
  
  const container = document.getElementById('movies-container');
  const searchContainer = document.getElementById('search-results');
  const emptyState = document.getElementById('empty-state');
  const errorMsg = document.getElementById('error-message');
  const titleEl = document.getElementById('category-title');
  const descEl = document.getElementById('category-description');
  
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  try {
    // 1. Paimame konfigūraciją iš sesijos (kurią užkrovė index.html)
    let config = JSON.parse(sessionStorage.getItem('site_config')) || {};
    
    // Pritaikome CMS tekstus
    applyConfigTexts(config);

    // 2. Užkrauname kategorijas
    const categories = await fetchAPI('getCategories');
    
    if (!categories.some(c => c.ID === 'all')) {
      categories.unshift({ 
        Name: config.text_cat_all_title || 'Visi filmai', 
        Description: config.text_cat_all_desc || 'Pilnas visų kolekcijoje esančių filmų sąrašas.', 
        ID: 'all' 
      });
    }
    
    let currentCat = categories.find(c => String(c.ID) === String(catId));

    if (currentCat) {
      titleEl.textContent = currentCat.Name;
      descEl.textContent = currentCat.Description || '';
      document.title = currentCat.Name;
    } else {
      titleEl.textContent = 'Kategorija';
    }

    // Filtruojame kategorijas, kurios išvis turi filmų (navigacijai atgal/pirmyn)
    const rawMovies = await fetchAPI('getMovies');
    
    const allMovies = rawMovies.map(m => {
      if (m.Category === undefined || m.Category === null || String(m.Category).trim() === '') {
        m.Category = 0;
      }
      return m;
    });

    const activeCategories = categories.filter(c => {
      if (c.ID === 'all') return allMovies.length > 0;
      return allMovies.filter(m => String(m.Category) === String(c.ID)).length > 0;
    });

    setupCategoryNavigation(activeCategories, currentCat);
    
    // Gauname filmus priklausančius tik šiai kategorijai
    const catMovies = catId === 'all'
      ? allMovies.sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)))
      : allMovies.filter(m => String(m.Category) === String(catId)).sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)));

    if (catMovies.length === 0) {
      container.classList.add('hidden');
      emptyState.textContent = config.text_empty_category || 'Kategorija tuščia...';
      emptyState.classList.remove('hidden');
      return;
    }

    // Piešiame standartinį kategorijos filmų sąrašą
    renderMoviesList(catMovies, container, catId);

    // 3. PAIEŠKOS LOGIKA (Filtruoja tik šioje kategorijoje esančius filmus)
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length > 0) {
        searchClear.classList.remove('hidden');
        container.classList.add('hidden');
        searchContainer.classList.remove('hidden');
        
        const results = catMovies.filter(m => {
          const searchableText = [
            m.OriginalTitle, m.LithuanianTitle, m.Director, 
            m.Screenplay, m.Composer, m.Cinematographer, m.MainActors
          ].join(' ').toLowerCase();
          return searchableText.includes(query);
        });
        
        renderSearchResults(results, searchContainer, config, catId);
      } else {
        searchClear.classList.add('hidden');
        container.classList.remove('hidden');
        searchContainer.classList.add('hidden');
      }
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      container.classList.remove('hidden');
      searchContainer.classList.add('hidden');
      searchInput.focus();
    });

  } catch (e) {
    container.classList.add('hidden');
    errorMsg.textContent = "Informacija laikinai nepasiekiama.";
    errorMsg.classList.remove('hidden');
  }
}

function applyConfigTexts(config) {
  const setTxt = (id, text) => { if(document.getElementById(id) && text) document.getElementById(id).textContent = text; };
  const setPh = (id, text) => { if(document.getElementById(id) && text) document.getElementById(id).placeholder = text; };
  
  setTxt('loading-text', config.text_loading);
  setTxt('error-message', config.text_error);
  setPh('search-input', config.text_search_ph);
}

function setupCategoryNavigation(activeCategories, currentCat) {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  if(!btnPrev || !btnNext || !currentCat) return;

  const currentIndex = activeCategories.findIndex(c => String(c.ID) === String(currentCat.ID));

  if (currentIndex > 0) {
    btnPrev.disabled = false;
    btnPrev.onclick = () => window.location.href = `category.html?id=${activeCategories[currentIndex - 1].ID}`;
  } else {
    btnPrev.disabled = true;
  }

  if (currentIndex < activeCategories.length - 1 && currentIndex !== -1) {
    btnNext.disabled = false;
    btnNext.onclick = () => window.location.href = `category.html?id=${activeCategories[currentIndex + 1].ID}`;
  } else {
    btnNext.disabled = true;
  }
}

function renderMoviesList(movies, container, catId) {
  container.innerHTML = '';
  const viewedMovies = JSON.parse(sessionStorage.getItem('viewed_movies') || '[]');
  
  movies.forEach(m => {
    container.appendChild(createMovieCard(m, catId, viewedMovies));
  });
}

function renderSearchResults(movies, container, config, catId) {
  container.innerHTML = '';
  if (movies.length === 0) {
    container.innerHTML = `<div class="empty-state" style="margin-top: 32px;">${config.text_search_empty || 'Pagal jūsų užklausą filmų nerasta.'}</div>`;
    return;
  }
  const viewedMovies = JSON.parse(sessionStorage.getItem('viewed_movies') || '[]');
  movies.forEach(m => {
    container.appendChild(createMovieCard(m, catId, viewedMovies));
  });
}

// Bendra kortelės generavimo funkcija (kad kodas nesidubliuotų)
function createMovieCard(m, catId, viewedMovies) {
  const a = document.createElement('a');
  a.href = `movie.html?id=${m.ID}&category=${catId}`;
  
  const isViewed = viewedMovies.includes(String(m.ID));
  a.className = isViewed ? 'card movie-viewed' : 'card';
  
  let dubCode = m.Dubbing ? m.Dubbing.split(',')[0].trim().toLowerCase() : '';
  let flagBg = (dubCode && dubCode !== '-') ? `<img src="images/logos/flag_${dubCode}.svg" class="card-bg-flag" onerror="this.style.display='none'">` : '';
  
  let subHtml = '';
  if (m.Subtitles && String(m.Subtitles).trim() !== '-' && String(m.Subtitles).trim() !== '') {
    const subCodes = String(m.Subtitles).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (subCodes.length > 0) {
      const flagsHtml = subCodes.map(code => `<img src="images/logos/flag_${code}.svg" class="inline-flag" onerror="this.style.display='none'">`).join('');
      subHtml = `${flagsHtml} `;
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
  return a;
}

init();
