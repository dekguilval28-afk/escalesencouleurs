/* ===================== Données pays ===================== */
const COUNTRIES = [
["FR","France","Europe"],["DE","Allemagne","Europe"],["IT","Italie","Europe"],["ES","Espagne","Europe"],
["PT","Portugal","Europe"],["GB","Royaume-Uni","Europe"],["IE","Irlande","Europe"],["NL","Pays-Bas","Europe"],
["BE","Belgique","Europe"],["LU","Luxembourg","Europe"],["CH","Suisse","Europe"],["AT","Autriche","Europe"],
["DK","Danemark","Europe"],["SE","Suède","Europe"],["NO","Norvège","Europe"],["FI","Finlande","Europe"],
["IS","Islande","Europe"],["PL","Pologne","Europe"],["CZ","République tchèque","Europe"],["SK","Slovaquie","Europe"],
["HU","Hongrie","Europe"],["RO","Roumanie","Europe"],["BG","Bulgarie","Europe"],["GR","Grèce","Europe"],
["HR","Croatie","Europe"],["SI","Slovénie","Europe"],["RS","Serbie","Europe"],["BA","Bosnie-Herzégovine","Europe"],
["ME","Monténégro","Europe"],["MK","Macédoine du Nord","Europe"],["AL","Albanie","Europe"],["EE","Estonie","Europe"],
["LV","Lettonie","Europe"],["LT","Lituanie","Europe"],["UA","Ukraine","Europe"],["BY","Biélorussie","Europe"],
["MD","Moldavie","Europe"],["RU","Russie","Europe"],["MT","Malte","Europe"],["CY","Chypre","Europe"],
["LI","Liechtenstein","Europe"],["MC","Monaco","Europe"],["AD","Andorre","Europe"],["SM","Saint-Marin","Europe"],
["VA","Vatican","Europe"],["XK","Kosovo","Europe"],
["MA","Maroc","Afrique"],["DZ","Algérie","Afrique"],["TN","Tunisie","Afrique"],["LY","Libye","Afrique"],
["EG","Égypte","Afrique"],["SN","Sénégal","Afrique"],["ML","Mali","Afrique"],["CI","Côte d'Ivoire","Afrique"],
["GH","Ghana","Afrique"],["NG","Nigeria","Afrique"],["CM","Cameroun","Afrique"],["GA","Gabon","Afrique"],
["CD","RD Congo","Afrique"],["CG","Congo","Afrique"],["KE","Kenya","Afrique"],["TZ","Tanzanie","Afrique"],
["UG","Ouganda","Afrique"],["RW","Rwanda","Afrique"],["ET","Éthiopie","Afrique"],["SO","Somalie","Afrique"],
["ZA","Afrique du Sud","Afrique"],["NA","Namibie","Afrique"],["BW","Botswana","Afrique"],["ZM","Zambie","Afrique"],
["ZW","Zimbabwe","Afrique"],["MZ","Mozambique","Afrique"],["MG","Madagascar","Afrique"],["MU","Maurice","Afrique"],
["SC","Seychelles","Afrique"],["CV","Cap-Vert","Afrique"],["BF","Burkina Faso","Afrique"],["NE","Niger","Afrique"],
["TD","Tchad","Afrique"],["TG","Togo","Afrique"],["BJ","Bénin","Afrique"],["GN","Guinée","Afrique"],
["SL","Sierra Leone","Afrique"],["LR","Liberia","Afrique"],["MR","Mauritanie","Afrique"],["SD","Soudan","Afrique"],
["SS","Soudan du Sud","Afrique"],["ER","Érythrée","Afrique"],["DJ","Djibouti","Afrique"],["AO","Angola","Afrique"],
["MW","Malawi","Afrique"],["LS","Lesotho","Afrique"],["SZ","Eswatini","Afrique"],["GM","Gambie","Afrique"],
["GW","Guinée-Bissau","Afrique"],["GQ","Guinée équatoriale","Afrique"],["KM","Comores","Afrique"],["ST","Sao Tomé-et-Principe","Afrique"],
["US","États-Unis","Amérique du Nord"],["CA","Canada","Amérique du Nord"],["MX","Mexique","Amérique du Nord"],
["CU","Cuba","Amérique du Nord"],["JM","Jamaïque","Amérique du Nord"],["HT","Haïti","Amérique du Nord"],
["DO","République dominicaine","Amérique du Nord"],["BS","Bahamas","Amérique du Nord"],["BZ","Belize","Amérique du Nord"],
["GT","Guatemala","Amérique du Nord"],["HN","Honduras","Amérique du Nord"],["SV","Salvador","Amérique du Nord"],
["NI","Nicaragua","Amérique du Nord"],["CR","Costa Rica","Amérique du Nord"],["PA","Panama","Amérique du Nord"],
["TT","Trinité-et-Tobago","Amérique du Nord"],["BB","Barbade","Amérique du Nord"],["PR","Porto Rico","Amérique du Nord"],
["BR","Brésil","Amérique du Sud"],["AR","Argentine","Amérique du Sud"],["CL","Chili","Amérique du Sud"],
["PE","Pérou","Amérique du Sud"],["CO","Colombie","Amérique du Sud"],["VE","Venezuela","Amérique du Sud"],
["EC","Équateur","Amérique du Sud"],["BO","Bolivie","Amérique du Sud"],["PY","Paraguay","Amérique du Sud"],
["UY","Uruguay","Amérique du Sud"],["GY","Guyana","Amérique du Sud"],["SR","Suriname","Amérique du Sud"],
["GF","Guyane française","Amérique du Sud"],
["CN","Chine","Asie"],["JP","Japon","Asie"],["KR","Corée du Sud","Asie"],["KP","Corée du Nord","Asie"],
["IN","Inde","Asie"],["PK","Pakistan","Asie"],["BD","Bangladesh","Asie"],["LK","Sri Lanka","Asie"],
["NP","Népal","Asie"],["BT","Bhoutan","Asie"],["MM","Birmanie","Asie"],["TH","Thaïlande","Asie"],
["VN","Vietnam","Asie"],["LA","Laos","Asie"],["KH","Cambodge","Asie"],["MY","Malaisie","Asie"],
["SG","Singapour","Asie"],["ID","Indonésie","Asie"],["PH","Philippines","Asie"],["BN","Brunei","Asie"],
["TL","Timor oriental","Asie"],["MN","Mongolie","Asie"],["KZ","Kazakhstan","Asie"],["UZ","Ouzbékistan","Asie"],
["TM","Turkménistan","Asie"],["TJ","Tadjikistan","Asie"],["KG","Kirghizistan","Asie"],["AF","Afghanistan","Asie"],
["IR","Iran","Asie"],["IQ","Irak","Asie"],["SA","Arabie saoudite","Asie"],["AE","Émirats arabes unis","Asie"],
["QA","Qatar","Asie"],["KW","Koweït","Asie"],["BH","Bahreïn","Asie"],["OM","Oman","Asie"],["YE","Yémen","Asie"],
["JO","Jordanie","Asie"],["LB","Liban","Asie"],["SY","Syrie","Asie"],["IL","Israël","Asie"],["PS","Palestine","Asie"],
["TR","Turquie","Asie"],["GE","Géorgie","Asie"],["AM","Arménie","Asie"],["AZ","Azerbaïdjan","Asie"],
["TW","Taïwan","Asie"],["HK","Hong Kong","Asie"],["MO","Macao","Asie"],
["AU","Australie","Océanie"],["NZ","Nouvelle-Zélande","Océanie"],["FJ","Fidji","Océanie"],
["PG","Papouasie-Nouvelle-Guinée","Océanie"],["WS","Samoa","Océanie"],["TO","Tonga","Océanie"],
["VU","Vanuatu","Océanie"],["NC","Nouvelle-Calédonie","Océanie"],["PF","Polynésie française","Océanie"],
["SB","Îles Salomon","Océanie"],["KI","Kiribati","Océanie"],["FM","Micronésie","Océanie"],
["PW","Palaos","Océanie"],["MH","Îles Marshall","Océanie"],["NR","Nauru","Océanie"],["TV","Tuvalu","Océanie"]
];
const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c=>[c[0],c]));

