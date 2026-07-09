import { fetchAPI, postAPI } from './api.js';

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const catId = urlParams.get('category');
let isLiked = false;

async function init() {
  try {
    const data = await fetchAPI('getMovie', { id: movieId, category: catId });
    if (data.error) throw new Error(data.error);

    // Iškart gauname interakcijas, kad žinotume realų Bendruomenės reitingą
    const interactions = await fetchAPI('getInteractions', { movieId });
    
    // Perrašome "-" (iš duomenų bazės "Movies" lapo) į realų skaičių
    data.movie.CommunityRating = interactions.likes || 0;

    renderMovie(data.movie);
    setupBottomBar(data.prevId, data.nextId);
    renderInteractions(interactions);
    setupLikeBtn();
    setupComments();
  } catch (e) { console.error(e); }
}

function renderMovie(m) {
  document.title = m.OriginalTitle || 'Filmas';
  const container = document.getElementById('movie-content');
  if(!container) return;
  container.innerHTML = '';
  const paddedId = String(m.ID).padStart(4, '0');

  // Viršutinis meniu (topNav) pašalintas

  const hero = '<div class="hero-section"><img src="images/posters/mov_' + paddedId + '.png" class="hero-poster" id="main-poster" alt="' + m.OriginalTitle + '"><div class="hero-info"><h1>' + m.OriginalTitle + '</h1>' + (m.Year ? '<div class="hero-year">(' + m.Year + ')</div>' : '') + (m.LithuanianTitle ? '<div class="hero-local">' + m.LithuanianTitle + '</div>' : '') + '<div class="hero-meta"><span class="meta-icon">⏱</span> ' + (m.Duration || '--') + ' min &nbsp;|&nbsp; ' + (m.Genre || '') + '</div></div></div>';

  const addSection = (title, content) => { if (!content) return ''; return '<h3>' + title + '</h3><div>' + content + '</div>'; };

  let crewHtml = '';
  if(m.Director) crewHtml += '<div class="info-row"><div class="label"><span class="label-icon">🎥</span> Režisierius</div><div class="value">' + m.Director + '</div></div>';
  if(m.Screenplay) crewHtml += '<div class="info-row"><div class="label"><span class="label-icon">📝</span> Scenarijus</div><div class="value">' + m.Screenplay + '</div></div>';
  if(m.Composer) crewHtml += '<div class="info-row"><div class="label"><span class="label-icon">🎵</span> Kompozitorius</div><div class="value">' + m.Composer + '</div></div>';
  if(m.Cinematographer) crewHtml += '<div class="info-row"><div class="label"><span class="label-icon">📷</span> Operatorius</div><div class="value">' + m.Cinematographer + '</div></div>';
  if(m.MainActors) crewHtml += '<div class="info-row"><div class="label"><span class="label-icon">🎭</span> Akt.</div><div class="value">' + m.MainActors + '</div></div>';

  let extraHtml = '';
  if(m.Year) extraHtml += '<div class="info-row"><div class="label"><span class="label-icon">📅</span> Metai</div><div class="value">' + m.Year + '</div></div>';
  if(m.Country) extraHtml += '<div class="info-row"><div class="label"><span class="label-icon">🌍</span> Šalis</div><div class="value">' + m.Country + '</div></div>';
  if(m.Dubbing) extraHtml += '<div class="info-row"><div class="label"><span class="label-icon">🎙️</span> Įgarsinimas</div><div class="value">' + m.Dubbing + '</div></div>';
  if(m.Subtitles) extraHtml += '<div class="info-row"><div class="label"><span class="label-icon">💬</span> Subtitrai</div><div class="value">' + m.Subtitles + '</div></div>';

  const ratings = [];
  if(m.IMDb) ratings.push('<div class="rating-badge"><img src="images/logos/imdb.png" class="rating-logo" alt="IMDb"><span class="rating-score">' + m.IMDb + '</span></div>');
  if(m.Metacritic) ratings.push('<div class="rating-badge"><img src="images/logos/metacritic.png" class="rating-logo" alt="Metacritic"><span class="rating-score">' + m.Metacritic + '</span></div>');
  if(m.RTCritics) ratings.push('<div class="rating-badge"><img src="images/logos/rt-critics.png" class="rating-logo" alt="RT Critics"><span class="rating-score">' + m.RTCritics + '</span></div>');
  if(m.RTAudience) ratings.push('<div class="rating-badge"><img src="images/logos/rt-audience.png" class="rating-logo" alt="RT Audience"><span class="rating-score">' + m.RTAudience + '</span></div>');
  
  // Pridedamas Bendruomenės reitingas su unikaliu ID, kad veiktų realiu laiku
  ratings.push('<div class="rating-badge"><img src="images/logos/community.png" class="rating-logo" alt="Bendruomenė"><span class="rating-score" id="community-rating-val">' + m.CommunityRating + '</span></div>');

  let ratingsHtml = ratings.length > 0 ? '<div class="ratings-container">' + ratings.join('') + '</div>' : '';
  let descHtml = m.Description ? '<div class="description-text">' + m.Description + '</div>' : '';
  let trailerHtml = m.TrailerYouTube ? '<iframe width="100%" height="215" src="' + m.TrailerYouTube + '" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>' : '';

  let galHtml = '';
  const galCount = parseInt(m.GalleryImages) || 0;
  if (galCount > 0) {
    let imgs = '';
    for(let i=1; i<=galCount; i++) {
      imgs += '<img src="images/gallery/mov_' + paddedId + '-' + String(i).padStart(3, '0') + '.png" class="gallery-img" id="gal-' + i + '">';
    }
    galHtml = '<div class="gallery-grid">' + imgs + '</div>';
  }

  container.innerHTML = hero + addSection('A. Pagrindinė informacija', crewHtml) + addSection('C. Papildoma informacija', extraHtml) + addSection('D. Vertinimai', ratingsHtml) + addSection('E. Aprašymas', descHtml) + addSection('F. Video anonsas (Trailer)', trailerHtml) + (m.IMDbLink ? addSection('G. Daugiau apie filmą', '<a href="' + m.IMDbLink + '" target="_blank" class="btn-outline" style="text-decoration:none;"><img src="images/logos/imdb.png" style="height:20px;"> Peržiūrėti filme IMDb</a>') : '') + addSection('H. Galerija', galHtml) + '<div id="comments-section"></div>' + '<button id="open-comment" class="btn-outline">💬 Palikti komentarą</button>';

  const poster = document.getElementById('main-poster');
  if (poster) {
    poster.onerror = function() {
      this.onerror = null; 
      this.src = 'images/posters/mov_0000.png';
    };
  }

  for (let i = 1; i <= galCount; i++) {
    const gi = document.getElementById('gal-' + i);
    if (gi) {
      gi.onerror = function() {
        this.onerror = null;
        this.src = 'images/posters/mov_0000.png';
      };
    }
  }
}

