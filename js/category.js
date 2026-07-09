import { fetchAPI } from './api.js';

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const catId = urlParams.get('id');
  const container = document.getElementById('movies-container');
  const emptyState = document.getElementById('empty-state');
  const titleEl = document.getElementById('category-title');
  const descEl = document.getElementById('category-description');

  try {
    // 1. Ištraukiame kategorijos pavadinimą ir aprašymą
    const categories = await fetchAPI('getCategories');
    const currentCat = categories.find(c => String(c.ID) === String(catId));
    if (currentCat) {
      titleEl.textContent = currentCat.Name;
      descEl.textContent = currentCat.Description || '';
    } else {
      titleEl.textContent = 'Kategorija';
    }

    // 2. Ištraukiame ir filtruojame filmus
    const allMovies = await fetchAPI('getMovies');
    const catMovies = allMovies
      .filter(m => String(m.Category) === String(catId))
      .sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)));

    // Tuščios būsenos patikrinimas
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
      
      // Formuojame audio/titrų tekstą pagal logiką
      let audioSubs = [];
      if (m.Dubbing) audioSubs.push(m.Dubbing);
      if (m.Subtitles) audioSubs.push(m.Subtitles);
      let audioSubsText = audioSubs.length > 0 ? audioSubs.join('+') + '; ' : '';
      
      // Struktūra: Title EN Title LT // Kalba+Titrai; Žanras
      a.innerHTML = `
        <div class="list-title">
          <b>${m.OriginalTitle}</b> 
          ${m.LithuanianTitle ? `<span class="list-title-lt">${m.LithuanianTitle}</span>` : ''}
        </div>
        <div class="list-genre">// ${audioSubsText}${m.Genre || ''}</div>
      `;
      container.appendChild(a);
    });
  } catch (e) {
    container.classList.add('hidden');
    document.getElementById('error-message').classList.remove('hidden');
  }
}

init();