function flagEmoji(code){
  if(!code) return "🌍";
  return code.toUpperCase().replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/* ===================== Stockage : db > localStorage ===================== */
let dbApi = null, assetsApi = null;
let storageMode = "local"; // "db" or "local"
let trips = [];
const LOCAL_KEY = "carnet-voyage-trips";

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2200);
}

function loadLocal(){
  try{
    const raw = localStorage.getItem(LOCAL_KEY);
    trips = raw ? JSON.parse(raw) : [];
  }catch(e){ trips = []; }
  render();
}
function saveLocal(){
  try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(trips)); }
  catch(e){ toast("Stockage plein : essaie avec moins de photos."); }
}

async function initStorage(){
  const statusEl = document.getElementById('syncStatus');
  try{
    dbApi = await window.claude?.use?.("db");
  }catch(e){ dbApi = null; }

  if(dbApi){
    storageMode = "db";
    statusEl.textContent = "synchronisé";
    try{
      assetsApi = await window.claude?.use?.("assets");
    }catch(e){ assetsApi = null; }

    try{
      dbApi.collection("trips").onSnapshot((docs)=>{
        trips = (docs||[]).map(d => d.data ? {id:d.id, ...d.data} : d).sort(sortTrips);
        render();
      });
    }catch(e){
      // fallback one-time read if onSnapshot unsupported in this shape
      try{
        const res = await dbApi.collection("trips").get();
        trips = (res||[]).map(d => d.data ? {id:d.id, ...d.data} : d).sort(sortTrips);
      }catch(e2){ trips = []; }
      render();
    }
  } else {
    storageMode = "local";
    statusEl.textContent = "";
    loadLocal();
  }
}

