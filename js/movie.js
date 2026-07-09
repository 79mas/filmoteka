import { fetchAPI, postAPI, handleImageError } from './api.js';

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const catId = urlParams.get('category');
let isLiked = false;

async function init() {
  try {
    const data = await fetchAPI('getMovie', { id: movieId, category: catId });
    if (data.error) throw new Error(data.error);
    
    renderMovie(data.movie);
    setupBottomBar(data.prevId, data.nextId);
    
    const interactions = await fetchAPI('getInteractions', { movieId });
    renderInteractions(interactions);
    setupLikeBtn();
    setupComments();
  } catch (e) {
    const container = document.getElementById('movie-content');
    if(container) container.innerHTML = '';
  }
}

function renderMovie(m) {
  // Pakeičiame naršyklės tab'o pavadinimą
  document.title = m.OriginalTitle || 'Filmas';
  
  // Paslepiame seną, statinę antraštę, nes naudosime naują dizainą
  const oldHeader = document.querySelector('.movie-header');
  if (oldHeader) oldHeader.style.display = 'none';

  const container = document.getElementById('movie-content');
  container.innerHTML = '';

  const paddedId = String(m.ID).padStart(4, '0');

  // 1. Viršutinė navigacija (su patiktukų skaičiumi)
  const topNav = `
    <div class="movie-header-top">
      <button id="top-back-btn" class="icon-btn">❮</button>
      <div style="display:flex; align-items:center; gap:8px;">
        <button id="like-btn" class="icon-btn" style="color: var(--danger-color);">🤍</button>
        <span id="like-count" class="like-count">...</span>
      </div>
    </div>
  `;

  // 2. Hero Sekcija (Plakatas + Pavadinimas šalia)
  const hero = `
    <div class="hero-section">
      <img src="images/posters/mov_${paddedId}.png" class="hero-poster" id="main-poster" alt="${m.OriginalTitle}">
      <div class="hero-info">
        <h1>${m.OriginalTitle}</h1>
        ${m.Year ? `<div class="hero-year">(${m.Year})</div>` : ''}
        ${m.LithuanianTitle ? `<div class="hero-local">${m.LithuanianTitle}</div>` : ''}
        <div class="hero-meta">
          <span class="meta-icon">⏱</span> ${m.Duration || '--'} min &nbsp;|&nbsp; ${m.Genre || ''}
        </div>
      </div>
    </div>
  `;

  const addSection = (title, content) => {
    if (!content) return '';
    return `<h3>${title}</h3><div>${content}</div>`;
  };

  // 3. Pagrindinė informacija (su ikonomis pagal maketą)
  let crewHtml = '';
  if(m.Director) crewHtml += `<div class="info-row"><div class="label"><span class="label-icon">🎥</span> Režisierius</div><div class="value">${m.Director}</div></div>`;
  if(m.Screenplay) crewHtml += `<div class="info-row"><div class="label"><span class="label-icon">📝</span> Scenarijus</div><div class="value">${m.Screenplay}</div></div>`;
  if(m.Composer) crewHtml += `<div class="info-row"><div class="label"><span class="label-icon">🎵</span> Kompozitorius</div><div class="value">${m.Composer}</div></div>`;
  if(m.Cinematographer) crewHtml += `<div class="info-row"><div class="label"><span class="label-icon">📷</span> Operatorius</div><div class="value">${m.Cinematographer}</div></div>`;
  if(m.MainActors) crewHtml += `<div class="info-row"><div class="label"><span class="label-icon">🎭</span> Akt.</div><div class="value">${m.MainActors}</div></div>`;
  
  let extraHtml = '';
  if(m.Year) extraHtml += `<div class="info-row"><div class="label"><span class="label-icon">📅</span> Metai</div><div class="value">${m.Year}</div></div>`;
  if(m.Country) extraHtml += `<div class="info-row"><div class="label"><span class="label-icon">🌍</span> Šalis</div><div class="value">${m.Country}</div></div>`;
  if(m.Dubbing) extraHtml += `<div class="info-row"><div class="label"><span class="label-icon">🎙️</span> Įgarsinimas</div><div class="value">${m.Dubbing}</div></div>`;
  if(m.Subtitles) extraHtml += `<div class="info-row"><div class="label"><span class="label-icon">💬</span> Subtitrai</div><div class="value">${m.Subtitles}</div></div>`;

  // 4. Vertinimai
  const ratings = [];
  if(m.IMDb) ratings.push(`<div class="rating-badge"><img src="images/logos/imdb.png" class="rating-logo" alt="IMDb"><span class="rating-score">${m.IMDb}</span></div>`);
  if(m.Metacritic) ratings.push(`<div class="rating-badge"><img src="images/logos/metacritic.png" class="rating-logo" alt="Metacritic"><span class="rating-score">${m.Metacritic}</span></div>`);
  if(m.RTCritics) ratings.push(`<div class="rating-badge"><img src="images/logos/rt-critics.png" class="rating-logo" alt="RT Critics"><span class="rating-score">${m.RTCritics}</span></div>`);
  if(m.RTAudience) ratings.push(`<div class="rating-badge"><img src="images/logos/rt-audience.png" class="rating-logo" alt="RT Audience"><span class="rating-score">${m.RTAudience}</span></div>`);
  if(m.CommunityRating) ratings.push(`<div class="rating-badge"><img src="images/logos/community.png" class="rating-logo" alt="Bendruomenė"><span class="rating-score">${m.CommunityRating}</span></div>`);

  let ratingsHtml = '';
  if (ratings.length > 0) ratingsHtml = `<div class="ratings-container">${ratings.join('')}</div>`;

  let descHtml = m.Description ? `<div class="description-text">${m.Description}</div>` : '';
  let trailerHtml = m.TrailerYouTube ? `<iframe width="100%" height="215" src="${m.TrailerYouTube}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>` : '';

  // 5. Galerijos tinklelis
  let galHtml = '';
  const galCount = parseInt(m.GalleryImages) || 0;
  if (galCount > 0) {
    let imgs = '';
    for(let i=1; i<=galCount; i++) {
      const paddedSeq = String(i).padStart(3, '0');
      imgs += `<img src="images/gallery/mov_${paddedId}-${paddedSeq}.png" class="gallery-img" id="gal-${i}">`;
    }
    galHtml = `<div class="gallery-grid">${imgs}</div>`;
  }

  // Viską apjungiame į vieną
  container.innerHTML = topNav + hero +
    addSection('A. Pagrindinė informacija', crewHtml) +
    addSection('C. Papildoma informacija', extraHtml) +
    addSection('D. Vertinimai', ratingsHtml) +
    addSection('E. Aprašymas', descHtml) +
    addSection('F. Video anonsas (Trailer)', trailerHtml) +
    (m.IMDbLink ? addSection('G. Daugiau apie filmą', `<a href="${m.IMDbLink}" target="_blank" class="btn-outline" style="text-decoration:none;"><img src="images/logos/imdb.png" style="height:20px;"> Peržiūrėti filme IMDb</a>`) : '') +
    addSection('H. Galerija', galHtml) +
    `<div id="comments-section"></div>` + 
    `<button id="open-comment" class="btn-outline">💬 Palikti komentarą</button>`;

  // Priskiriame "Back" mygtuko funkcionalumą
  document.getElementById('top-back-btn').onclick = () => window.location.href = `category.html?id=${catId}`;
  
  setTimeout(() => {
    const poster = document.getElementById('main-poster');
    if(poster) handleImageError(poster);
    for(let i=1; i<=galCount; i++) {
      const gi = document.getElementById(`gal-${i}`);
      if(gi) handleImageError(gi);
    }
  }, 50);
}

