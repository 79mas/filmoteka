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
    document.getElementById('movie-content').innerHTML = '';
  }
}

function renderMovie(m) {
  document.getElementById('movie-title').textContent = m.OriginalTitle || 'Filmas';
  document.title = m.OriginalTitle || 'Filmas';
  const container = document.getElementById('movie-content');
  container.innerHTML = '';

  const addBlock = (title, content, className = 'section') => {
    if (!content) return;
    container.innerHTML += `<div class="${className}"><h3>${title}</h3><div>${content}</div></div>`;
  };

  // Priverčiame ID būti keturženkliu formatu (pvz. '0001')
  const paddedId = String(m.ID).padStart(4, '0');

  // A. Pagrindinė informacija
  const imgStr = `<img src="images/posters/mov_${paddedId}.png" class="poster" id="main-poster" alt="${m.OriginalTitle}">`;
  const info = [];
  if (m.LithuanianTitle) info.push(`<div class="info-row"><span class="label">Pavadinimas (LT):</span> ${m.LithuanianTitle}</div>`);
  if (m.Duration) info.push(`<div class="info-row"><span class="label">Trukmė:</span> ${m.Duration} min.</div>`);
  if (m.Genre) info.push(`<div class="info-row"><span class="label">Žanras:</span> ${m.Genre}</div>`);
  
  addBlock('Pagrindinė informacija', imgStr + info.join(''));
  
  // B. Kūrybinė grupė
  const crew = [];
  if(m.Director) crew.push(`<div class="info-row"><span class="label">Režisierius:</span> ${m.Director}</div>`);
  if(m.Screenplay) crew.push(`<div class="info-row"><span class="label">Scenarijus:</span> ${m.Screenplay}</div>`);
  if(m.Composer) crew.push(`<div class="info-row"><span class="label">Kompozitorius:</span> ${m.Composer}</div>`);
  if(m.Cinematographer) crew.push(`<div class="info-row"><span class="label">Operatorius:</span> ${m.Cinematographer}</div>`);
  if(m.MainActors) crew.push(`<div class="info-row"><span class="label">Aktoriai:</span> ${m.MainActors}</div>`);
  addBlock('Kūrybinė grupė', crew.join(''));

  // C. Papildoma informacija
  const extra = [];
  if(m.Year) extra.push(`<div class="info-row"><span class="label">Metai:</span> ${m.Year}</div>`);
  if(m.Country) extra.push(`<div class="info-row"><span class="label">Šalis:</span> ${m.Country}</div>`);
  if(m.Dubbing) extra.push(`<div class="info-row"><span class="label">Įgarsinimas:</span> ${m.Dubbing}</div>`);
  if(m.Subtitles) extra.push(`<div class="info-row"><span class="label">Subtitrai:</span> ${m.Subtitles}</div>`);
  addBlock('Papildoma informacija', extra.join(''));

  // D. Vertinimai (tikri logotipai)
  const ratings = [];
  if(m.IMDb) ratings.push(`<div class="rating-badge"><img src="images/logos/imdb.png" class="rating-logo" alt="IMDb"> ${m.IMDb}</div>`);
  if(m.Metacritic) ratings.push(`<div class="rating-badge"><img src="images/logos/metacritic.png" class="rating-logo" alt="Metacritic"> ${m.Metacritic}</div>`);
  if(m.RTCritics) ratings.push(`<div class="rating-badge"><img src="images/logos/rt-critics.png" class="rating-logo" alt="RT Critics"> ${m.RTCritics}</div>`);
  if(m.RTAudience) ratings.push(`<div class="rating-badge"><img src="images/logos/rt-audience.png" class="rating-logo" alt="RT Audience"> ${m.RTAudience}</div>`);
  if(m.CommunityRating) ratings.push(`<div class="rating-badge"><img src="images/logos/community.png" class="rating-logo" alt="Bendruomenė"> ${m.CommunityRating}</div>`);
  
  if (ratings.length > 0) {
    addBlock('Vertinimai', `<div class="ratings-container">${ratings.join('')}</div>`);
  }

  // E. Aprašymas
  addBlock('Aprašymas', m.Description);

  // F. Trailer
  if (m.TrailerYouTube) {
    const embed = `<iframe width="100%" height="215" src="${m.TrailerYouTube}" frameborder="0" allowfullscreen></iframe>`;
    addBlock('Video anonsas', embed);
  }

  // G. Daugiau
  if (m.IMDbLink) {
    const link = `<a href="${m.IMDbLink}" target="_blank" class="btn-text">Atidaryti IMDb puslapį</a>`;
    addBlock('Daugiau apie filmą', link);
  }

  // H. Galerija
  const galCount = parseInt(m.GalleryImages) || 0;
  if (galCount > 0) {
    let galHtml = '';
    for(let i=1; i<=galCount; i++) {
      // Priverčiame galerijos sekos numerį būti triženkliu formatu (pvz. '001')
      const paddedSeq = String(i).padStart(3, '0');
      galHtml += `<img src="images/gallery/mov_${paddedId}-${paddedSeq}.png" class="gallery-img" id="gal-${i}">`;
    }
    addBlock('Galerija', galHtml);
  }

  container.innerHTML += `<div id="comments-section" class="section"></div>`;
  container.innerHTML += `<button id="open-comment" class="btn">Rašyti komentarą</button>`;

  // Klaidos (Image Fallback) valdymas
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
  const cSec = document.getElementById('comments-section');
  if (data.comments && data.comments.length > 0) {
    const html = data.comments.map(c => `<div class="card" style="margin-bottom:12px;"><b>${c.Name}</b><br><span class="small-text">${c.Timestamp}</span><p>${c.Comment}</p></div>`).join('');
    cSec.innerHTML = `<h3>Komentarai</h3>${html}`;
  }
}

function setupBottomBar(prev, next) {
  document.getElementById('btn-home').onclick = () => window.location.href = 'index.html';
  document.getElementById('btn-back').onclick = () => window.location.href = `category.html?id=${catId}`;
  
  const bPrev = document.getElementById('btn-prev');
  if (prev) bPrev.onclick = () => window.location.href = `movie.html?id=${prev}&category=${catId}`;
  else bPrev.disabled = true;

  const bNext = document.getElementById('btn-next');
  if (next) bNext.onclick = () => window.location.href = `movie.html?id=${next}&category=${catId}`;
  else bNext.disabled = true;
}

function setupLikeBtn() {
  const btn = document.getElementById('like-btn');
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
    
    localStorage.setItem(storageKey, JSON.stringify({ date: today, liked: isLiked }));
    await postAPI({ action: 'toggleLike', movieId, likeAction: isLiked ? 'like' : 'unlike' });
    
    setTimeout(() => { btn.disabled = false; }, 2000);
  };
}

function setupComments() {
  const modal = document.getElementById('comment-modal');
  document.getElementById('open-comment').onclick = () => modal.classList.remove('hidden');
  document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
  
  document.getElementById('submit-comment').onclick = async () => {
    const btn = document.getElementById('submit-comment');
    const lastPost = localStorage.getItem('last_comment_time') || 0;
    if (Date.now() - lastPost < 30000) {
      alert('Prašome palaukti 30s prieš rašant naują komentarą.');
      return;
    }

    const name = document.getElementById('comment-name').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    if(!name || !text) return alert('Užpildykite visus laukus');

    btn.disabled = true;
    await postAPI({ action: 'addComment', movieId, name, comment: text });
    
    localStorage.setItem('last_comment_time', Date.now());
    modal.classList.add('hidden');
    alert('Komentaras išsiųstas moderacijai.');
    btn.disabled = false;
  };
}

init();