function sortTrips(a,b){
  return (b.dateStart||"").localeCompare(a.dateStart||"");
}

async function persistTrip(trip){
  if(storageMode === "db" && dbApi){
    await dbApi.doc("trips/" + trip.id).set(trip);
  } else {
    const idx = trips.findIndex(t=>t.id===trip.id);
    if(idx>=0) trips[idx] = trip; else trips.push(trip);
    trips.sort(sortTrips);
    saveLocal();
    render();
  }
}

async function deleteTripById(id){
  if(storageMode === "db" && dbApi){
    await dbApi.doc("trips/" + id).delete();
  } else {
    trips = trips.filter(t=>t.id!==id);
    saveLocal();
    render();
  }
}

/* ===================== Photos ===================== */
function resizeImage(file, maxDim=1600, quality=0.85){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let {width,height} = img;
      if(width>height && width>maxDim){ height = height*maxDim/width; width = maxDim; }
      else if(height>=width && height>maxDim){ width = width*maxDim/height; height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function blobToDataURL(blob){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

let pendingPhotos = []; // {blob, previewUrl} before save

async function handleFiles(fileList){
  for(const file of fileList){
    if(!file.type.startsWith('image/')) continue;
    try{
      const blob = await resizeImage(file);
      const previewUrl = URL.createObjectURL(blob);
      pendingPhotos.push({blob, previewUrl});
    }catch(e){ /* skip bad file */ }
  }
  renderPreview();
}

function renderPreview(){
  const box = document.getElementById('uploadPreview');
  box.innerHTML = '';
  pendingPhotos.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML = `<img src="${p.previewUrl}"><button type="button" class="rm" data-i="${i}">×</button>`;
    box.appendChild(div);
  });
  box.querySelectorAll('.rm').forEach(btn=>{
    btn.onclick = ()=>{
      const i = +btn.dataset.i;
      pendingPhotos.splice(i,1);
      renderPreview();
    };
  });
}

async function photosToStorable(){
  // Returns array to store on the trip: either {id} (assets) or {url} (dataURL or direct link)
  const out = [];
  for(const p of pendingPhotos){
    if(p.isUrl){
      out.push({url: p.previewUrl});
      continue;
    }
    if(assetsApi){
      try{
        const res = await assetsApi.upload(p.blob);
        out.push({id: res.id});
        continue;
      }catch(e){ /* fall through to dataURL */ }
    }
    const dataUrl = await blobToDataURL(p.blob);
    out.push({url: dataUrl});
  }
  return out;
}
function photoUrl(p){
  if(p.url) return p.url;
  if(p.id) return "/_blob/" + p.id;
  return "";
}

/* ===================== Rendu ===================== */
function formatDateRange(start, end){
  if(!start) return "";
  const opts = {day:'numeric', month:'long', year:'numeric'};
  const s = new Date(start+"T00:00:00");
  const sStr = s.toLocaleDateString('fr-FR', opts);
  if(!end || end===start) return sStr;
  const e = new Date(end+"T00:00:00");
  if(s.getFullYear()===e.getFullYear() && s.getMonth()===e.getMonth()){
    return `${s.getDate()} – ${e.toLocaleDateString('fr-FR', opts)}`;
  }
  return `${sStr} – ${e.toLocaleDateString('fr-FR', opts)}`;
}
function yearOf(trip){
  return trip.dateStart ? trip.dateStart.slice(0,4) : "Sans date";
}

let allPhotosFlat = []; // for lightbox nav across whole page

function render(){
  const tl = document.getElementById('timeline');
  tl.innerHTML = '';
  allPhotosFlat = [];

  const countries = new Set(trips.map(t=>t.countryCode));
  document.getElementById('statCountries').textContent = countries.size;
  document.getElementById('statTrips').textContent = trips.length;
  document.getElementById('statPhotos').textContent = trips.reduce((n,t)=>n+(t.photos?t.photos.length:0),0);
  document.getElementById('statLikes').textContent = trips.reduce((n,t)=>n+(t.likes||0),0);

  if(trips.length===0){
    tl.innerHTML = `<div class="empty-state">
      <p>Aucune étape pour l'instant. Le premier tampon sur le carnet, c'est pour bientôt.</p>
      <button class="btn btn-solid" id="emptyAdd">+ Ajouter un voyage</button>
    </div>`;
    document.getElementById('emptyAdd').onclick = openAddModal;
    return;
  }

  let lastYear = null;
  trips.forEach(trip=>{
    const y = yearOf(trip);
    if(y!==lastYear){
      const yEl = document.createElement('div');
      yEl.className = 'year-marker';
      yEl.textContent = y;
      tl.appendChild(yEl);
      lastYear = y;
    }
    tl.appendChild(renderTripCard(trip));
  });
}

function renderTripCard(trip){
  const country = COUNTRY_MAP[trip.countryCode];
  const countryName = country ? country[1] : (trip.country || "Quelque part");
  const el = document.createElement('article');
  el.className = 'trip';
  el.innerHTML = `
    <div class="trip-top">
      <div class="trip-place">
        <span class="flag">${flagEmoji(trip.countryCode)}</span>
        <h3>${countryName}</h3>
        ${trip.city ? `<span class="trip-city">— ${escapeHtml(trip.city)}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="trip-dates">${formatDateRange(trip.dateStart, trip.dateEnd)}</span>
        <div class="trip-actions">
          <button class="btn-icon" title="J'aime" data-act="like">♡ <span class="like-count">${trip.likes||0}</span></button>
          <button class="btn-icon" title="Partager cette étape" data-act="share">↗</button>
          <button class="btn-icon" title="Modifier" data-act="edit">✎</button>
          <button class="btn-icon" title="Supprimer" data-act="del">🗑</button>
        </div>
      </div>
    </div>
    <p class="trip-story">${escapeHtml(trip.story||'')}</p>
    <div class="photo-grid"></div>
  `;
  const grid = el.querySelector('.photo-grid');
  (trip.photos||[]).forEach(p=>{
    const url = photoUrl(p);
    if(!url) return;
    const globalIndex = allPhotosFlat.length;
    allPhotosFlat.push(url);
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<img src="${url}" loading="lazy" alt="">`;
    b.onclick = ()=>openLightbox(globalIndex);
    grid.appendChild(b);
  });

  const likeBtn = el.querySelector('[data-act="like"]');
  const likedKey = 'liked-' + trip.id;
  if(localStorage.getItem(likedKey)){
    likeBtn.classList.add('liked');
    likeBtn.innerHTML = `♥ <span class="like-count">${trip.likes||0}</span>`;
  }
  likeBtn.onclick = ()=>{
    const alreadyLiked = !!localStorage.getItem(likedKey);
    const updated = {...trip, likes: Math.max(0,(trip.likes||0) + (alreadyLiked ? -1 : 1))};
    if(alreadyLiked) localStorage.removeItem(likedKey); else localStorage.setItem(likedKey, '1');
    persistTrip(updated);
  };
  el.querySelector('[data-act="share"]').onclick = ()=>shareContent(
    `Notre étape ${countryName}${trip.city ? ' — ' + trip.city : ''} sur Escales en couleurs`
  );
  el.querySelector('[data-act="edit"]').onclick = ()=>openEditModal(trip);
  el.querySelector('[data-act="del"]').onclick = ()=>{
    if(confirm(`Supprimer l'étape « ${countryName} » ?`)){
      deleteTripById(trip.id);
      toast("Étape supprimée");
    }
  };
  return el;
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ===================== Modal formulaire ===================== */
const overlay = document.getElementById('overlay');
const form = document.getElementById('tripForm');
let editingId = null;

