import { fetchAPI, postAPI } from './api.js';

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const catId = urlParams.get('category');
let isLiked = false;

let galleryImages = [];
let currentImageIndex = 0;

const emptyCommentPhrases = [
  "Užfiksuota keista tyla komentarų skyriuje.",
  "Komentarų juosta šiuo metu vaidina tylų vaidmenį.",
  "Čia galėtų būti tavo kino kritikos debiutas.",
  "Niekas dar nepasakė: „blogas filmas“.",
  "Tuščia scena. Reikia pagrindinio veikėjo.",
  "Ši vieta laukia pirmosios recenzijos premjeros.",
  "Komentarų archyvas dar nepradėjo filmavimo.",
  "Spragėsiai paruošti. Nuomonės laukiamos.",
  "Net statistai dar nieko neparašė.",
  "Šio filmo byloje trūksta žiūrovo balso."
];

async function init() {
  try {
    const rawMovies = await fetchAPI('getMovies');
    
    const allMovies = rawMovies.map(m => {
      if (m.Category === undefined || m.Category === null || String(m.Category).trim() === '') {
        m.Category = 0;
      }
      return m;
    });

    const movie = allMovies.find(m => String(m.ID) === String(movieId));
    
    if (!movie) {
      document.getElementById('movie-content').classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
      return;
    }

    let viewedMovies = JSON.parse(sessionStorage.getItem('viewed_movies') || '[]');
    if (!viewedMovies.includes(String(movie.ID))) {
      viewedMovies.push(String(movie.ID));
      sessionStorage.setItem('viewed_movies', JSON.stringify(viewedMovies));
    }

    let catMovies = catId === 'all'
      ? [...allMovies].sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)))
      : allMovies.filter(m => String(m.Category) === String(catId)).sort((a, b) => String(a.OriginalTitle).localeCompare(String(b.OriginalTitle)));

    const movieIndex = catMovies.findIndex(m => String(m.ID) === String(movieId));
    const prevId = movieIndex > 0 ? catMovies[movieIndex - 1].ID : null;
    const nextId = movieIndex < catMovies.length - 1 ? catMovies[movieIndex + 1].ID : null;

    movie.CommunityRating = '...';
    renderMovie(movie);
    setupBottomBar(prevId, nextId);
    setupLightbox();

    fetchAPI('getInteractions', { movieId }).then(interactions => {
      const commVal = document.getElementById('community-rating-val');
      if (commVal) commVal.textContent = interactions.likes || 0;
      renderInteractions(interactions);
      setupLikeBtn();
      setupComments();
    }).catch(err => console.log("Nepavyko užkrauti interakcijų", err));

  } catch (e) { 
    console.error(e); 
    document.getElementById('movie-content').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
  }
}

// 3 PUNKTAS: Ištaisyta sintaksė - pašalintos pavienės kabutės (''), kad mask-image nekeltų konfliktų naršyklėse
const getInfoIconHtml = (iconName) => {
  return `<span class="icon-yellow" style="-webkit-mask-image: url(images/logos/${iconName}); mask-image: url(images/logos/${iconName});"></span>`;
};

