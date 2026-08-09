import { fetchAPI, postAPI } from './api.js';

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const catId = urlParams.get('category');
let isLiked = false;

let galleryImages = [];
let currentImageIndex = 0;

// Saugiklis, jei CMS nebūtų užpildytas
const fallbackPhrases = ["Komentarų dar nėra."];

async function init() {
  const contentContainer = document.getElementById('movie-content');
  const emptyState = document.getElementById('empty-state');
  
  try {
    // 1. Ištraukiame config iš sesijos (arba parsiunčiame)
    let config = JSON.parse(sessionStorage.getItem('site_config'));
    if (!config) {
      config = await fetchAPI('getConfig');
      sessionStorage.setItem('site_config', JSON.stringify(config));
    }
    applyConfigTexts(config);

    // 2. Vienu metu fone parsiunčiame filmus IR kategorijas (kad žinotume kategorijos pavadinimą)
    const [rawMovies, categories] = await Promise.all([
      fetchAPI('getMovies'),
      fetchAPI('getCategories')
    ]);
    
    const allMovies = rawMovies.map(m => {
      if (m.Category === undefined || m.Category === null || String(m.Category).trim() === '') {
        m.Category = 0;
      }
      return m;
    });

    const movie = allMovies.find(m => String(m.ID) === String(movieId));
    
    if (!movie) {
      contentContainer.classList.add('hidden');
      emptyState.textContent = config.text_empty_movie || "Filmas nerastas.";
      emptyState.classList.remove('hidden');
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
    
    // Perduodame ir kategorijų sąrašą bei config
    renderMovie(movie, categories, config);
    setupBottomBar(prevId, nextId);
    setupLightbox();

    fetchAPI('getInteractions', { movieId }).then(interactions => {
      const commVal = document.getElementById('community-rating-val');
      if (commVal) commVal.textContent = interactions.likes || 0;
      renderInteractions(interactions, config);
      setupLikeBtn(config);
      setupComments(config);
    }).catch(err => console.log("Nepavyko užkrauti interakcijų", err));

  } catch (e) { 
    console.error(e); 
    contentContainer.classList.add('hidden');
    emptyState.textContent = "Informacija laikinai nepasiekiama.";
    emptyState.classList.remove('hidden');
  }
}

function applyConfigTexts(config) {
  const setTxt = (id, text) => { if(document.getElementById(id) && text) document.getElementById(id).textContent = text; };
  const setPh = (id, text) => { if(document.getElementById(id) && text) document.getElementById(id).placeholder = text; };
  
  setTxt('loading-text', config.text_loading);
  setTxt('modal-comment-title', config.text_comment_title);
  setPh('comment-name', config.text_comment_name_ph);
  setPh('comment-text', config.text_comment_text_ph);
  setTxt('btn-cancel-text', config.text_btn_cancel);
  setTxt('btn-submit-text', config.text_btn_submit);
  setTxt('btn-ok-text', config.text_btn_ok);
  setTxt('comment-success', config.text_comment_success);
}

const getInfoIconHtml = (iconName) => {
  return `<span class="icon-yellow" style="-webkit-mask-image: url(images/logos/${iconName}); mask-image: url(images/logos/${iconName});"></span>`;
};

// Funkcija, pridedanti vėliavėles prieš kalbos kodą
const injectFlags = (str) => {
  if (!str || str.trim() === '-' || str.trim() === '') return str;
  return String(str).split(',').map(s => {
    const code = s.trim();
    if (!code) return '';
    const lower = code.toLowerCase();
    return `<img src="images/logos/flag_${lower}.svg" class="inline-flag" onerror="this.style.display='none'">${code}`;
  }).join(', ');
};

function renderMovie(m, categories, config) {
  document.title = m.OriginalTitle || 'Filmas';
  const container = document.getElementById('movie-content');
  if(!container) return;
  
  const paddedId = String(m.ID).padStart(4, '0');

  // Išgauname kategorijos pavadinimą
  let catObj = categories.find(c => String(c.ID) === String(m.Category));
  let categoryName = catObj ? catObj.Name : '';

  let subtitleBlockHtml = '';
  if (categoryName || (m.Genre && String(m.Genre).trim() !== '-')) {
    subtitleBlockHtml = `<div class="mh-subtitle-block">`;
    if (categoryName) subtitleBlockHtml += `<div class="mh-subtitle-item">${categoryName}</div>`;
    if (m.Genre && String(m.Genre).trim() !== '-') subtitleBlockHtml += `<div class="mh-subtitle-item">${m.Genre}</div>`;
    subtitleBlockHtml += `</div>`;
  }

  let metaItems = [];
  const addMeta = (icon, val, isMandatory = false, isFullWidth = false) => {
      if (isMandatory || (val && String(val).trim() !== '-' && String(val).trim() !== '')) {
          let displayVal = (val && String(val).trim() !== '') ? val : '-';
          let fwClass = isFullWidth ? " full-width" : "";
          // Išskiriame tekstą į span dėl išlygiavimo su ikona
          metaItems.push(`<div class="mh-meta-item${fwClass}">${getInfoIconHtml(icon)} <span>${displayVal}</span></div>`);
      }
  };
  
  // TINKLELIO IŠDĖSTYMAS (Grid)
  addMeta('ic_info_language.svg', injectFlags(m.Dubbing)); // Dubliažas (su vėliavom)
  addMeta('ic_info_subs.svg', injectFlags(m.Subtitles), true); // Subtitrai (su vėliavom)
  addMeta('ic_info_duration.svg', m.Duration); // Trukmė
  addMeta('ic_info_year.svg', m.Year); // Metai
  addMeta('ic_info_country.svg', m.Country, false, true); // Šalis (išplečiama per visą plotį)

  let metaGridHtml = metaItems.length > 0 ? `<div class="mh-meta-grid">${metaItems.join('')}</div>` : '';

  const heroHtml = `
    <div class="movie-header-grid">
      <img src="images/posters/mov_${paddedId}.png" class="mh-poster" id="main-poster" alt="${m.OriginalTitle || ''}" onerror="this.onerror=null; this.src='images/mov_0000.png';">
      <div class="mh-info">
        <div class="mh-title-en">${m.OriginalTitle || ''}</div>
        ${m.LithuanianTitle ? `<div class="mh-title-lt">${m.LithuanianTitle}</div>` : ''}
        ${subtitleBlockHtml}
        ${metaGridHtml}
      </div>
    </div>
  `;

  let transformHtml = (m.TransformationStage && String(m.TransformationStage).trim() !== '-') ? `
    <div class="transformation-box">
      <div class="transformation-box-label">${config.text_label_transform || 'PERSONAŽO TRANSFORMACIJA FILME'}</div>
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
          <div class="qf-text">${m.Quote}</div>
        </div>`;
    }
    if (hasFact) {
      const factPrefix = config.text_label_fact ? `<span class="qf-label">${config.text_label_fact}</span>` : '';
      quoteFactHtml += `
        <div class="qf-row">
          ${getInfoIconHtml('ic_info_fact.svg')}
          <div>${factPrefix}${m.Fact}</div>
        </div>`;
    }
    quoteFactHtml += `</div>`;
  }

  let awardsHtml = '';
  if (m.Awards && String(m.Awards).trim() !== '-' && String(m.Awards).trim() !== '') {
    const awardParagraphs = String(m.Awards).split('\n').map(p => p.trim()).filter(Boolean);
    awardsHtml = `
      <div class="awards-box">
        ${getInfoIconHtml('ic_info_awards.svg')}
        <div class="awards-text">${awardParagraphs.map(p => `<p>${p}</p>`).join('')}</div>
      </div>
    `;
  }

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

  const btnImdbText = config.text_btn_imdb || 'peržiūrėti filmo IMDb puslapį.';
  let imdbLinkHtml = m.IMDbLink && String(m.IMDbLink).trim() !== '-' ? `<a href="${m.IMDbLink}" target="_blank" class="btn-outline" style="text-decoration:none;"><img src="images/logos/ic_rate_imdb.svg" style="height:20px;"> ${btnImdbText}</a>` : '';

  let trailerHtml = '';
  if (m.TrailerYouTube && String(m.TrailerYouTube).trim() !== '-') {
      let embedUrl = m.TrailerYouTube;
      if (embedUrl.includes('watch?v=')) {
          embedUrl = embedUrl.replace('watch?v=', 'embed/');
          const ampersandIndex = embedUrl.indexOf('&');
          if (ampersandIndex !== -1) embedUrl = embedUrl.substring(0, ampersandIndex);
      }
      
      const trailerLabel = config.text_label_trailer || 'Žiūrėti filmo anonsą per';
      trailerHtml = `
          <div class="trailer-placeholder" id="yt-placeholder" data-url="${embedUrl}">
             <div class="trailer-content">
                <span class="trailer-label">${trailerLabel}</span>
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

  const commentBtnTxt = config.text_comment_title || 'Palikti komentarą';

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
                        `<hr class="section-divider"><div id="comments-section"></div><button id="open-comment" class="btn-outline" style="margin-top: 16px;">${getInfoIconHtml('ic_info_writer.svg')} ${commentBtnTxt}</button>`;

  const ytPlace = document.getElementById('yt-placeholder');
  if (ytPlace) {
      ytPlace.onclick = function() {
          this.outerHTML = `<iframe width="100%" height="215" src="${this.getAttribute('data-url')}?autoplay=1" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
      };
  }
}