function populateCountrySelect(){
  const sel = document.getElementById('countrySelect');
  const byContinent = {};
  COUNTRIES.forEach(c=>{
    byContinent[c[2]] = byContinent[c[2]] || [];
    byContinent[c[2]].push(c);
  });
  sel.innerHTML = '<option value="">Choisir un pays…</option>';
  Object.keys(byContinent).forEach(cont=>{
    const group = document.createElement('optgroup');
    group.label = cont;
    byContinent[cont].forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c[0];
      opt.textContent = `${flagEmoji(c[0])} ${c[1]}`;
      group.appendChild(opt);
    });
    sel.appendChild(group);
  });
}

function openAddModal(){
  editingId = null;
  document.getElementById('modalTitle').textContent = "Ajouter une étape";
  document.getElementById('saveTrip').textContent = "Enregistrer l'étape";
  form.reset();
  pendingPhotos = [];
  renderPreview();
  overlay.classList.add('open');
}
function openEditModal(trip){
  editingId = trip.id;
  document.getElementById('modalTitle').textContent = "Modifier l'étape";
  document.getElementById('saveTrip').textContent = "Mettre à jour";
  document.getElementById('countrySelect').value = trip.countryCode || '';
  document.getElementById('cityInput').value = trip.city || '';
  document.getElementById('dateStart').value = trip.dateStart || '';
  document.getElementById('dateEnd').value = trip.dateEnd || '';
  document.getElementById('storyInput').value = trip.story || '';
  pendingPhotos = [];
  renderPreview();
  overlay._existingPhotos = trip.photos || [];
  overlay.classList.add('open');
}
function closeModal(){
  overlay.classList.remove('open');
  overlay._existingPhotos = null;
  pendingPhotos.forEach(p=>URL.revokeObjectURL(p.previewUrl));
  pendingPhotos = [];
}