function renderMovie(m) {
  document.title = m.OriginalTitle || 'Filmas';
  const container = document.getElementById('movie-content');
  if(!container) return;
  
  const paddedId = String(m.ID).padStart(4, '0');

  let metaItems = [];
  const addMeta = (icon, val, isMandatory = false) => {
      if (isMandatory || (val && String(val).trim() !== '-' && String(val).trim() !== '')) {
          let displayVal = (val && String(val).trim() !== '') ? val : '-';
          metaItems.push(`<div class="mh-meta-item">${getInfoIconHtml(icon)} ${displayVal}</div>`);
      }
  };
  addMeta('ic_info_language.svg', m.Dubbing);
  addMeta('ic_info_subs.svg', m.Subtitles, true);
  addMeta('ic_info_year.svg', m.Year);
  addMeta('ic_info_country.svg', m.Country);

  let metaGridHtml = metaItems.length > 0 ? `<div class="mh-meta-grid">${metaItems.join('')}</div>` : '';

  const heroHtml = `
    <div class="movie-header-grid">
      <img src="images/posters/mov_${paddedId}.png" class="mh-poster" id="main-poster" alt="${m.OriginalTitle || ''}" onerror="this.onerror=null; this.src='images/mov_0000.png';">
      <div class="mh-info">
        <div class="mh-title-en">${m.OriginalTitle || ''}</div>
        ${m.LithuanianTitle ? `<div class="mh-title-lt">${m.LithuanianTitle}</div>` : ''}
        ${metaGridHtml}
      </div>
    </div>
  `;

  let transformHtml = (m.TransformationStage && String(m.TransformationStage).trim() !== '-') ? `
    <div class="transformation-box">
      <div class="transformation-box-label">Transformacijos etapas</div>
      ${m.TransformationStage}
    </div>
  ` : '';

  const crewInfo = [
      { label: 'Režisierius', icon: 'ic_info_director.svg', val: m.Director },
      { label: 'Scenarijus', icon: 'ic_info_writer.svg', val: m.Screenplay },
      { label: 'Kompozitorius', icon: 'ic_info_composer.svg', val: m.Composer },
      { label: 'Operatorius', icon: 'ic_info_camera.svg', val: m.Cinematographer },
      { label: 'Aktoriai', icon: 'ic_info_cast.svg', val: m.MainActors }
  ].filter(i => i.val && String(i.val).trim() !== '-' && String(i.val).trim() !== '');
  
  let crewHtml = crewInfo.length > 0 ? crewInfo.map(i => `
      <div class="info-row">
         <div class="label">${getInfoIconHtml(i.icon)} ${i.label}</div>
         <div class="value">${i.val}</div>
      </div>
  `).join('') : '';

  let descHtml = '';
  if (m.Description && String(m.Description).trim() !== '-' && String(m.Description).trim() !== '') {
    const paragraphs = m.Description.split('\n').map(p => p.trim()).filter(Boolean);
    descHtml = `<div class="description-text">${paragraphs.map(p => `<p>${p}</p>`).join('')}</div>`;
  }

  let quoteFactHtml = '';
  let hasQuote = m.Quote && String(m.Quote).trim() !== '-' && String(m.Quote).trim() !== '';
  let hasFact = m.Fact && String(m.Fact).trim() !== '-' && String(m.Fact).trim() !== '';

  if (hasQuote || hasFact) {
    quoteFactHtml = `<div class="quote-fact-box">`;
    if (hasQuote) {
      quoteFactHtml += `
        <div class="qf-row">
          ${getInfoIconHtml('ic_info_quote.svg')}
          <div class="qf-text">„${m.Quote}“</div>
        </div>`;
    }
    if (hasFact) {
      quoteFactHtml += `
        <div class="qf-row">
          ${getInfoIconHtml('ic_info_fact.svg')}
          <div>${m.Fact}</div>
        </div>`;
    }
    quoteFactHtml += `</div>`;
  }

  let awardsHtml = (m.Awards && String(m.Awards).trim() !== '-' && String(m.Awards).trim() !== '') ? `
    <div class="awards-box">
      ${getInfoIconHtml('ic_info_awards.svg')}
      <div>${m.Awards}</div>
    </div>
  ` : '';

  let ratingDateStr = m.RatingDate ? String(m.RatingDate).substring(0, 10) : new Date().toISOString().split('T')[0];

  const rList = [
      { id: 'imdb', icon: 'ic_rate_imdb.svg', val: m.IMDb },
      { id: 'meta', icon: 'ic_rate_meta.svg', val: m.Metacritic },
      { id: 'rtc', icon: 'ic_rate_rt_critics.svg', val: m.RTCritics },
      { id: 'rta', icon: 'ic_rate_rt_audience.svg', val: m.RTAudience },
      { id: 'comm', icon: 'ic_rate_community.svg', val: m.CommunityRating }
  ];
  let ratingsHtml = rList.map(r => `
      <div class="rating-badge">
          <img src="images/logos/${r.icon}" class="rating-logo" onerror="console.log('Klaida užkraunant logotipą:', this.src)">
          <span class="rating-score" ${r.id === 'comm' ? 'id="community-rating-val"' : ''}>${r.val || '-'}</span>
      </div>
  `).join('');
  let ratingsBlock = `<div class="ratings-container">${ratingsHtml}</div><div class="ratings-date">Atnaujinta: ${ratingDateStr}</div>`;

  let imdbLinkHtml = m.IMDbLink && String(m.IMDbLink).trim() !== '-' ? `<a href="${m.IMDbLink}" target="_blank" class="btn-outline" style="text-decoration:none;"><img src="images/logos/ic_rate_imdb.svg" style="height:20px;"> peržiūrėti filmo IMDb puslapį.</a>` : '';

  let trailerHtml = '';
  if (m.TrailerYouTube && String(m.TrailerYouTube).trim() !== '-') {
      let embedUrl = m.TrailerYouTube;
      if (embedUrl.includes('watch?v=')) {
          embedUrl = embedUrl.replace('watch?v=', 'embed/');
          const ampersandIndex = embedUrl.indexOf('&');
          if (ampersandIndex !== -1) embedUrl = embedUrl.substring(0, ampersandIndex);
      }
      
      trailerHtml = `
          <div class="trailer-placeholder" id="yt-placeholder" data-url="${embedUrl}">
             <div class="trailer-content">
                <span class="trailer-label">Žiūrėti filmo anonsą per</span>
                <img src="images/logos/ic_media_play.svg" alt="Play" class="trailer-play-icon">
             </div>
          </div>
      `;
  }

  let galHtml = '';
  const galCount = parseInt(m.GalleryImages) || 0;
  if (galCount > 0) {
    let imgs = '';
    for(let i=1; i<=galCount; i++) {
      const srcPath = `images/gallery/mov_${paddedId}-${String(i).padStart(3, '0')}.png`;
      galleryImages.push(srcPath);
      imgs += `<img src="${srcPath}" class="gallery-img" data-index="${i-1}" onerror="this.onerror=null; this.src='images/mov_0000.png';">`;
    }
    galHtml = `<div class="gallery-grid">${imgs}</div>`;
  }

  const addBlock = (content) => {
    if (!content) return '';
    return `<hr class="section-divider">${content}`;
  };

  container.innerHTML = heroHtml + 
                        addBlock(transformHtml) +
                        addBlock(crewHtml) + 
                        addBlock(descHtml) + 
                        addBlock(quoteFactHtml) +
                        addBlock(awardsHtml) +
                        addBlock(ratingsBlock) + 
                        (imdbLinkHtml ? `<div style="margin-top:16px;">${imdbLinkHtml}</div>` : '') +
                        addBlock(trailerHtml) + 
                        addBlock(galHtml) + 
                        `<hr class="section-divider"><div id="comments-section"></div><button id="open-comment" class="btn-outline" style="margin-top: 16px;">${getInfoIconHtml('ic_info_writer.svg')} Palikti komentarą</button>`;

  const ytPlace = document.getElementById('yt-placeholder');
  if (ytPlace) {
      ytPlace.onclick = function() {
          this.outerHTML = `<iframe width="100%" height="215" src="${this.getAttribute('data-url')}?autoplay=1" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
      };
  }
}

function renderInteractions(data) {
  const cSec = document.getElementById('comments-section');
  if (!cSec) return;

  if (data.comments && data.comments.length > 0) {
    const sortedComments = data.comments.reverse();
    let commentsHtml = sortedComments.map(c => `
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
    
    cSec.innerHTML = `<div id="comments-list">${commentsHtml}</div>`;
  } else {
    const randomPhrase = emptyCommentPhrases[Math.floor(Math.random() * emptyCommentPhrases.length)];
    cSec.innerHTML = `<div class="empty-state">${randomPhrase}</div>`;
  }
}

function setupBottomBar(prev, next) {
  document.getElementById('btn-home').onclick = () => window.location.href = 'index.html';
  document.getElementById('btn-back').onclick = () => window.location.href = 'category.html?id=' + catId;
  
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (prev) {
    btnPrev.disabled = false;
    btnPrev.onclick = () => window.location.href = `movie.html?id=${prev}&category=${catId}`;
  }
  
  if (next) {
    btnNext.disabled = false;
    btnNext.onclick = () => window.location.href = `movie.html?id=${next}&category=${catId}`;
  }
}

function setupLikeBtn() {
  const btn = document.getElementById('btn-like');
  const icon = document.getElementById('like-icon');
  if (!btn || !icon) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = 'like_' + movieId;
  const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
  
  if (storedData.date === today && storedData.liked) {
    isLiked = true;
  }
  
  icon.src = isLiked ? 'images/logos/ic_nav_like_filled.svg' : 'images/logos/ic_nav_like_outline.svg';
  
  btn.onclick = async () => {
    const now = new Date().toISOString().split('T')[0];
    const checkData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (checkData.date === now && checkData.liked && !isLiked) {
        alert('Šį filmą šiandien jau vertinote.');
        return;
    }

    btn.disabled = true; 
    isLiked = !isLiked; 
    icon.src = isLiked ? 'images/logos/ic_nav_like_filled.svg' : 'images/logos/ic_nav_like_outline.svg';
    
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
  const successMsg = document.getElementById('comment-success');
  const actionBtns = document.getElementById('modal-action-buttons');
  const okBtn = document.getElementById('comment-ok');
  const nameInput = document.getElementById('comment-name');
  const textInput = document.getElementById('comment-text');

  if (openBtn) openBtn.onclick = () => {
    modal.classList.remove('hidden');
    successMsg.classList.add('hidden');
    okBtn.classList.add('hidden');
    actionBtns.classList.remove('hidden');
    nameInput.classList.remove('hidden');
    textInput.classList.remove('hidden');
    nameInput.value = '';
    textInput.value = '';
  };

  document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
  
  document.getElementById('submit-comment').onclick = async () => {
    const btn = document.getElementById('submit-comment');
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    
    if(!name || !text) return alert('Užpildykite visus laukus');
    
    btn.disabled = true;
    btn.textContent = "Siunčiama...";
    
    await postAPI({ action: 'addComment', movieId, name, comment: text });
    
    actionBtns.classList.add('hidden');
    nameInput.classList.add('hidden');
    textInput.classList.add('hidden');
    successMsg.classList.remove('hidden');
    okBtn.classList.remove('hidden');
    
    btn.disabled = false;
    btn.textContent = "Išsiųsti";
  };

  okBtn.onclick = () => {
    modal.classList.add('hidden');
  };
}

function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const btnPrev = document.getElementById('lightbox-prev');
  const btnNext = document.getElementById('lightbox-next');
  
  function updateLightboxArrows() {
    if(!btnPrev || !btnNext) return;
    btnPrev.style.opacity = (currentImageIndex === 0) ? '0.15' : '1';
    btnNext.style.opacity = (currentImageIndex === galleryImages.length - 1) ? '0.15' : '1';
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('gallery-img')) {
      currentImageIndex = parseInt(e.target.getAttribute('data-index'));
      lbImg.src = galleryImages[currentImageIndex];
      lightbox.classList.remove('hidden');
      updateLightboxArrows();
    }
  });

  document.getElementById('lightbox-close').onclick = () => lightbox.classList.add('hidden');
  
  if (btnPrev) {
    btnPrev.onclick = () => {
      if (currentImageIndex > 0) {
        currentImageIndex--;
        lbImg.src = galleryImages[currentImageIndex];
        updateLightboxArrows();
      }
    };
  }

  if (btnNext) {
    btnNext.onclick = () => {
      if (currentImageIndex < galleryImages.length - 1) {
        currentImageIndex++;
        lbImg.src = galleryImages[currentImageIndex];
        updateLightboxArrows();
      }
    };
  }
}

init();
