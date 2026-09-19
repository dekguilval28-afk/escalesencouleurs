/* ===================== Configuration Supabase =====================
   Remplace les deux valeurs ci-dessous par celles de ton projet Supabase
   (Project Settings > API). Tant qu'elles ne sont pas remplacées,
   le site fonctionne en mode démo local (pas de comptes, pas de partage
   entre appareils). */
const SUPABASE_URL = "https://gaazttgwdbpgxlznwikq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7JF2hJhSzFjcCvKrhjR9zw_ss9s-edH";

let sb = null;
if(typeof window.supabase !== 'undefined' && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20){
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let currentUser = null; // {id, pseudo}

function pseudoToEmail(pseudo){
  const slug = pseudo.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  return `${slug || 'voyageur'}@escalesencouleurs.app`;
}

function updateAuthUI(){
  const authBtn = document.getElementById('authBtn');
  const inboxBtn = document.getElementById('inboxBtn');
  if(currentUser){
    authBtn.textContent = `${currentUser.pseudo} · Mon compte`;
    inboxBtn.style.display = sb ? 'inline-block' : 'none';
  } else {
    authBtn.textContent = 'Connexion';
    inboxBtn.style.display = 'none';
  }
}

async function restoreSession(){
  if(!sb) { updateAuthUI(); return; }
  const { data:{ session } } = await sb.auth.getSession();
  if(session?.user){
    currentUser = { id: session.user.id, pseudo: session.user.user_metadata?.pseudo || 'Voyageur' };
  }
  updateAuthUI();
  if(currentUser) refreshInboxCount();
  sb.auth.onAuthStateChange((event, session)=>{
    if(session?.user){
      currentUser = { id: session.user.id, pseudo: session.user.user_metadata?.pseudo || 'Voyageur' };
    } else {
      currentUser = null;
    }
    updateAuthUI();
    if(currentUser) refreshInboxCount();
  });
}

document.getElementById('authBtn').onclick = async ()=>{
  if(currentUser){
    document.getElementById('accountPseudo').textContent = currentUser.pseudo;
    document.getElementById('accountOverlay').classList.add('open');
    return;
  }
  if(!sb){
    toast("Configure Supabase d'abord pour activer les comptes.");
    return;
  }
  authMode = 'login';
  openAuthModal();
};

document.getElementById('accountClose').onclick = ()=>document.getElementById('accountOverlay').classList.remove('open');
document.getElementById('accountOverlay').addEventListener('click', e=>{
  if(e.target.id === 'accountOverlay') document.getElementById('accountOverlay').classList.remove('open');
});
document.getElementById('accountSignOut').onclick = async ()=>{
  await sb.auth.signOut();
  document.getElementById('accountOverlay').classList.remove('open');
  toast("Déconnecté");
};
document.getElementById('accountDelete').onclick = async ()=>{
  if(!confirm("Supprimer ton compte ? Tous les voyages que tu as ajoutés seront définitivement supprimés. Cette action est irréversible.")) return;
  const btn = document.getElementById('accountDelete');
  btn.disabled = true;
  try{
    await sb.from('trips').delete().eq('user_id', currentUser.id);
    await loadSupabaseTrips();
    await sb.auth.signOut();
    document.getElementById('accountOverlay').classList.remove('open');
    toast("Tes voyages ont été supprimés et tu es déconnecté(e).");
  }catch(e){
    toast("Une erreur est survenue.");
  }finally{
    btn.disabled = false;
  }
};

let authMode = 'login';
function openAuthModal(){
  document.getElementById('authTitle').textContent = authMode === 'login' ? "Connexion" : "Créer un compte";
  document.getElementById('authSubmit').textContent = authMode === 'login' ? "Se connecter" : "Créer le compte";
  document.getElementById('authToggleMode').textContent = authMode === 'login' ? "Créer un compte" : "J'ai déjà un compte";
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authForm').reset();
  document.getElementById('authOverlay').classList.add('open');
}
function closeAuthModal(){
  document.getElementById('authOverlay').classList.remove('open');
}
document.getElementById('authToggleMode').onclick = ()=>{
  authMode = authMode === 'login' ? 'signup' : 'login';
  openAuthModal();
};
document.getElementById('authCancel').onclick = closeAuthModal;
document.getElementById('authOverlay').addEventListener('click', e=>{
  if(e.target.id === 'authOverlay') closeAuthModal();
});

document.getElementById('authForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const pseudo = document.getElementById('authPseudo').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';
  const submitBtn = document.getElementById('authSubmit');
  submitBtn.disabled = true;
  try{
    const email = pseudoToEmail(pseudo);
    if(authMode === 'signup'){
      const { data, error } = await sb.auth.signUp({ email, password, options:{ data:{ pseudo } } });
      if(error) throw error;
      if(!data.session){
        errEl.textContent = "Compte créé. Essaie de te connecter.";
        errEl.style.display = 'block';
        authMode = 'login';
        openAuthModal();
        submitBtn.disabled = false;
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error) throw error;
    }
    closeAuthModal();
    toast(authMode === 'signup' ? "Bienvenue !" : "Connecté");
  }catch(err){
    errEl.textContent = err.message?.includes('Invalid login') ? "Pseudo ou mot de passe incorrect." : (err.message || "Une erreur est survenue.");
    errEl.style.display = 'block';
  }finally{
    submitBtn.disabled = false;
  }
});