function renderInteractions(data) {
  // Pašalinta like-count logika, nes dabar ji tiesiogiai atvaizduojama Vertinimų sekcijoje
  const cSec = document.getElementById('comments-section');
  if (cSec && data.comments && data.comments.length > 0) {
    cSec.innerHTML = '<h3>I. Pastabos / Komentarai</h3>' + data.comments.map(c => '<div class="comment-card"><div class="comment-header"><div class="comment-author"><div class="avatar">' + c.Name.charAt(0).toUpperCase() + '</div>' + c.Name + '</div><div class="comment-date">' + c.Timestamp.split('T')[0] + '</div></div><div class="comment-text">' + c.Comment + '</div></div>').join('');
  }
}

function setupBottomBar(prev, next) {
  const bar = document.querySelector('.bottom-bar');
  if(!bar) return;
  
  // Atnaujinta 5 mygtukų struktūra
  bar.innerHTML = '<button id="btn-prev" class="btn-nav" ' + (prev ? '' : 'disabled') + '>❮</button>' +
                  '<button id="btn-home" class="btn-nav">🏠</button>' +
                  '<button id="btn-back" class="btn-nav">📋</button>' +
                  '<button id="btn-like" class="btn-nav">🤍</button>' +
                  '<button id="btn-next" class="btn-nav" ' + (next ? '' : 'disabled') + '>❯</button>';

  document.getElementById('btn-home').onclick = () => window.location.href = 'index.html';
  document.getElementById('btn-back').onclick = () => window.location.href = 'category.html?id=' + catId;
  if (prev) document.getElementById('btn-prev').onclick = () => window.location.href = 'movie.html?id=' + prev + '&category=' + catId;
  if (next) document.getElementById('btn-next').onclick = () => window.location.href = 'movie.html?id=' + next + '&category=' + catId;
}

function setupLikeBtn() {
  const btn = document.getElementById('btn-like');
  if (!btn) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = 'like_' + movieId;
  const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
  
  // Patikriname, ar vartotojas jau buvo pamėgęs
  if (storedData.date === today && storedData.liked) {
    isLiked = true;
  }
  
  btn.textContent = isLiked ? '❤️' : '🤍';
  if(isLiked) btn.classList.add('liked');

  btn.onclick = async () => {
    const now = new Date().toISOString().split('T')[0];
    const checkData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // Apsauga: jei šiandien jau paspaudė LIKE ir bando spausti vėl
    if (checkData.date === now && checkData.liked && !isLiked) {
        alert('Šį filmą šiandien jau vertinote.');
        return;
    }

    btn.disabled = true; 
    isLiked = !isLiked; 
    
    btn.textContent = isLiked ? '❤️' : '🤍';
    if (isLiked) {
        btn.classList.add('liked');
    } else {
        btn.classList.remove('liked');
    }
    
    // Realiu laiku atnaujiname Community Rating rodiklį sekcijoje D
    let badgeEl = document.getElementById('community-rating-val');
    if(badgeEl) {
        let currentCount = parseInt(badgeEl.textContent) || 0;
        badgeEl.textContent = isLiked ? currentCount + 1 : currentCount - 1;
    }

    localStorage.setItem(storageKey, JSON.stringify({ date: now, liked: isLiked }));
    await postAPI({ action: 'toggleLike', movieId, likeAction: isLiked ? 'like' : 'unlike' });
    
    setTimeout(() => { btn.disabled = false; }, 2000);
  };
}

function setupComments() {
  const modal = document.getElementById('comment-modal');
  const openBtn = document.getElementById('open-comment');
  if (openBtn) openBtn.onclick = () => modal.classList.remove('hidden');
  document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
  document.getElementById('submit-comment').onclick = async () => {
    const btn = document.getElementById('submit-comment');
    const name = document.getElementById('comment-name').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    if(!name || !text) return alert('Užpildykite visus laukus');
    btn.disabled = true;
    await postAPI({ action: 'addComment', movieId, name, comment: text });
    modal.classList.add('hidden');
    alert('Komentaras išsiųstas.');
    btn.disabled = false;
  };
}

init();
