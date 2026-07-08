import { fetchAPI } from './api.js';

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const catId = urlParams.get('id');
  const container = document.getElementById('movies-container');

  try {
    const allMovies = await fetchAPI('getMovies');
    const catMovies = allMovies
      .filter(m => String(m.Category) === String(catId))
      .sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)));

    container.innerHTML = '';
    catMovies.forEach(m => {
      const a = document.createElement('a');
      a.href = `movie.html?id=${m.ID}&category=${catId}`;
      a.className = 'card';
      a.innerHTML = `<h3>${m.OriginalTitle}</h3><p>${m.Year} | ${m.Genre}</p>`;
      container.appendChild(a);
    });
  } catch (e) {
    container.innerHTML = '';
  }
}

init();