function requireAuth(){
  if(!sb) return true; // mode démo : pas de restriction
  if(currentUser) return true;
  authMode = 'login';
  openAuthModal();
  toast("Connecte-toi pour continuer");
  return false;
}

/* ===================== Messages de contact ===================== */
document.getElementById('contactBubbleBtn').onclick = ()=>{
  document.getElementById('contactPanel').classList.toggle('open');
};
document.getElementById('contactSend').onclick = async ()=>{
  const name = document.getElementById('contactName').value.trim();
  const contact = document.getElementById('contactContact').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  if(!message){ toast("Écris un message d'abord"); return; }
  if(!sb){
    toast("La messagerie sera active une fois Supabase connecté.");
    return;
  }
  try{
    const owner_token = crypto.randomUUID();
    const { error } = await sb.from('messages')
      .insert({ name: name || null, contact: contact || null, message, owner_token });
    if(error) throw error;
    saveSentMessageLocally({ owner_token, message, created_at: new Date().toISOString() });
    toast("Message envoyé, merci !");
    document.getElementById('contactName').value = '';
    document.getElementById('contactContact').value = '';
    document.getElementById('contactMessage').value = '';
    document.getElementById('contactPanel').classList.remove('open');
  }catch(err){
    toast("Impossible d'envoyer le message.");
  }
};

const SENT_KEY = 'sent-messages';
function saveSentMessageLocally(row){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(SENT_KEY) || '[]'); }catch(e){}
  list.unshift({ owner_token: row.owner_token, message: row.message, created_at: row.created_at });
  try{ localStorage.setItem(SENT_KEY, JSON.stringify(list)); }catch(e){}
}

document.getElementById('myMessagesLink').onclick = ()=>{
  document.getElementById('contactPanel').classList.remove('open');
  renderMyMessages();
  document.getElementById('myMessagesOverlay').classList.add('open');
};
document.getElementById('myMessagesClose').onclick = ()=>document.getElementById('myMessagesOverlay').classList.remove('open');
document.getElementById('myMessagesOverlay').addEventListener('click', e=>{
  if(e.target.id === 'myMessagesOverlay') document.getElementById('myMessagesOverlay').classList.remove('open');
});