function renderInteractions(data) {
  const likeCountEl = document.getElementById('like-count');
  if (likeCountEl) likeCountEl.textContent = data.likes || 0;

  const cSec = document.getElementById('comments-section');
  if (data.comments && data.comments.length > 0) {
    const html = data.comments.map(c => `
      <div class="comment-card">
        <div class="comment-header">
          <div class="comment-author">
            <div class="avatar">${c.Name.charAt(0).toUpperCase()}</div>
            ${c.Name}
          </div>
          <div class="comment-date">${c.Timestamp.split('T')[0]}</div>
        </div>
        <div class="comment-text">${c.Comment}</div>
      </div>
    `).join('');
    cSec.innerHTML = `<h3>I. Pastabos / Komentarai</h3>${html}`;
  }
}

function setupBottomBar(prev, next) {
  const bar = document.querySelector('.bottom-bar');
  // Išdėliojame navigaciją pagal maketą
  bar.innerHTML = `
    <button id="btn-prev" class="btn-nav" ${prev ? '' : 'disabled'}>
      <span class="nav-icon">⏪</span> Prev
    </button>
    <button id="btn-home" class="btn-nav">
      <span class="nav-icon">🏠</span> Home
    </button>
    <button id="btn-back" class="btn-nav">
      <span class="nav-icon">🔙</span> Back
    </button>
    <button id="btn-next" class="btn-nav" ${next ? '' : 'disabled'}>
      <span class="nav-icon">⏩</span> Next
    </button>
  `;

  document.getElementById('btn-home').onclick = () => window.location.href = 'index.html';
  document.getElementById('btn-back').onclick = () => window.location.href = `category.html?id=${catId}`;
  if (prev) document.getElementById('btn-prev').onclick = () => window.location.href = `movie.html?id=${prev}&category=${catId}`;
  if (next) document.getElementById('btn-next').onclick = () => window.location.href = `movie.html?id=${next}&category=${catId}`;
}

function setupLikeBtn() {
  const btn = document.getElementById('like-btn');
  if (!btn) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `like_${movieId}`;
  const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');

  if (storedData.date === today && storedData.liked) {
    isLiked = true;
    btn.textContent = '❤️';
  }

  btn.onclick = async () => {
    btn.disabled = true;
    isLiked = !isLiked;
    btn.textContent = isLiked ? '❤️' : '🤍';
    
    let countEl = document.getElementById('like-count');
    let currentCount = parseInt(countEl.textContent) || 0;
    countEl.textContent = isLiked ? currentCount + 1 : currentCount - 1;

    localStorage.setItem(storageKey, JSON.stringify({ date: today, liked: isLiked }));
    await postAPI({ action: 'toggleLike', movieId, likeAction: isLiked ? 'like' : 'unlike' });
    
    setTimeout(() => { btn.disabled = false; }, 2000);
  };
}

function setupComments() {
  const modal = document
