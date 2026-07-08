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
  const container = document.getElementById('movie-content');
  container.innerHTML = '';

  const addBlock = (title, content, className = 'section') => {
    if (!content) return;
    container.innerHTML += `<div class="${className}"><h3>${title}</h3><div>${content}</div></div>`;
  };

  const imgStr = `<img src="images/posters/${m.ID}.png" class="poster" id="main-poster" alt="${m.OriginalTitle}">`;
  const info = [m.LithuanianTitle, m.Duration, m.Genre].filter(Boolean).join('<br>');
  addBlock('Pagrindinė informacija', imgStr + info);
  
  const crew = [];
  if(m.Director) crew.push(`<b>Režisierius:</b> ${m.Director}`);
  if(m.Screenplay) crew.push(`<b>Scenarijus:</b> ${m.Screenplay}`);
  if(m.Composer) crew.push(`<b>Kompozitorius:</b> ${m.Composer}`);
  if(m.Cinematographer) crew.push(`<b>Operatorius:</b> ${m.Cinematographer}`);
  if(m.MainActors) crew.push(`<b>Aktoriai:</b> ${m.MainActors}`);
  addBlock('Kūrybinė grupė', crew.join('<br>'));

  const extra = [];
  if(m.Year) extra.push(`<b>Metai:</b> ${m.Year}`);
  if(m.Country) extra.push(`<b>Šalis:</b> ${m.Country}`);
  if(m.Dubbing) extra.push(`<b>Įgarsinimas:</b> ${m.Dubbing}`);
  if(m.Subtitles) extra.push(`<b>Subtitrai:</b> ${m.Subtitles}`);
  addBlock('Papildoma informacija', extra.join('<br>'));

  const ratings = [];
  if(m.IMDb) ratings.push(`<b>IMDb:</b> ${m.IMDb}`);
  if(m.Metacritic) ratings.push(`<b>Metacritic:</b> ${m.Metacritic}`);
  if(m.RTCritics) ratings.push(`<b>RT Critics:</b> ${m.RTCritics}`);
  if(m.RTAudience) ratings.push(`<b>RT Audience:</b> ${m.RTAudience}`);
  if(m.CommunityRating) ratings.push(`<b>Bendruomenė:</b> ${m.CommunityRating}`);
  addBlock('Vertinimai', ratings.join('<br>'));

  addBlock('Aprašymas', m.Description);

  if (m.TrailerYouTube) {
    const embed = `<iframe width="100%" height="215" src="${m.TrailerYouTube}" frameborder="0" allowfullscreen></iframe>`;
    addBlock('Video anonsas', embed);
  }

  if (m.IMDbLink) {
    const link = `<a href="${m.IMDbLink}" target="_blank" class="btn-text">Atidaryti IMDb puslapį</a>`;
    addBlock('Daugiau apie filmą', link);
  }

  const galCount = parseInt(m.GalleryImages) || 0;
  if (galCount > 0) {
    let galHtml = '';
    for(let i=1; i<=galCount; i++) {
      galHtml += `<img src="images/gallery/${m.ID}/${i}.png" class="gallery-img" id="gal-${i}">`;
    }
    addBlock('Galerija', galHtml);
  }

  container.innerHTML += `<div id="comments-section" class="section"></div>`;
  container.innerHTML += `<button id="open-comment" class="btn">Rašyti komentarą</button>`;

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