function renderMyMessages(){
  const list = document.getElementById('myMessagesList');
  let sent = [];
  try{ sent = JSON.parse(localStorage.getItem(SENT_KEY) || '[]'); }catch(e){}
  if(!sent.length){
    list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucun message envoyé depuis cet appareil.</p>';
    return;
  }
  list.innerHTML = '';
  sent.forEach(m=>{
    const d = new Date(m.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'});
    const div = document.createElement('div');
    div.className = 'inbox-item';
    div.innerHTML = `<div class="when">${d}</div><div class="msg">${escapeHtml(m.message)}</div>`;
    const rm = document.createElement('button');
    rm.className = 'btn btn-ghost btn-small';
    rm.style.marginTop = '8px';
    rm.textContent = 'Retirer ce message';
    rm.onclick = async ()=>{
      if(!confirm("Retirer définitivement ce message ?")) return;
      try{
        await sb.from('messages').delete().eq('owner_token', m.owner_token);
        let updated = sent.filter(x=>x.owner_token !== m.owner_token);
        localStorage.setItem(SENT_KEY, JSON.stringify(updated));
        toast("Message retiré");
        renderMyMessages();
      }catch(e){ toast("Impossible de retirer ce message."); }
    };
    div.appendChild(rm);
    list.appendChild(div);
  });
}

async function refreshInboxCount(){
  if(!sb || !currentUser) return;
  try{
    const { count } = await sb.from('messages').select('*', { count:'exact', head:true }).eq('read', false);
    const el = document.getElementById('inboxCount');
    el.textContent = count ? `(${count})` : '';
  }catch(e){}
}

document.getElementById('inboxBtn').onclick = async ()=>{
  if(!sb || !currentUser) return;
  const list = document.getElementById('inboxList');
  list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Chargement…</p>';
  document.getElementById('inboxOverlay').classList.add('open');
  try{
    const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending:false });
    if(error) throw error;
    if(!data.length){
      list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucun message pour l\'instant.</p>';
      return;
    }
    list.innerHTML = '';
    data.forEach(m=>{
      const div = document.createElement('div');
      div.className = 'inbox-item';
      const d = new Date(m.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
      div.innerHTML = `<div class="who">${escapeHtml(m.name || 'Anonyme')}</div><div class="when">${d}</div>${m.contact ? `<div class="when">📧 ${escapeHtml(m.contact)}</div>` : ''}<div class="msg">${escapeHtml(m.message)}</div>`;
      const rm = document.createElement('button');
      rm.className = 'btn btn-ghost btn-small';
      rm.style.marginTop = '8px';
      rm.textContent = 'Supprimer';
      rm.onclick = async ()=>{
        if(!confirm("Supprimer ce message ?")) return;
        try{
          const { error } = await sb.from('messages').delete().eq('id', m.id);
          if(error) throw error;
          toast("Message supprimé");
          document.getElementById('inboxBtn').click();
        }catch(e){ toast("Impossible de supprimer ce message."); }
      };
      div.appendChild(rm);
      list.appendChild(div);
    });
    await sb.from('messages').update({ read:true }).eq('read', false);
    refreshInboxCount();
  }catch(err){
    list.innerHTML = '<p style="color:var(--stamp);font-size:14px;">Impossible de charger les messages.</p>';
  }
};
document.getElementById('inboxClose').onclick = ()=>document.getElementById('inboxOverlay').classList.remove('open');
document.getElementById('inboxOverlay').addEventListener('click', e=>{
  if(e.target.id === 'inboxOverlay') document.getElementById('inboxOverlay').classList.remove('open');
});

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

/* ===================== Stockage : Supabase > db (aperçu Claude) > localStorage ===================== */
let dbApi = null, assetsApi = null;
let storageMode = "local"; // "supabase" | "db" | "local"
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

function rowToTrip(row){
  return {
    id: row.id,
    countryCode: row.country_code,
    country: row.country,
    city: row.city,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    story: row.story,
    photos: row.photos || [],
    likes: row.likes || 0,
    pseudo: row.pseudo
  };
}