document.getElementById('openAdd').onclick = openAddModal;

/* ===================== Partage ===================== */
function shareContent(text){
  const url = window.location.href;
  if(navigator.share){
    navigator.share({title: text, url}).catch(()=>{});
    return;
  }
  pendingShareText = text;
  document.getElementById('shareMenu').classList.add('open');
}
let pendingShareText = "Escales en couleurs — notre carnet de voyage";

document.getElementById('shareSiteBtn').onclick = (e)=>{
  e.stopPropagation();
  shareContent("Escales en couleurs — notre carnet de voyage");
};
document.getElementById('shareMenu').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-net]');
  if(!btn) return;
  const url = window.location.href;
  const text = pendingShareText;
  const net = btn.dataset.net;
  if(net==='whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  if(net==='facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  if(net==='x') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  if(net==='copy'){
    navigator.clipboard?.writeText(url).then(()=>toast("Lien copié")).catch(()=>toast("Impossible de copier le lien"));
  }
  document.getElementById('shareMenu').classList.remove('open');
});
document.addEventListener('click', (e)=>{
  const menu = document.getElementById('shareMenu');
  if(menu.classList.contains('open') && !menu.contains(e.target) && e.target.id!=='shareSiteBtn'){
    menu.classList.remove('open');
  }
});
document.getElementById('cancelModal').onclick = closeModal;
overlay.addEventListener('click', e=>{ if(e.target===overlay) closeModal(); });