function renderInteractions(data, config) {
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
    // Naudojame frazes iš CMS atskirtas |, jei nėra - naudojame apsauginį fallback'ą
    const phrasesStr = config.text_empty_comments || "";
    let phrases = phrasesStr.includes('|') ? phrasesStr.split('|').map(p => p.trim()) : fallbackPhrases;
    if (phrases.length === 0 || phrases[0] === "") phrases = fallbackPhrases;
    
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
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

function setupLikeBtn(config) {
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
        alert(config.text_alert_liked || 'Šį filmą šiandien jau vertinote.');
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

function setupComments(config) {
  const modal = document.getElementById('comment-modal');
  const openBtn = document.getElementById('open-comment');
  const successMsg = document.getElementById('comment-success');
  const actionBtns = document.getElementById('modal-action-buttons');
  const okBtn = document.getElementById('comment-ok');
  const nameInput = document.getElementById('comment-name');
  const textInput = document.getElementById('comment-text');
  const errorTxt = document.getElementById('comment-error');
  const btnSubmitSpan = document.getElementById('btn-submit-text');

  if (openBtn) openBtn.onclick = () => {
    modal.classList.remove('hidden');
    successMsg.classList.add('hidden');
    errorTxt.style.display = 'none';
    okBtn.classList.add('hidden');
    actionBtns.classList.remove('hidden');
    nameInput.classList.remove('hidden');
    textInput.classList.remove('hidden');
    nameInput.value = '';
    textInput.value = '';
  };

  document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
  
  document.getElementById('submit-comment').onclick = async () => {
    errorTxt.style.display = 'none';
    const btn = document.getElementById('submit-comment');
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    
    if(!name || !text) {
      errorTxt.textContent = config.text_error_empty || 'Užpildykite visus laukus.';
      errorTxt.style.display = 'block';
      return;
    }
    
    btn.disabled = true;
    btnSubmitSpan.textContent = config.text_btn_sending || "Siunčiama...";
    
    try {
      await postAPI({ action: 'addComment', movieId, name, comment: text });
      
      actionBtns.classList.add('hidden');
      nameInput.classList.add('hidden');
      textInput.classList.add('hidden');
      successMsg.classList.remove('hidden');
      okBtn.classList.remove('hidden');
    } catch (err) {
      errorTxt.textContent = "Klaida siunčiant komentarą.";
      errorTxt.style.display = 'block';
    }
    
    btn.disabled = false;
    btnSubmitSpan.textContent = config.text_btn_submit || "Išsiųsti";
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