async function loadSupabaseTrips(){
  const { data, error } = await sb.from('trips').select('*').order('date_start', { ascending:false });
  if(error){ toast("Impossible de charger les voyages."); return; }
  trips = (data || []).map(rowToTrip);
  render();
}

async function initStorage(){
  const statusEl = document.getElementById('syncStatus');

  if(sb){
    storageMode = "supabase";
    statusEl.textContent = "partagé en ligne";
    await loadSupabaseTrips();
    sb.channel('trips-changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'trips' }, loadSupabaseTrips)
      .subscribe();
    return;
  }

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
      try{
        const res = await dbApi.collection("trips").get();
        trips = (res||[]).map(d => d.data ? {id:d.id, ...d.data} : d).sort(sortTrips);
      }catch(e2){ trips = []; }
      render();
    }
  } else {
    storageMode = "local";
    statusEl.textContent = sb === null && SUPABASE_URL.startsWith('http') ? "" : "mode démo";
    loadLocal();
  }
}

function sortTrips(a,b){
  return (b.dateStart||"").localeCompare(a.dateStart||"");
}

async function persistTrip(trip){
  if(storageMode === "supabase"){
    const row = {
      user_id: currentUser?.id || null,
      pseudo: currentUser?.pseudo || 'Anonyme',
      country_code: trip.countryCode,
      country: trip.country,
      city: trip.city,
      date_start: trip.dateStart || null,
      date_end: trip.dateEnd || null,
      story: trip.story,
      photos: trip.photos,
      likes: trip.likes || 0
    };
    if(trip.isExisting){
      const { error } = await sb.from('trips').update(row).eq('id', trip.id);
      if(error) toast("Impossible d'enregistrer.");
    } else {
      const { error } = await sb.from('trips').insert(row);
      if(error) toast("Impossible d'enregistrer.");
    }
    await loadSupabaseTrips();
  } else if(storageMode === "db" && dbApi){
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
  if(storageMode === "supabase"){
    const { error } = await sb.from('trips').delete().eq('id', id);
    if(error) toast("Impossible de supprimer.");
    await loadSupabaseTrips();
  } else if(storageMode === "db" && dbApi){
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

async function uploadToSupabase(blob){
  const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
  const { error } = await sb.storage.from('trip-photos').upload(path, blob, { contentType:'image/jpeg' });
  if(error) throw error;
  const { data } = sb.storage.from('trip-photos').getPublicUrl(path);
  return data.publicUrl;
}

async function photosToStorable(){
  // Returns array to store on the trip: either {id} (assets) or {url} (Supabase/dataURL/lien)
  const out = [];
  for(const p of pendingPhotos){
    if(p.isUrl){
      out.push({url: p.previewUrl});
      continue;
    }
    if(storageMode === "supabase"){
      try{
        const url = await uploadToSupabase(p.blob);
        out.push({url});
        continue;
      }catch(e){ toast("Une photo n'a pas pu être envoyée."); continue; }
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
    ${trip.pseudo ? `<p style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;">ajouté par ${escapeHtml(trip.pseudo)}</p>` : ''}
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
    const updated = {...trip, likes: Math.max(0,(trip.likes||0) + (alreadyLiked ? -1 : 1)), isExisting: storageMode==='supabase'};
    if(alreadyLiked) localStorage.removeItem(likedKey); else localStorage.setItem(likedKey, '1');
    persistTrip(updated);
  };
  el.querySelector('[data-act="share"]').onclick = ()=>shareContent(
    `Notre étape ${countryName}${trip.city ? ' — ' + trip.city : ''} sur Escales en couleurs`
  );
  el.querySelector('[data-act="edit"]').onclick = ()=>{ if(requireAuth()) openEditModal(trip); };
  el.querySelector('[data-act="del"]').onclick = ()=>{
    if(!requireAuth()) return;
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

document.getElementById('openAdd').onclick = ()=>{ if(requireAuth()) openAddModal(); };

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
      isExisting: !!editingId,
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
restoreSession();
initStorage();