document.getElementById('fileInput').onchange = (e)=>{ handleFiles(e.target.files); e.target.value=''; };
document.getElementById('addPhotoUrl').onclick = ()=>{
  const input = document.getElementById('photoUrlInput');
  const url = input.value.trim();
  if(!url) return;
  try{ new URL(url); }catch(e){ toast("Ce lien ne semble pas valide"); return; }
  pendingPhotos.push({isUrl:true, previewUrl:url});
  input.value = '';
  renderPreview();
};

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const saveBtn = document.getElementById('saveTrip');
  const countryCode = document.getElementById('countrySelect').value;
  if(!countryCode){ toast("Choisis un pays"); return; }
  saveBtn.disabled = true;
  saveBtn.textContent = "Enregistrement…";
  try{
    const newPhotos = await photosToStorable();
    const existing = overlay._existingPhotos || [];
    const trip = {
      id: editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2,7)),
      countryCode,
      country: (COUNTRY_MAP[countryCode]||[])[1] || '',
      city: document.getElementById('cityInput').value.trim(),
      dateStart: document.getElementById('dateStart').value,
      dateEnd: document.getElementById('dateEnd').value,
      story: document.getElementById('storyInput').value.trim(),
      photos: existing.concat(newPhotos),
      createdAt: Date.now()
    };
    await persistTrip(trip);
    toast(editingId ? "Étape mise à jour" : "Étape ajoutée");
    closeModal();
  }catch(err){
    toast("Un souci est survenu, réessaie.");
  }finally{
    saveBtn.disabled = false;
    saveBtn.textContent = editingId ? "Mettre à jour" : "Enregistrer l'étape";
  }
});

/* ===================== Lightbox ===================== */
const lightbox = document.getElementById('lightbox');
let lbIndex = 0;
function openLightbox(i){
  lbIndex = i;
  document.getElementById('lbImg').src = allPhotosFlat[i];
  lightbox.classList.add('open');
}
function closeLightbox(){ lightbox.classList.remove('open'); }
document.getElementById('lbClose').onclick = closeLightbox;
lightbox.addEventListener('click', e=>{ if(e.target===lightbox) closeLightbox(); });
document.getElementById('lbPrev').onclick = ()=>{
  lbIndex = (lbIndex - 1 + allPhotosFlat.length) % allPhotosFlat.length;
  document.getElementById('lbImg').src = allPhotosFlat[lbIndex];
};
document.getElementById('lbNext').onclick = ()=>{
  lbIndex = (lbIndex + 1) % allPhotosFlat.length;
  document.getElementById('lbImg').src = allPhotosFlat[lbIndex];
};
document.addEventListener('keydown', e=>{
  if(lightbox.classList.contains('open')){
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') document.getElementById('lbPrev').click();
    if(e.key==='ArrowRight') document.getElementById('lbNext').click();
  }
  if(overlay.classList.contains('open') && e.key==='Escape') closeModal();
});

/* ===================== Titre éditable (persisté localement) ===================== */
['siteTitle','siteHeadline','siteLede'].forEach(id=>{
  const el = document.getElementById(id);
  const key = 'carnet-voyage-' + id;
  const saved = localStorage.getItem(key);
  if(saved) el.textContent = saved;
  el.addEventListener('blur', ()=>localStorage.setItem(key, el.textContent));
});

/* ===================== Init ===================== */
populateCountrySelect();
initStorage();
