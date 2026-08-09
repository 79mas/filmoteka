import { fetchAPI, postAPI } from './api.js';

async function init() {
  const catContainer = document.getElementById('categories-container');
  const searchContainer = document.getElementById('search-results');
  const emptyState = document.getElementById('empty-state');
  const errorMsg = document.getElementById('error-message');
  const searchInput = document.getElementById('search-input');

  try {
    // 1. Pirmiausia parsiunčiame visą konfigūraciją ir išsaugome sesijoje, kad kiti puslapiai ją turėtų
    let config = JSON.parse(sessionStorage.getItem('site_config'));
    if (!config) {
      config = await fetchAPI('getConfig');
      sessionStorage.setItem('site_config', JSON.stringify(config));
    }

    // Pritaikome tekstus iš CMS pagal elementų ID
    applyConfigTexts(config);

    // 2. Parsiunčiame kategorijas ir filmus
    const categories = await fetchAPI('getCategories');
    const rawMovies = await fetchAPI('getMovies');
    
    // Front-end sanitizacija: tuščias grafas paverčiame į 0 kategoriją
    const allMovies = rawMovies.map(m => {
      if (m.Category === undefined || m.Category === null || String(m.Category).trim() === '') {
        m.Category = 0;
      }
      return m;
    });

    catContainer.innerHTML = '';
    
    // "Visi filmai" virtuali kategorija (visada rodoma, jei yra filmų)
    if (allMovies.length > 0) {
      catContainer.appendChild(createCategoryCard({
        ID: 'all',
        Name: config.text_cat_all_title || 'Visi filmai',
        Description: config.text_cat_all_desc || ''
      }, allMovies.length));
    }

    // 3. Generuojame kategorijas (Slepiame tuščias)
    categories.forEach(c => {
      const catMovieCount = allMovies.filter(m => String(m.Category) === String(c.ID)).length;
      if (catMovieCount > 0) {
        catContainer.appendChild(createCategoryCard(c, catMovieCount));
      }
    });

    if (catContainer.innerHTML === '') {
      catContainer.classList.add('hidden');
      emptyState.textContent = config.text_empty_home || 'Tuščia...';
      emptyState.classList.remove('hidden');
    }

    // 4. PAIEŠKOS LOGIKA
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length > 0) {
        catContainer.classList.add('hidden');
        searchContainer.classList.remove('hidden');
        
        // Ieškome per visus 7 tavo nurodytus stulpelius
        const results = allMovies.filter(m => {
          const searchableText = [
            m.OriginalTitle, m.LithuanianTitle, m.Director, 
            m.Screenplay, m.Composer, m.Cinematographer, m.MainActors
          ].join(' ').toLowerCase();
          return searchableText.includes(query);
        });
        
        renderSearchResults(results, searchContainer, config, 'all');
      } else {
        catContainer.classList.remove('hidden');
        searchContainer.classList.add('hidden');
      }
    });

    // 5. KONTAKTŲ FORMOS LOGIKA
    setupContactForm(config);

  } catch (e) {
    catContainer.classList.add('hidden');
    errorMsg.textContent = "Informacija laikinai nepasiekiama.";
    errorMsg.classList.remove('hidden');
    console.error(e);
  }
}

function applyConfigTexts(config) {
  const setTxt = (id, text) => { if(document.getElementById(id) && text) document.getElementById(id).textContent = text; };
  const setPh = (id, text) => { if(document.getElementById(id) && text) document.getElementById(id).placeholder = text; };
  
  setTxt('site-title', config.site_title);
  setTxt('site-description', config.site_description);
  setTxt('loading-text', config.text_loading);
  setPh('search-input', config.text_search_ph);
  
  setTxt('contact-desc', config.text_contact_desc);
  setTxt('btn-contact-text', config.text_btn_contact);
  setTxt('modal-contact-title', config.text_contact_title);
  setPh('contact-name', config.text_comment_name_ph);
  setPh('contact-email', config.text_contact_email_ph);
  setPh('contact-message', config.text_comment_text_ph);
  
  setTxt('btn-contact-cancel', config.text_btn_cancel);
  setTxt('btn-contact-submit', config.text_btn_submit);
  setTxt('btn-contact-ok', config.text_btn_ok);
}

function createCategoryCard(c, count) {
  const a = document.createElement('a');
  a.href = `category.html?id=${c.ID}`;
  a.className = 'card cat-content';
  a.innerHTML = `
    <h2>${c.Name} <span class="cat-count">(${count})</span></h2>
    ${c.Description ? `<p>${c.Description}</p>` : ''}
  `;
  return a;
}

function renderSearchResults(movies, container, config, catId) {
  container.innerHTML = '';
  if (movies.length === 0) {
    container.innerHTML = `<div class="empty-state" style="margin-top: 32px;">${config.text_empty_movie || 'Nieko nerasta.'}</div>`;
    return;
  }
  
  const viewedMovies = JSON.parse(sessionStorage.getItem('viewed_movies') || '[]');
  
  movies.forEach(m => {
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
    container.appendChild(a);
  });
}

function setupContactForm(config) {
  const modal = document.getElementById('contact-modal');
  const openBtn = document.getElementById('open-contact');
  const closeBtn = document.getElementById('close-contact-modal');
  const submitBtn = document.getElementById('submit-contact');
  const okBtn = document.getElementById('contact-ok');
  
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const msgInput = document.getElementById('contact-message');
  
  const errorTxt = document.getElementById('contact-error');
  const successTxt = document.getElementById('contact-success');
  const actionBtns = document.getElementById('contact-action-buttons');
  const submitBtnSpan = document.getElementById('btn-contact-submit');

  openBtn.onclick = () => {
    modal.classList.remove('hidden');
    successTxt.classList.add('hidden');
    errorTxt.style.display = 'none';
    okBtn.classList.add('hidden');
    actionBtns.classList.remove('hidden');
    nameInput.classList.remove('hidden');
    emailInput.classList.remove('hidden');
    msgInput.classList.remove('hidden');
    nameInput.value = '';
    emailInput.value = '';
    msgInput.value = '';
  };

  closeBtn.onclick = () => modal.classList.add('hidden');
  okBtn.onclick = () => modal.classList.add('hidden');
  
  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  submitBtn.onclick = async () => {
    errorTxt.style.display = 'none';
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = msgInput.value.trim();
    
    if (!name || !email || !message) {
      errorTxt.textContent = config.text_error_empty || "Užpildykite visus laukus.";
      errorTxt.style.display = 'block';
      return;
    }
    
    if (!validateEmail(email)) {
      errorTxt.textContent = config.text_error_email || "Neteisingas el. pašto formatas.";
      errorTxt.style.display = 'block';
      return;
    }
    
    submitBtn.disabled = true;
    submitBtnSpan.textContent = config.text_btn_sending || "Siunčiama...";
    
    try {
      await postAPI({ action: 'addMessage', name, email, message });
      
      actionBtns.classList.add('hidden');
      nameInput.classList.add('hidden');
      emailInput.classList.add('hidden');
      msgInput.classList.add('hidden');
      
      successTxt.textContent = config.text_contact_success || "Žinutė sėkmingai išsiųsta!";
      successTxt.classList.remove('hidden');
      okBtn.classList.remove('hidden');
    } catch (err) {
      errorTxt.textContent = "Klaida siunčiant žinutę.";
      errorTxt.style.display = 'block';
    }
    
    submitBtn.disabled = false;
    submitBtnSpan.textContent = config.text_btn_submit || "Išsiųsti";
  };
}

init();
