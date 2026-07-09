function renderMovie(m) {
  document.getElementById('movie-title').textContent = m.OriginalTitle || 'Filmas';
  const container = document.getElementById('movie-content');
  container.innerHTML = '';

  const addBlock = (title, content, className = 'section') => {
    if (!content) return;
    container.innerHTML += `<div class="${className}"><h3>${title}</h3><div>${content}</div></div>`;
  };

  // A. Pagrindinė informacija (su etiketėmis)
  const imgStr = `<img src="images/posters/${m.ID}.png" class="poster" id="main-poster" alt="${m.OriginalTitle}">`;
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

  // D. Vertinimai (grafiniai ženkliukai)
// D. Vertinimai (tikri logotipai iš /images/logos/ katalogo)
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
