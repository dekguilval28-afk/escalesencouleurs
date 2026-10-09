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

async function refreshMemberCount(){
  if(!sb) return;
  try{
    const { count } = await sb.from('profiles').select('*', { count:'exact', head:true });
    const el = document.getElementById('accountMemberCount');
    if(el) el.textContent = count ?? 0;
  }catch(e){}
}

function pseudoToEmail(pseudo){
  const slug = pseudo.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  return `${slug || 'voyageur'}@escalesencouleurs.app`;
}

function updateContentGate(){
  const showContent = !sb || !!currentUser; // mode démo (sans Supabase) : toujours visible
  document.getElementById('gatePrompt').style.display = showContent ? 'none' : 'block';
  document.getElementById('gatedContent').style.display = showContent ? 'block' : 'none';
  document.getElementById('timelineSection').style.display = showContent ? 'block' : 'none';
}
document.getElementById('gateLoginBtn').onclick = ()=>{
  authMode = 'login';
  openAuthModal();
};

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
  updateContentGate();
  applyEditableGate();
  try{ artisansOnAuth(); }catch(e){}
}

const OWNER_EMAIL = "dekguilval28@gmail.com";
function applyEditableGate(){
  const isOwner = !sb || (currentUser && currentUser.email === OWNER_EMAIL);
  ['siteTitle','siteHeadline','siteLede'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.setAttribute('contenteditable', isOwner ? 'true' : 'false');
  });
  const membersLink = document.getElementById('viewMembersLink');
  if(membersLink) membersLink.style.display = isOwner && sb ? 'block' : 'none';
}

let membersToRemove = new Set();

function updateRemoveMembersBtn(){
  const btn = document.getElementById('removeMembersBtn');
  btn.textContent = `Retirer la sélection (${membersToRemove.size})`;
  btn.disabled = membersToRemove.size === 0;
}

document.getElementById('viewMembersLink').onclick = async ()=>{
  document.getElementById('accountOverlay').classList.remove('open');
  membersToRemove = new Set();
  updateRemoveMembersBtn();
  const list = document.getElementById('membersList');
  list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Chargement…</p>';
  document.getElementById('membersOverlay').classList.add('open');
  try{
    const { data, error } = await sb.functions.invoke('list-members');
    if(error) throw error;
    const members = data.members || [];
    if(!members.length){
      list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucun membre pour l\'instant.</p>';
      return;
    }
    list.innerHTML = '';
    members.forEach(m=>{
      const d = new Date(m.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'});
      const isMe = currentUser && m.id === currentUser.id;
      const div = document.createElement('div');
      div.className = 'inbox-item';
      div.style.display = 'flex';
      div.style.alignItems = 'flex-start';
      div.style.gap = '10px';
      div.innerHTML = `
        ${isMe ? '<span style="width:18px;"></span>' : `<input type="checkbox" style="width:18px;height:18px;margin-top:2px;cursor:pointer;">`}
        <div><div class="who">${escapeHtml(m.pseudo || 'Sans pseudo')}${isMe ? ' (toi)' : ''}</div><div class="when">${escapeHtml(m.email)} · inscrit le ${d}</div></div>
      `;
      if(!isMe){
        const cb = div.querySelector('input[type="checkbox"]');
        cb.onchange = ()=>{
          if(cb.checked) membersToRemove.add(m.id); else membersToRemove.delete(m.id);
          updateRemoveMembersBtn();
        };
      }
      list.appendChild(div);
    });
  }catch(e){
    list.innerHTML = '<p style="color:var(--stamp);font-size:14px;">Impossible de charger la liste des membres.</p>';
  }
};

document.getElementById('removeMembersBtn').onclick = async ()=>{
  const n = membersToRemove.size;
  if(!n) return;
  if(!confirm(`Retirer définitivement ${n} membre(s) ? Leurs voyages seront aussi supprimés. Cette action est irréversible.`)) return;
  const btn = document.getElementById('removeMembersBtn');
  btn.disabled = true;
  btn.textContent = 'Suppression…';
  let failed = 0;
  for(const id of membersToRemove){
    try{
      const { error } = await sb.functions.invoke('remove-member', { body: { user_id: id } });
      if(error) failed++;
    }catch(e){ failed++; }
  }
  toast(failed ? `${n - failed} membre(s) retiré(s), ${failed} échec(s).` : `${n} membre(s) retiré(s).`);
  await loadSupabaseTrips();
  document.getElementById('viewMembersLink').click();
};

document.getElementById('membersClose').onclick = ()=>document.getElementById('membersOverlay').classList.remove('open');
document.getElementById('membersOverlay').addEventListener('click', e=>{
  if(e.target.id === 'membersOverlay') document.getElementById('membersOverlay').classList.remove('open');
});

async function restoreSession(){
  if(!sb) { updateAuthUI(); return; }
  refreshMemberCount();
  const { data:{ session } } = await sb.auth.getSession();
  if(session?.user){
    currentUser = { id: session.user.id, email: session.user.email, pseudo: session.user.user_metadata?.pseudo || session.user.user_metadata?.user_name || session.user.user_metadata?.full_name || 'Voyageur' };
  }
  updateAuthUI();
  if(currentUser) { refreshInboxCount(); refreshShareReqCount(); }
  sb.auth.onAuthStateChange((event, session)=>{
    if(event === 'PASSWORD_RECOVERY'){
      document.getElementById('newPasswordOverlay').classList.add('open');
    }
    if(session?.user){
      currentUser = { id: session.user.id, email: session.user.email, pseudo: session.user.user_metadata?.pseudo || session.user.user_metadata?.user_name || session.user.user_metadata?.full_name || 'Voyageur' };
    } else {
      currentUser = null;
    }
    updateAuthUI();
    if(currentUser) { refreshInboxCount(); refreshShareReqCount(); }
    if(storageMode === 'supabase') render();
  });
}

document.getElementById('newPasswordForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const newPassword = document.getElementById('newPasswordInput').value;
  const errEl = document.getElementById('newPasswordError');
  errEl.style.display = 'none';
  try{
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if(error) throw error;
    document.getElementById('newPasswordOverlay').classList.remove('open');
    toast("Mot de passe mis à jour !");
  }catch(err){
    errEl.textContent = err.message || "Impossible de mettre à jour le mot de passe.";
    errEl.style.display = 'block';
  }
});

document.getElementById('authBtn').onclick = async ()=>{
  if(currentUser){
    document.getElementById('accountPseudo').textContent = currentUser.pseudo;
    document.getElementById('accountOverlay').classList.add('open');
    refreshMemberCount();
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

document.getElementById('accountSavePseudo').onclick = async ()=>{
  const input = document.getElementById('accountNewPseudo');
  const newPseudo = input.value.trim();
  if(newPseudo.length < 2){ toast("Le pseudo doit faire au moins 2 caractères."); return; }
  if(newPseudo === currentUser.pseudo){ toast("C'est déjà ton pseudo."); return; }
  const btn = document.getElementById('accountSavePseudo');
  btn.disabled = true;
  try{
    const { error } = await sb.auth.updateUser({ data: { pseudo: newPseudo } });
    if(error) throw error;
    // Met à jour le pseudo sur les voyages déjà publiés et dans la table des profils
    await sb.from('trips').update({ pseudo: newPseudo }).eq('user_id', currentUser.id);
    await sb.from('profiles').update({ pseudo: newPseudo }).eq('id', currentUser.id);
    currentUser.pseudo = newPseudo;
    document.getElementById('accountPseudo').textContent = newPseudo;
    input.value = '';
    updateAuthUI();
    await loadSupabaseTrips();
    toast("Pseudo mis à jour !");
  }catch(e){
    toast("Impossible de changer le pseudo pour le moment.");
  }finally{
    btn.disabled = false;
  }
};
document.getElementById('accountOverlay').addEventListener('click', e=>{
  if(e.target.id === 'accountOverlay') document.getElementById('accountOverlay').classList.remove('open');
});
document.getElementById('accountSignOut').onclick = async ()=>{
  await sb.auth.signOut();
  document.getElementById('accountOverlay').classList.remove('open');
  toast("Déconnecté");
};
document.getElementById('accountDelete').onclick = async ()=>{
  if(!confirm("Supprimer définitivement ton compte ? Tes voyages seront supprimés et ton compte ne pourra plus jamais être utilisé pour te reconnecter. Cette action est irréversible.")) return;
  const btn = document.getElementById('accountDelete');
  btn.disabled = true;
  try{
    const { error } = await sb.functions.invoke('delete-account');
    if(error) throw error;
    currentUser = null;
    try{ await sb.auth.signOut(); }catch(e){}
    updateAuthUI();
    await loadSupabaseTrips();
    document.getElementById('accountOverlay').classList.remove('open');
    toast("Ton compte a été définitivement supprimé.");
  }catch(e){
    toast("Une erreur est survenue lors de la suppression du compte.");
  }finally{
    btn.disabled = false;
  }
};

let authMode = 'login';
function openAuthModal(){
  document.getElementById('authTitle').textContent = authMode === 'login' ? "Connexion" : "Créer un compte";
  document.getElementById('authSubmit').textContent = authMode === 'login' ? "Se connecter" : "Créer le compte";
  document.getElementById('authToggleMode').textContent = authMode === 'login' ? "Créer un compte" : "J'ai déjà un compte";
  document.getElementById('authPseudoField').style.display = authMode === 'signup' ? 'block' : 'none';
  document.getElementById('authPseudo').required = authMode === 'signup';
  document.getElementById('authForgotPassword').style.display = authMode === 'login' ? 'block' : 'none';
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
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';
  const submitBtn = document.getElementById('authSubmit');
  submitBtn.disabled = true;
  try{
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
    refreshMemberCount();
  }catch(err){
    errEl.textContent = err.message?.includes('Invalid login') ? "Email ou mot de passe incorrect." : (err.message || "Une erreur est survenue.");
    errEl.style.display = 'block';
  }finally{
    submitBtn.disabled = false;
  }
});

document.getElementById('authForgotPassword').onclick = async ()=>{
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  if(!email){
    errEl.textContent = "Tape d'abord ton email ci-dessus.";
    errEl.style.display = 'block';
    return;
  }
  try{
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if(error) throw error;
    errEl.style.color = 'var(--sage)';
    errEl.textContent = "Email envoyé (si ce compte existe). Vérifie ta boîte mail.";
    errEl.style.display = 'block';
  }catch(err){
    errEl.style.color = 'var(--stamp)';
    errEl.textContent = "Impossible d'envoyer l'email pour le moment.";
    errEl.style.display = 'block';
  }
};

function requireAuth(){
  if(!sb) return true; // mode démo : pas de restriction
  if(currentUser) return true;
  authMode = 'login';
  openAuthModal();
  toast("Connecte-toi pour continuer");
  return false;
}

async function refreshShareReqCount(){
  if(!sb || !currentUser) return;
  try{
    const { count } = await sb.from('share_requests').select('*', { count:'exact', head:true })
      .eq('owner_id', currentUser.id).eq('status', 'pending');
    document.getElementById('shareReqBtn').style.display = 'inline-block';
    document.getElementById('shareReqCount').textContent = count ? `(${count})` : '';
  }catch(e){}
}

document.getElementById('shareReqBtn').onclick = async ()=>{
  const list = document.getElementById('shareReqList');
  list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Chargement…</p>';
  document.getElementById('shareReqOverlay').classList.add('open');
  try{
    const { data, error } = await sb.from('share_requests').select('*')
      .eq('owner_id', currentUser.id).eq('status', 'pending')
      .order('created_at', { ascending:false });
    if(error) throw error;
    if(!data.length){
      list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucune demande en attente.</p>';
      return;
    }
    list.innerHTML = '';
    data.forEach(r=>{
      const trip = trips.find(t=>t.id === r.trip_id);
      const label = trip ? `${flagEmoji(trip.countryCode)} ${trip.country}${trip.city ? ' — ' + trip.city : ''}` : "une étape";
      const div = document.createElement('div');
      div.className = 'inbox-item';
      div.innerHTML = `<div class="who">${escapeHtml(r.requester_pseudo || "Quelqu'un")}</div><div class="msg">souhaite partager : ${escapeHtml(label)}</div>`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;margin-top:10px;';
      const approve = document.createElement('button');
      approve.className = 'btn btn-solid btn-small';
      approve.textContent = 'Accepter';
      approve.onclick = async ()=>{
        await sb.from('share_requests').update({ status:'approved', responded_at: new Date().toISOString() }).eq('id', r.id);
        toast("Demande acceptée");
        document.getElementById('shareReqBtn').click();
        refreshShareReqCount();
      };
      const deny = document.createElement('button');
      deny.className = 'btn btn-ghost btn-small';
      deny.textContent = 'Refuser';
      deny.onclick = async ()=>{
        await sb.from('share_requests').update({ status:'denied', responded_at: new Date().toISOString() }).eq('id', r.id);
        toast("Demande refusée");
        document.getElementById('shareReqBtn').click();
        refreshShareReqCount();
      };
      row.appendChild(approve);
      row.appendChild(deny);
      div.appendChild(row);
      list.appendChild(div);
    });
  }catch(e){
    list.innerHTML = '<p style="color:var(--stamp);font-size:14px;">Impossible de charger les demandes.</p>';
  }
};
document.getElementById('shareReqClose').onclick = ()=>document.getElementById('shareReqOverlay').classList.remove('open');

document.getElementById('mySentReqLink').onclick = async ()=>{
  document.getElementById('accountOverlay').classList.remove('open');
  const list = document.getElementById('sentReqList');
  list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Chargement…</p>';
  document.getElementById('sentReqOverlay').classList.add('open');
  try{
    const { data, error } = await sb.from('share_requests').select('*')
      .eq('requester_id', currentUser.id)
      .order('created_at', { ascending:false });
    if(error) throw error;
    if(!data.length){
      list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucune demande envoyée pour l\'instant.</p>';
      return;
    }
    list.innerHTML = '';
    const statusLabel = { pending:'En attente', approved:'Acceptée ✓', denied:'Refusée ✕' };
    const statusColor = { pending:'var(--ink-soft)', approved:'var(--sage)', denied:'var(--stamp)' };
    data.forEach(r=>{
      const trip = trips.find(t=>t.id === r.trip_id);
      const label = trip ? `${flagEmoji(trip.countryCode)} ${trip.country}${trip.city ? ' — ' + trip.city : ''}` : "une étape";
      const div = document.createElement('div');
      div.className = 'inbox-item';
      div.innerHTML = `<div class="msg">${escapeHtml(label)}</div><div class="when" style="color:${statusColor[r.status]||'var(--ink-soft)'};font-weight:600;">${statusLabel[r.status] || r.status}</div>`;
      list.appendChild(div);
    });
  }catch(e){
    list.innerHTML = '<p style="color:var(--stamp);font-size:14px;">Impossible de charger tes demandes.</p>';
  }
};
document.getElementById('sentReqClose').onclick = ()=>document.getElementById('sentReqOverlay').classList.remove('open');
document.getElementById('sentReqOverlay').addEventListener('click', e=>{
  if(e.target.id === 'sentReqOverlay') document.getElementById('sentReqOverlay').classList.remove('open');
});
document.getElementById('shareReqOverlay').addEventListener('click', e=>{
  if(e.target.id === 'shareReqOverlay') document.getElementById('shareReqOverlay').classList.remove('open');
});

/* ===================== Messages de contact ===================== */
let allMembers = [];
let selectedRecipient = null; // {id, pseudo}

async function loadRecipientOptions(){
  if(!sb || allMembers.length) return;
  try{
    const { data } = await sb.from('profiles').select('id, pseudo').not('pseudo', 'is', null);
    allMembers = data || [];
  }catch(e){}
}

function renderRecipientList(){
  const q = normalizeText(document.getElementById('recipientSearch').value.trim());
  const box = document.getElementById('recipientListBox');
  box.innerHTML = '';
  const matches = allMembers.filter(m => !q || normalizeText(m.pseudo).includes(q));
  if(!matches.length){
    box.innerHTML = '<div class="country-empty">Aucun membre trouvé</div>';
    return;
  }
  matches.forEach(m=>{
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'country-item' + (selectedRecipient?.id === m.id ? ' selected' : '');
    item.innerHTML = `<span>${escapeHtml(m.pseudo)}</span>${selectedRecipient?.id === m.id ? '<span class="check">✓</span>' : ''}`;
    item.onclick = ()=>{
      selectedRecipient = m;
      document.getElementById('recipientSearch').value = m.pseudo;
      document.getElementById('contactRecipient').value = m.id;
      document.getElementById('recipientPicker').classList.remove('open');
    };
    box.appendChild(item);
  });
}

document.getElementById('recipientSearch').addEventListener('focus', async ()=>{
  document.getElementById('recipientPicker').classList.add('open');
  if(!allMembers.length){
    document.getElementById('recipientListBox').innerHTML = '<div class="country-empty">Chargement…</div>';
    await loadRecipientOptions();
  }
  renderRecipientList();
});
document.getElementById('recipientSearch').addEventListener('input', (e)=>{
  if(selectedRecipient && e.target.value !== selectedRecipient.pseudo){
    selectedRecipient = null;
    document.getElementById('contactRecipient').value = '';
  }
  renderRecipientList();
});
document.addEventListener('click', (e)=>{
  const picker = document.getElementById('recipientPicker');
  if(picker && !e.composedPath().includes(picker)){
    picker.classList.remove('open');
  }
});

document.getElementById('contactBubbleBtn').onclick = ()=>{
  document.getElementById('contactPanel').classList.toggle('open');
  loadRecipientOptions();
};
document.getElementById('contactSend').onclick = async ()=>{
  const name = document.getElementById('contactName').value.trim();
  const contact = document.getElementById('contactContact').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  const recipient_id = selectedRecipient?.id || null;
  const recipientLabel = selectedRecipient?.pseudo || null;
  if(!message){ toast("Écris un message d'abord"); return; }
  if(!sb){
    toast("La messagerie sera active une fois Supabase connecté.");
    return;
  }
  try{
    const owner_token = crypto.randomUUID();
    const { error } = await sb.from('messages')
      .insert({ name: name || null, contact: contact || null, message, owner_token, recipient_id });
    if(error) throw error;
    saveSentMessageLocally({ owner_token, message, created_at: new Date().toISOString() });
    sb.functions.invoke('notify-contact', { body: { name, contact, message, recipient_id } }).catch(()=>{});
    toast(recipientLabel ? `Message envoyé à ${recipientLabel} !` : "Message envoyé, merci !");
    document.getElementById('contactName').value = '';
    document.getElementById('contactContact').value = '';
    document.getElementById('contactMessage').value = '';
    document.getElementById('recipientSearch').value = '';
    document.getElementById('contactRecipient').value = '';
    selectedRecipient = null;
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

async function renderMyMessages(){
  const list = document.getElementById('myMessagesList');
  let sent = [];
  try{ sent = JSON.parse(localStorage.getItem(SENT_KEY) || '[]'); }catch(e){}
  if(!sent.length){
    list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucun message envoyé depuis cet appareil.</p>';
    return;
  }
  list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Chargement…</p>';

  // Vérifie auprès de Supabase lesquels existent encore vraiment
  let stillExisting = sent;
  if(sb){
    try{
      const tokens = sent.map(m=>m.owner_token).filter(Boolean);
      const { data } = await sb.from('messages').select('owner_token').in('owner_token', tokens);
      const validTokens = new Set((data||[]).map(r=>r.owner_token));
      stillExisting = sent.filter(m=>validTokens.has(m.owner_token));
      localStorage.setItem(SENT_KEY, JSON.stringify(stillExisting));
    }catch(e){ /* si la vérification échoue, on affiche la liste locale telle quelle */ }
  }

  if(!stillExisting.length){
    list.innerHTML = '<p style="color:var(--ink-soft);font-size:14px;">Aucun message envoyé depuis cet appareil.</p>';
    return;
  }
  list.innerHTML = '';
  stillExisting.forEach(m=>{
    const d = new Date(m.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'});
    const div = document.createElement('div');
    div.className = 'inbox-item';
    div.innerHTML = `<div class="when">${d}</div><div class="msg">${escapeHtml(m.message)}</div>`;
    list.appendChild(div);
  });
}

async function refreshInboxCount(){
  if(!sb || !currentUser) return;
  try{
    const { count } = await sb.from('messages').select('*', { count:'exact', head:true });
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
      div.innerHTML = `<div class="who">${escapeHtml(m.name || 'Anonyme')}</div><div class="when">${d}</div>${m.recipient_id ? `<div class="when" style="color:var(--gold);">🔒 Message privé${m.recipient_id === currentUser.id ? ' (pour toi)' : ''}</div>` : ''}${m.contact ? `<div class="when">📧 ${escapeHtml(m.contact)}</div>` : ''}<div class="msg">${escapeHtml(m.message)}</div>`;
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
    userId: row.user_id,
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
  el.dataset.tripId = trip.id;
  const isOwned = storageMode === 'supabase' && currentUser && trip.userId === currentUser.id;
  el.innerHTML = `
    <div class="trip-top">
      <div class="trip-place">
        <span class="trip-select-box${isOwned ? ' owned' : ''}"><input type="checkbox" data-select-trip></span>
        <span class="flag">${flagEmoji(trip.countryCode)}</span>
        <h3>${countryName}</h3>
        ${trip.city ? `<span class="trip-city">— ${escapeHtml(trip.city)}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="trip-dates">${formatDateRange(trip.dateStart, trip.dateEnd)}</span>
        <div class="trip-actions">
          <button class="btn-icon" title="J'aime" data-act="like">♡ <span class="like-count">${trip.likes||0}</span></button>
          <button class="btn-icon" title="Partager cette étape" data-act="share">↗</button>
          ${canEditTrip(trip) ? `<button class="btn-icon" title="Modifier" data-act="edit">✎</button><button class="btn-icon" title="Supprimer" data-act="del">🗑</button>` : ''}
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
    b.innerHTML = `<img src="${url}" loading="lazy" alt="" draggable="false">`;
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
  el.querySelector('[data-act="share"]').onclick = async ()=>{
    if(!requireAuth()) return;
    const shareText = `Notre étape ${countryName}${trip.city ? ' — ' + trip.city : ''} sur Escales en couleurs`;
    if(storageMode !== 'supabase' || !trip.userId || trip.userId === currentUser.id){
      shareContent(shareText);
      return;
    }
    try{
      const { data: existing } = await sb.from('share_requests')
        .select('*').eq('trip_id', trip.id).eq('requester_id', currentUser.id)
        .order('created_at', { ascending:false }).limit(1);
      const req = existing && existing[0];
      if(req && req.status === 'approved'){ shareContent(shareText); return; }
      if(req && req.status === 'pending'){ toast("Ta demande est en attente de réponse du propriétaire."); return; }
      if(req && req.status === 'denied'){ toast("Le propriétaire a refusé le partage de cette étape."); return; }
      await sb.from('share_requests').insert({
        trip_id: trip.id, requester_id: currentUser.id, requester_pseudo: currentUser.pseudo, owner_id: trip.userId
      });
      toast("Demande envoyée — en attente d'accord du propriétaire.");
    }catch(e){
      toast("Impossible d'envoyer la demande.");
    }
  };
  el.querySelector('[data-act="edit"]')?.addEventListener('click', ()=>{ if(requireAuth()) openEditModal(trip); });
  el.querySelector('[data-act="del"]')?.addEventListener('click', ()=>{
    if(!requireAuth()) return;
    if(confirm(`Supprimer l'étape « ${countryName} » ?`)){
      deleteTripById(trip.id);
      toast("Étape supprimée");
    }
  });
  const selectBox = el.querySelector('[data-select-trip]');
  if(selectBox){
    selectBox.checked = selectedTripIds.has(trip.id);
    el.classList.toggle('selected', selectBox.checked);
    selectBox.onclick = (e)=>{
      e.stopPropagation();
      if(selectBox.checked) selectedTripIds.add(trip.id); else selectedTripIds.delete(trip.id);
      el.classList.toggle('selected', selectBox.checked);
      updateSelectBar();
    };
  }

  return el;
}

function canEditTrip(trip){
  if(storageMode !== 'supabase') return true; // mode démo/aperçu : pas de restriction
  return !!(currentUser && trip.userId && currentUser.id === trip.userId);
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
  // Le <select> caché sert de mémoire : une option par pays, sans regroupement
  const sel = document.getElementById('countrySelect');
  sel.innerHTML = '';
  COUNTRIES.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c[0];
    opt.textContent = c[1];
    sel.appendChild(opt);
  });
  document.getElementById('countrySearch').addEventListener('input', renderCountryPicker);
  document.getElementById('countrySearch').addEventListener('focus', ()=>{
    document.getElementById('countryPicker').classList.add('open');
  });
  document.addEventListener('click', (e)=>{
    const picker = document.getElementById('countryPicker');
    if(picker && !e.composedPath().includes(picker)){
      picker.classList.remove('open');
    }
  });
  document.getElementById('countrySearch').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault(); // évite d'envoyer le formulaire par erreur
      const q = normalizeText(e.target.value.trim());
      const first = COUNTRIES.find(c => !q || normalizeText(c[1]).includes(q));
      if(first && q) toggleCountry(first[0]);
    }
  });
  renderCountryPicker();
}

function normalizeText(s){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function toggleCountry(code){
  const sel = document.getElementById('countrySelect');
  const opt = Array.from(sel.options).find(o=>o.value === code);
  if(!opt) return;
  if(editingId){
    // En modification, une étape = un seul pays
    Array.from(sel.options).forEach(o=>{ o.selected = (o.value === code); });
  } else {
    opt.selected = !opt.selected;
  }
  renderCountryPicker();
}

function renderCountryPicker(){
  const sel = document.getElementById('countrySelect');
  const selected = new Set(Array.from(sel.selectedOptions).map(o=>o.value));
  const q = normalizeText(document.getElementById('countrySearch').value.trim());

  // Pastilles des pays choisis
  const chips = document.getElementById('countryChips');
  chips.innerHTML = '';
  selected.forEach(code=>{
    const c = COUNTRY_MAP[code];
    if(!c) return;
    const chip = document.createElement('span');
    chip.className = 'country-chip';
    chip.appendChild(document.createTextNode(`${flagEmoji(code)} ${c[1]}`));
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '×';
    x.setAttribute('aria-label', 'Retirer ' + c[1]);
    x.onclick = ()=>toggleCountry(code);
    chip.appendChild(x);
    chips.appendChild(chip);
  });

  // Liste défilante (filtrée si une recherche est en cours)
  const list = document.getElementById('countryList');
  const previousScroll = list.scrollTop;
  list.innerHTML = '';
  let lastContinent = null;
  let shown = 0;
  COUNTRIES.forEach(c=>{
    if(q && !normalizeText(c[1]).includes(q)) return;
    if(!q && c[2] !== lastContinent){
      const h = document.createElement('div');
      h.className = 'country-cont';
      h.textContent = c[2];
      list.appendChild(h);
      lastContinent = c[2];
    }
    const isSelected = selected.has(c[0]);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'country-item' + (isSelected ? ' selected' : '');
    item.innerHTML = `<span>${flagEmoji(c[0])}</span><span>${escapeHtml(c[1])}</span>${isSelected ? '<span class="check">✓</span>' : ''}`;
    item.onclick = ()=>toggleCountry(c[0]);
    list.appendChild(item);
    shown++;
  });
  if(!shown){
    list.innerHTML = '<div class="country-empty">Aucun pays trouvé</div>';
  }
  list.scrollTop = previousScroll;
}

function openAddModal(){
  editingId = null;
  document.getElementById('modalTitle').textContent = "Ajouter une étape";
  document.getElementById('saveTrip').textContent = "Enregistrer l'étape";
  form.reset();
  document.getElementById('countrySearch').value = '';
  document.getElementById('countryPicker').classList.remove('open');
  renderCountryPicker();
  document.getElementById('countryList').scrollTop = 0;
  pendingPhotos = [];
  renderPreview();
  overlay.classList.add('open');
}
function openEditModal(trip){
  editingId = trip.id;
  document.getElementById('modalTitle').textContent = "Modifier l'étape";
  document.getElementById('saveTrip').textContent = "Mettre à jour";
  Array.from(document.getElementById('countrySelect').options).forEach(o=>{
    o.selected = (o.value === trip.countryCode);
  });
  document.getElementById('countrySearch').value = '';
  document.getElementById('countryPicker').classList.remove('open');
  renderCountryPicker();
  document.getElementById('countryList').scrollTop = 0;
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

/* ===================== Sélection multiple pour partage groupé ===================== */
let selectedTripIds = new Set();
let selectModeOn = false;

document.getElementById('selectModeBtn').onclick = ()=>{
  selectModeOn = !selectModeOn;
  document.getElementById('timeline').classList.toggle('select-mode', selectModeOn);
  document.getElementById('selectModeBtn').textContent = selectModeOn ? "✕ Annuler la sélection" : "☑ Sélectionner";
  if(!selectModeOn){
    selectedTripIds.clear();
    document.querySelectorAll('.trip.selected').forEach(t=>t.classList.remove('selected'));
    document.querySelectorAll('[data-select-trip]').forEach(cb=>cb.checked=false);
    updateSelectBar();
  }
};

function updateSelectBar(){
  const bar = document.getElementById('selectBar');
  const n = selectedTripIds.size;
  document.getElementById('selectCount').textContent = `${n} sélectionné(s)`;
  bar.classList.toggle('open', n > 0);
}

document.getElementById('shareSelectionBtn').onclick = ()=>{
  if(!requireAuth()) return;
  const chosen = trips.filter(t => selectedTripIds.has(t.id));
  if(!chosen.length) return;
  const list = chosen.map(t => `${flagEmoji(t.countryCode)} ${t.country}${t.city ? ' — ' + t.city : ''}`).join(', ');
  shareContent(`Nos étapes : ${list} — sur Escales en couleurs`);
};

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
  if(!requireAuth()) return;
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
  if(net==='instagram' || net==='tiktok'){
    navigator.clipboard?.writeText(`${text} ${url}`).then(()=>{
      toast("Lien copié — colle-le dans " + (net==='instagram' ? "ta story ou bio Instagram" : "ta bio ou légende TikTok"));
    }).catch(()=>toast("Impossible de copier le lien"));
  }
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
  const countryCodes = Array.from(document.getElementById('countrySelect').selectedOptions).map(o=>o.value);
  if(!countryCodes.length){ toast("Choisis au moins un pays"); return; }
  saveBtn.disabled = true;
  saveBtn.textContent = "Enregistrement…";
  try{
    const newPhotos = await photosToStorable();
    const existing = overlay._existingPhotos || [];
    const city = document.getElementById('cityInput').value.trim();
    const dateStart = document.getElementById('dateStart').value;
    const dateEnd = document.getElementById('dateEnd').value;
    const story = document.getElementById('storyInput').value.trim();
    const photos = existing.concat(newPhotos);

    if(editingId){
      // En modification, on ne touche qu'à cette étape (un seul pays)
      const countryCode = countryCodes[0];
      const trip = {
        id: editingId, isExisting: true, countryCode,
        country: (COUNTRY_MAP[countryCode]||[])[1] || '',
        city, dateStart, dateEnd, story, photos, createdAt: Date.now()
      };
      await persistTrip(trip);
      toast("Étape mise à jour");
    } else {
      // Nouvelle étape : une carte par pays sélectionné, mêmes dates/récit/photos
      for(const countryCode of countryCodes){
        const trip = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
          isExisting: false, countryCode,
          country: (COUNTRY_MAP[countryCode]||[])[1] || '',
          city, dateStart, dateEnd, story, photos, createdAt: Date.now()
        };
        await persistTrip(trip);
      }
      toast(countryCodes.length > 1 ? `${countryCodes.length} étapes ajoutées` : "Étape ajoutée");
    }
    closeModal();
  }catch(err){
    toast("Un souci est survenu, réessaie.");
  }finally{
    saveBtn.disabled = false;
    saveBtn.textContent = editingId ? "Mettre à jour" : "Enregistrer l'étape";
  }
});

document.addEventListener('contextmenu', (e)=>{
  if(e.target.tagName === 'IMG' && (e.target.closest('.photo-grid') || e.target.closest('.lightbox'))){
    e.preventDefault();
  }
});

/* ===================== Lightbox ===================== */
const lightbox = document.getElementById('lightbox');
let lbIndex = 0;
function openLightbox(i){
  lbIndex = i;
  const img = document.getElementById('lbImg');
  img.src = allPhotosFlat[i];
  img.setAttribute('draggable', 'false');
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
document.getElementById('openGuide').onclick = ()=>document.getElementById('guideOverlay').classList.add('open');
document.getElementById('guideClose').onclick = ()=>document.getElementById('guideOverlay').classList.remove('open');
document.getElementById('guideOverlay').addEventListener('click', e=>{
  if(e.target.id === 'guideOverlay') document.getElementById('guideOverlay').classList.remove('open');
});

/* ===================== Artisans et événements ===================== */
const artEl = (id) => document.getElementById(id);
const STAR_PATH = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const DAY_MS = 86400000;
const ART = {
  categories: [], businesses: [], events: [], settings: {}, profiles: [],
  loadedFor: undefined, loadedOnce: false, loading: false, queued: false, missingTables: false,
  filters: { q:'', cat:'', city:'', rating:'', date:'', sort:'relevance' },
  editingBiz: null, editingEv: null, evMode: 'admin', adminTab: 'biz', uploaders: {}
};

function escapeAttr(s){
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function isOwnerUser(){ return !!(sb && currentUser && currentUser.email === OWNER_EMAIL); }
function artisanFeatureOn(){ return ART.settings.artisan_events_enabled === 'true'; }
function friendlyDbError(err){
  const m = (err && err.message) || '';
  if(/schema cache|does not exist|relation/i.test(m)) return "Les tables ne sont pas encore créées : lance d'abord le script SQL dans Supabase.";
  if(/row-level security|permission|policy/i.test(m)) return "Action refusée (droits insuffisants).";
  return m || "Une erreur est survenue.";
}
function openOv(id){ artEl(id).classList.add('open'); }
function closeOv(id){ artEl(id).classList.remove('open'); }

/* ---------- Liens ---------- */
function safeUrl(raw){
  const v = (raw || '').trim();
  if(!v) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v;
  try{
    const u = new URL(withProto);
    if(u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if(!u.hostname.includes('.')) return null;
    return u.href;
  }catch(e){ return null; }
}
function normalizeSocial(kind, raw){
  const v = (raw || '').trim();
  if(!v) return null;
  if(v.startsWith('@')){
    const h = v.slice(1).replace(/[^\w.]/g, '');
    if(!h) return null;
    if(kind === 'instagram') return 'https://www.instagram.com/' + h;
    if(kind === 'tiktok') return 'https://www.tiktok.com/@' + h;
    if(kind === 'facebook') return 'https://www.facebook.com/' + h;
    return null;
  }
  return safeUrl(v);
}

/* ---------- Dates et statut des événements ---------- */
function sameDay(a, b){ return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtDay(d, withYear = true){
  return d.toLocaleDateString('fr-FR', withYear ? { day:'numeric', month:'long', year:'numeric' } : { day:'numeric', month:'long' });
}
function fmtTime(d){ return String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0'); }
function eventBounds(ev){
  const start = new Date(ev.start_at);
  let end = ev.end_at ? new Date(ev.end_at) : null;
  if(!end){ end = new Date(start); end.setHours(23, 59, 59, 999); }
  return { start, end };
}
function eventState(ev, now = new Date()){
  const { start, end } = eventBounds(ev);
  if(now < start) return 'upcoming';
  if(now <= end) return 'ongoing';
  return 'finished';
}
function daysUntil(date, now = new Date()){
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b - a) / DAY_MS);
}
function formatEventDates(ev){
  const s = new Date(ev.start_at);
  const e = ev.end_at ? new Date(ev.end_at) : null;
  if(!e || sameDay(s, e)){
    let t = 'Le ' + fmtDay(s) + ' à ' + fmtTime(s);
    if(e) t += ' – ' + fmtTime(e);
    return t;
  }
  if(s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return 'Du ' + s.getDate() + ' au ' + fmtDay(e);
  return 'Du ' + fmtDay(s) + ' au ' + fmtDay(e);
}
function eventBadge(ev, now = new Date()){
  const st = eventState(ev, now);
  if(st === 'ongoing') return { cls:'ongoing', txt:'🟢 Événement en cours' };
  if(st === 'finished') return { cls:'finished', txt:'⚪ Événement terminé' };
  const d = daysUntil(new Date(ev.start_at), now);
  if(d <= 0) return { cls:'soon', txt:"🟠 Événement aujourd'hui" };
  if(d === 1) return { cls:'soon', txt:'🟠 Événement demain' };
  if(d <= 7) return { cls:'soon', txt:'🟠 Événement à venir dans ' + d + ' jours' };
  if(d <= 14) return { cls:'upcoming', txt:'🔵 Événement à venir dans ' + d + ' jours' };
  if(d <= 60) return { cls:'upcoming', txt:'🔵 Événement à venir dans ' + Math.round(d / 7) + ' semaines' };
  return { cls:'upcoming', txt:'🔵 Événement à venir dans ' + Math.round(d / 30) + ' mois' };
}
function eventBadgeHTML(ev, now){
  const b = eventBadge(ev, now);
  return '<span class="ev-badge ' + b.cls + '">' + escapeHtml(b.txt) + '</span>';
}
function eventPlace(ev){ return [ev.location, ev.city].filter(Boolean).join(', '); }

/* ---------- Visibilité publique ---------- */
function isEventPublic(ev, now = new Date()){
  if(ev.status !== 'approved' || ev.hidden) return false;
  if(ev.display_from && now < new Date(ev.display_from)) return false;
  if(ev.display_until && now > new Date(ev.display_until)) return false;
  if(eventState(ev, now) === 'finished' && !ev.keep_after_end) return false;
  return true;
}
function publicBusinesses(){ return ART.businesses.filter(b => b.published); }
function visibleEvents(biz, now = new Date()){
  return ART.events.filter(ev => ev.business_id === biz.id && isEventPublic(ev, now));
}
function cmpEvents(a, b, now){
  const rank = (ev) => { const s = eventState(ev, now); return s === 'ongoing' ? 0 : (s === 'upcoming' ? 1 : 2); };
  const ra = rank(a), rb = rank(b);
  if(ra !== rb) return ra - rb;
  const ta = new Date(a.start_at).getTime(), tb = new Date(b.start_at).getTime();
  return ra === 2 ? tb - ta : ta - tb;
}
function pickFeaturedEvent(evs, now){
  if(!evs.length) return null;
  return evs.slice().sort((a, b) => cmpEvents(a, b, now))[0];
}
function eventDistance(ev, now){
  if(!ev) return Infinity;
  const s = eventState(ev, now);
  if(s === 'ongoing') return 0;
  if(s === 'upcoming') return new Date(ev.start_at) - now;
  return Infinity;
}
function matchesDateFilter(ev, key, now){
  const s = eventState(ev, now);
  const start = new Date(ev.start_at);
  if(key === 'ongoing') return s === 'ongoing';
  if(key === 'upcoming') return s === 'upcoming';
  if(key === 'week') return s === 'ongoing' || (s === 'upcoming' && start - now <= 7 * DAY_MS);
  if(key === 'months') return s === 'ongoing' || (s === 'upcoming' && start - now <= 90 * DAY_MS);
  if(key === 'past') return s === 'finished';
  return true;
}

/* ---------- Chargement des données ---------- */
async function loadArtisansData(force){
  if(!sb) return;
  const uid = currentUser ? currentUser.id : null;
  if(!force && ART.loadedOnce && ART.loadedFor === uid) return;
  if(ART.loading){ ART.queued = true; return; }
  ART.loading = true;
  try{
    const [cats, biz, evs, sets] = await Promise.all([
      sb.from('categories').select('*').order('name', { ascending:true }),
      sb.from('businesses').select('*, business_categories(category_id)').order('created_at', { ascending:false }),
      sb.from('events').select('*').order('start_at', { ascending:true }),
      sb.from('site_settings').select('*')
    ]);
    ART.missingTables = !!(biz.error && /schema cache|does not exist|relation/i.test(biz.error.message || ''));
    ART.categories = cats.data || [];
    ART.businesses = (biz.data || []).map(b => ({ ...b, category_ids: (b.business_categories || []).map(x => x.category_id) }));
    ART.events = evs.data || [];
    ART.settings = Object.fromEntries((sets.data || []).map(r => [r.key, r.value]));
    ART.loadedFor = uid;
    ART.loadedOnce = true;
  }catch(e){ /* on garde les données précédentes */ }
  finally{ ART.loading = false; }
  renderArtisans();
  updateArtisanAccountUI();
  renderAdmin();
  renderMyEvents();
  if(ART.queued){ ART.queued = false; loadArtisansData(true); }
}
function artisansOnAuth(){
  if(!sb) return;
  const uid = currentUser ? currentUser.id : null;
  if(!ART.loadedOnce || ART.loadedFor !== uid) loadArtisansData(true);
  else { renderArtisans(); updateArtisanAccountUI(); }
}

/* ---------- Affichage public ---------- */
function starsHTML(n){
  if(!n) return '';
  let s = '';
  for(let i = 1; i <= 5; i++) s += '<svg class="star' + (i <= n ? ' on' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg>';
  return '<span class="stars-ro" role="img" aria-label="Note : ' + n + ' sur 5">' + s + '<span class="stars-num">' + n + '/5</span></span>';
}
function setOptions(sel, options, current){
  sel.innerHTML = options.map(([v, l]) => '<option value="' + escapeAttr(v) + '">' + escapeHtml(l) + '</option>').join('');
  const ok = options.some(([v]) => v === current);
  sel.value = ok ? current : '';
  return sel.value;
}
function rebuildFilterOptions(){
  const now = new Date();
  const pubs = publicBusinesses();
  const used = new Set();
  pubs.forEach(b => b.category_ids.forEach(id => used.add(id)));
  const cats = ART.categories.filter(c => used.has(c.id));
  const cities = new Map();
  const addCity = (c) => { const v = (c || '').trim(); if(v) cities.set(normalizeText(v), v); };
  pubs.forEach(b => { addCity(b.city); visibleEvents(b, now).forEach(e => addCity(e.city)); });
  const hasPast = pubs.some(b => visibleEvents(b, now).some(e => eventState(e, now) === 'finished'));

  ART.filters.cat = setOptions(artEl('artCategory'), [['', 'Catégorie']].concat(cats.map(c => [c.id, c.name])), ART.filters.cat);
  ART.filters.city = setOptions(artEl('artCity'), [['', 'Localisation']].concat(Array.from(cities.values()).sort((a, b) => a.localeCompare(b, 'fr')).map(c => [c, c])), ART.filters.city);
  const dateOpts = [['', "Date de l'événement"], ['ongoing', 'Événements en cours'], ['upcoming', 'Événements à venir'], ['week', 'Dans les prochains jours (7 jours)'], ['months', 'Dans les prochains mois (3 mois)']];
  if(hasPast) dateOpts.push(['past', 'Événements passés']);
  ART.filters.date = setOptions(artEl('artDate'), dateOpts, ART.filters.date);
}
function renderSpotlight(){
  const now = new Date();
  const items = [];
  publicBusinesses().forEach(b => visibleEvents(b, now).forEach(ev => {
    const st = eventState(ev, now);
    if(st === 'ongoing' || (st === 'upcoming' && daysUntil(new Date(ev.start_at), now) <= 14)) items.push({ b, ev });
  }));
  items.sort((x, y) => cmpEvents(x.ev, y.ev, now));
  const box = artEl('artSpotlight');
  if(!items.length){ box.style.display = 'none'; return; }
  box.style.display = 'block';
  artEl('artSpotList').innerHTML = items.slice(0, 6).map(({ b, ev }) =>
    '<button type="button" class="spot-card" data-biz="' + escapeAttr(b.id) + '">' + eventBadgeHTML(ev, now) +
    '<span class="spot-title">' + escapeHtml(ev.title) + '</span>' +
    '<span class="spot-meta">' + escapeHtml(b.name) + ' · ' + escapeHtml(formatEventDates(ev)) + '</span></button>'
  ).join('');
}
function computeArtisanResults(now){
  const f = ART.filters;
  const tokens = normalizeText((f.q || '').trim()).split(/\s+/).filter(Boolean);
  const out = [];
  for(const b of publicBusinesses()){
    const evs = visibleEvents(b, now);
    const catNames = b.category_ids.map(id => (ART.categories.find(c => c.id === id) || {}).name).filter(Boolean);
    if(f.cat && !b.category_ids.includes(f.cat)) continue;
    if(f.rating && !(b.rating >= Number(f.rating))) continue;
    if(f.city){
      const c = normalizeText(f.city);
      if(!(normalizeText(b.city || '') === c || evs.some(e => normalizeText(e.city || '') === c))) continue;
    }
    let pool = evs;
    if(f.date){
      pool = evs.filter(e => matchesDateFilter(e, f.date, now));
      if(!pool.length) continue;
    }
    let score = 0;
    if(tokens.length){
      const bizText = normalizeText([b.name, b.activity, b.activity_description, b.description, b.city].concat(catNames).filter(Boolean).join(' '));
      const evTexts = evs.map(e => normalizeText([e.title, e.description, e.location, e.city].filter(Boolean).join(' ')));
      const all = bizText + ' ' + evTexts.join(' ');
      if(!tokens.every(t => all.includes(t))) continue;
      const nameN = normalizeText(b.name || '');
      const actN = normalizeText(b.activity || '');
      tokens.forEach(t => {
        if(nameN.includes(t)) score += 5;
        if(actN.includes(t)) score += 3;
        if(bizText.includes(t)) score += 2;
        if(evTexts.some(x => x.includes(t))) score += 1;
      });
      const hit = pool.filter(e => { const tx = normalizeText([e.title, e.description, e.location, e.city].filter(Boolean).join(' ')); return tokens.some(t => tx.includes(t)); });
      if(hit.length) pool = hit;
    }
    const featured = pickFeaturedEvent(pool, now);
    out.push({ b, evs, featured, score, catNames, dist: eventDistance(featured, now) });
  }
  const recency = (x, y) => new Date(y.b.created_at || 0) - new Date(x.b.created_at || 0);
  const cmpNum = (a, b) => (a === b ? 0 : (a < b ? -1 : 1));
  const byName = (x, y) => (x.b.name || '').localeCompare(y.b.name || '', 'fr', { sensitivity:'base' });
  switch(f.sort){
    case 'az': out.sort(byName); break;
    case 'za': out.sort((x, y) => byName(y, x)); break;
    case 'rating': out.sort((x, y) => ((y.b.rating || 0) - (x.b.rating || 0)) || recency(x, y)); break;
    case 'recent': out.sort(recency); break;
    case 'nearest': out.sort((x, y) => cmpNum(x.dist, y.dist) || recency(x, y)); break;
    case 'ongoing': out.sort((x, y) => cmpNum(x.dist === 0 ? 0 : 1, y.dist === 0 ? 0 : 1) || recency(x, y)); break;
    case 'soon': out.sort((x, y) => cmpNum(x.dist <= 14 * DAY_MS ? x.dist : Infinity, y.dist <= 14 * DAY_MS ? y.dist : Infinity) || recency(x, y)); break;
    default: out.sort((x, y) => (y.score - x.score) || recency(x, y));
  }
  return out;
}
function mediaHTML(b, big){
  return b.image_url
    ? '<img' + (big ? ' class="det-img"' : '') + ' src="' + escapeAttr(b.image_url) + '" alt="' + escapeAttr(b.name) + '" loading="lazy" draggable="false">'
    : '<div class="art-ph" aria-hidden="true">' + escapeHtml((b.name || '?').trim().charAt(0).toUpperCase()) + '</div>';
}
function cardHTML(r, now){
  const b = r.b, ev = r.featured;
  const logo = b.logo_url ? '<img class="art-logo" src="' + escapeAttr(b.logo_url) + '" alt="Logo de ' + escapeAttr(b.name) + '" loading="lazy" draggable="false">' : '';
  const chips = r.catNames.slice(0, 3).map(n => '<span class="chip">' + escapeHtml(n) + '</span>').join('');
  const sub = [b.activity, b.city].filter(Boolean).map(escapeHtml).join(' · ');
  const desc = b.description || b.activity_description || '';
  let evBlock = '';
  if(ev){
    const place = eventPlace(ev);
    evBlock = '<div class="art-event">' + eventBadgeHTML(ev, now) +
      '<div class="art-event-title">' + escapeHtml(ev.title) + '</div>' +
      '<div class="art-event-meta">📅 ' + escapeHtml(formatEventDates(ev)) + '</div>' +
      (place ? '<div class="art-event-meta">📍 ' + escapeHtml(place) + '</div>' : '') + '</div>';
  }
  return '<article class="art-card">' +
    '<button type="button" class="art-media" data-biz="' + escapeAttr(b.id) + '" aria-label="Voir la fiche de ' + escapeAttr(b.name) + '">' + mediaHTML(b, false) + logo + '</button>' +
    '<div class="art-body"><h3>' + escapeHtml(b.name) + '</h3>' +
    (sub ? '<p class="art-sub2">' + sub + '</p>' : '') +
    (chips ? '<div class="chips">' + chips + '</div>' : '') +
    (desc ? '<p class="art-desc">' + escapeHtml(desc) + '</p>' : '') +
    (b.rating ? '<div>' + starsHTML(b.rating) + '</div>' : '') +
    evBlock +
    '<button type="button" class="btn btn-ghost btn-small art-more" data-biz="' + escapeAttr(b.id) + '">En savoir plus</button>' +
    '</div></article>';
}
function renderArtisanGrid(){
  const now = new Date();
  const results = computeArtisanResults(now);
  const grid = artEl('artGrid'), empty = artEl('artEmpty'), count = artEl('artCount');
  if(!results.length){
    grid.innerHTML = '';
    count.textContent = '';
    empty.textContent = publicBusinesses().length
      ? 'Aucun résultat ne correspond à votre recherche.'
      : "Aucune fiche publiée pour l'instant. Ajoute ta première entreprise depuis l'espace administrateur.";
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  count.textContent = results.length === 1 ? '1 résultat' : results.length + ' résultats';
  grid.innerHTML = results.map(r => cardHTML(r, now)).join('');
}
function pendingCount(){ return ART.events.filter(e => e.status === 'pending').length; }
function renderArtisans(){
  const section = artEl('artisansSection');
  const admin = isOwnerUser();
  const pubs = publicBusinesses();
  const visible = !!(sb && (pubs.length || admin));
  section.style.display = visible ? 'block' : 'none';
  artEl('goArtisansWrap').style.display = visible ? 'inline' : 'none';
  if(!visible) return;
  artEl('openAdminPanel').style.display = admin ? 'inline-block' : 'none';
  const p = pendingCount();
  artEl('adminPendingBadge').textContent = (admin && p) ? ' (' + p + ' à valider)' : '';
  rebuildFilterOptions();
  renderSpotlight();
  renderArtisanGrid();
}

/* ---------- Fiche détaillée ---------- */
function linkHTML(label, raw, kind){
  const href = kind ? normalizeSocial(kind, raw) : safeUrl(raw);
  return href ? '<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + '</a>' : '';
}
function openBizDetail(id){
  const b = ART.businesses.find(x => x.id === id);
  if(!b) return;
  const now = new Date();
  const evs = visibleEvents(b, now).sort((x, y) => cmpEvents(x, y, now));
  const catNames = b.category_ids.map(cid => (ART.categories.find(c => c.id === cid) || {}).name).filter(Boolean);
  const soc = b.socials || {};
  const links = [
    linkHTML('🌐 Site internet', b.website),
    linkHTML('Facebook', soc.facebook, 'facebook'),
    linkHTML('Instagram', soc.instagram, 'instagram'),
    linkHTML('TikTok', soc.tiktok, 'tiktok'),
    linkHTML('Autre lien', soc.other)
  ].filter(Boolean).join('');
  const evHTML = evs.length ? evs.map(ev => {
    const place = eventPlace(ev);
    const link = linkHTML("Site / inscription", ev.link);
    return '<div class="det-event">' + eventBadgeHTML(ev, now) +
      '<h4>' + escapeHtml(ev.title) + '</h4>' +
      '<p>📅 ' + escapeHtml(formatEventDates(ev)) + '</p>' +
      (place ? '<p>📍 ' + escapeHtml(place) + '</p>' : '') +
      (ev.image_url ? '<img src="' + escapeAttr(ev.image_url) + '" alt="' + escapeAttr(ev.title) + '" loading="lazy" draggable="false">' : '') +
      (ev.description ? '<p class="det-text">' + escapeHtml(ev.description) + '</p>' : '') +
      (ev.practical_info ? '<p class="det-text"><b>Infos pratiques :</b> ' + escapeHtml(ev.practical_info) + '</p>' : '') +
      (ev.contact ? '<p class="det-text"><b>Contact :</b> ' + escapeHtml(ev.contact) + '</p>' : '') +
      (link ? '<div class="det-links">' + link + '</div>' : '') + '</div>';
  }).join('') : '<p class="det-meta">Aucun événement prévu pour le moment.</p>';
  artEl('bizDetailBody').innerHTML =
    '<div class="det-media">' + mediaHTML(b, true) +
      (b.logo_url ? '<img class="det-logo" src="' + escapeAttr(b.logo_url) + '" alt="Logo de ' + escapeAttr(b.name) + '" draggable="false">' : '') + '</div>' +
    '<div class="det-body"><h2>' + escapeHtml(b.name) + '</h2>' +
      (catNames.length ? '<div class="chips">' + catNames.map(n => '<span class="chip">' + escapeHtml(n) + '</span>').join('') + '</div>' : '') +
      '<p class="det-meta">' + [b.activity, b.city ? '📍 ' + b.city : ''].filter(Boolean).map(escapeHtml).join(' · ') + '</p>' +
      (b.rating ? '<div>' + starsHTML(b.rating) + '</div>' : '') +
      (b.description ? '<h3>À propos</h3><p class="det-text">' + escapeHtml(b.description) + '</p>' : '') +
      (b.activity_description ? '<h3>Son activité</h3><p class="det-text">' + escapeHtml(b.activity_description) + '</p>' : '') +
      (b.contact ? '<h3>Coordonnées</h3><p class="det-text">' + escapeHtml(b.contact) + '</p>' : '') +
      (links ? '<div class="det-links">' + links + '</div>' : '') +
      '<h3>Événements</h3>' + evHTML + '</div>';
  openOv('bizDetailOverlay');
}

/* ---------- Envoi d'images ---------- */
function prepareImage(file, maxDim, keepAlpha){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if(!keepAlpha){ ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), keepAlpha ? 'image/png' : 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}
function makeUploader(cfg){
  const st = { url: null, blob: null, previewUrl: null };
  const el = (id) => artEl(id);
  const fileInput = el(cfg.file), preview = el(cfg.preview), importBtn = el(cfg.importBtn), removeBtn = el(cfg.remove), status = el(cfg.status);
  function show(src){
    preview.innerHTML = src ? '<img src="' + escapeAttr(src) + '" alt="Aperçu">' : '<span class="up-empty">Aucune image</span>';
  }
  function dropPreview(){ if(st.previewUrl){ URL.revokeObjectURL(st.previewUrl); st.previewUrl = null; } }
  async function onFile(){
    const file = fileInput.files && fileInput.files[0];
    if(!file) return;
    if(!/^image\//.test(file.type)){ status.textContent = "Ce fichier n'est pas une image."; fileInput.value = ''; return; }
    status.textContent = "Préparation de l'image…";
    try{
      const blob = await prepareImage(file, cfg.maxDim || 1600, !!cfg.keepAlpha);
      dropPreview();
      st.blob = blob;
      st.previewUrl = URL.createObjectURL(blob);
      show(st.previewUrl);
      importBtn.disabled = false;
      status.textContent = "Aperçu prêt. Clique sur « Télécharger / Importer » pour l'enregistrer (ou valide directement le formulaire).";
    }catch(e){ status.textContent = 'Impossible de lire cette image.'; }
    fileInput.value = '';
  }
  async function doImport(){
    if(!st.blob) return st.url;
    importBtn.disabled = true;
    status.textContent = 'Envoi en cours…';
    const ext = st.blob.type === 'image/png' ? 'png' : 'jpg';
    const path = cfg.prefix() + crypto.randomUUID() + '.' + ext;
    const { error } = await sb.storage.from('business-images').upload(path, st.blob, { contentType: st.blob.type });
    if(error){
      importBtn.disabled = false;
      status.textContent = "Échec de l'envoi : " + friendlyDbError(error);
      throw error;
    }
    const { data } = sb.storage.from('business-images').getPublicUrl(path);
    dropPreview();
    st.url = data.publicUrl;
    st.blob = null;
    show(st.url);
    importBtn.disabled = true;
    status.textContent = '✔ Image importée.';
    return st.url;
  }
  fileInput.addEventListener('change', onFile);
  importBtn.addEventListener('click', () => { doImport().catch(() => {}); });
  removeBtn.addEventListener('click', () => {
    dropPreview(); st.url = null; st.blob = null; show(null); importBtn.disabled = true;
    status.textContent = 'Image retirée (enregistre pour confirmer).';
  });
  show(null);
  return {
    reset(url){ dropPreview(); st.url = url || null; st.blob = null; show(st.url); importBtn.disabled = true; status.textContent = ''; fileInput.value = ''; },
    async ensureUploaded(){ return st.blob ? await doImport() : st.url; }
  };
}

/* ---------- Administration : liste et actions ---------- */
async function dbRun(builder, okMsg){
  const { error } = await builder;
  if(error){ toast(friendlyDbError(error)); return false; }
  if(okMsg) toast(okMsg);
  return true;
}
function newId(){ return crypto.randomUUID(); }
function renderAdmin(){
  const o = artEl('adminOverlay');
  if(!o.classList.contains('open')) return;
  o.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === ART.adminTab));
  ['biz', 'cat', 'ev', 'set'].forEach(k => { artEl('adminPane_' + k).style.display = (k === ART.adminTab ? 'block' : 'none'); });
  const p = pendingCount();
  artEl('adminEvBadge').textContent = p ? '(' + p + ')' : '';
  artEl('adminWarn').style.display = ART.missingTables ? 'block' : 'none';
  if(ART.adminTab === 'biz') renderAdminBiz();
  else if(ART.adminTab === 'cat') renderAdminCat();
  else if(ART.adminTab === 'ev') renderAdminEv();
  else renderAdminSet();
}
function renderAdminBiz(){
  const rows = ART.businesses.map(b => {
    const n = ART.events.filter(e => e.business_id === b.id).length;
    const thumb = b.image_url ? '<img src="' + escapeAttr(b.image_url) + '" alt="">' : '<span>' + escapeHtml((b.name || '?').charAt(0).toUpperCase()) + '</span>';
    const meta = [b.activity, b.city, b.rating ? '★ ' + b.rating + '/5' : null, n + ' événement' + (n > 1 ? 's' : '')].filter(Boolean).map(escapeHtml).join(' · ');
    const id = escapeAttr(b.id);
    return '<div class="adm-row"><div class="adm-thumb">' + thumb + '</div>' +
      '<div class="adm-info"><span><b>' + escapeHtml(b.name) + '</b><span class="pill ' + (b.published ? 'ok' : 'off') + '">' + (b.published ? 'Publiée' : 'Masquée') + '</span></span><small>' + meta + '</small></div>' +
      '<div class="adm-btns">' +
        '<button type="button" class="btn btn-ghost btn-small" data-act="biz-edit" data-id="' + id + '">✏️ Modifier</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-act="biz-toggle" data-id="' + id + '">👁 ' + (b.published ? 'Masquer' : 'Publier') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-act="biz-del" data-id="' + id + '" aria-label="Supprimer">🗑</button>' +
      '</div></div>';
  }).join('');
  artEl('adminPane_biz').innerHTML = '<div class="adm-bar"><button type="button" class="btn btn-solid btn-small" data-act="biz-add">➕ Ajouter une entreprise</button></div>' +
    (rows || '<p class="adm-empty">Aucune entreprise pour l\u2019instant.</p>');
}
function renderAdminCat(){
  const rows = ART.categories.map(c => {
    const n = ART.businesses.filter(b => b.category_ids.includes(c.id)).length;
    const id = escapeAttr(c.id);
    return '<div class="adm-row" data-cat="' + id + '"><div class="adm-info"><input type="text" class="adm-input" value="' + escapeAttr(c.name) + '" maxlength="60" aria-label="Nom de la catégorie"><small>' + n + ' entreprise' + (n > 1 ? 's' : '') + '</small></div>' +
      '<div class="adm-btns"><button type="button" class="btn btn-ghost btn-small" data-act="cat-save" data-id="' + id + '">💾 Enregistrer</button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-act="cat-del" data-id="' + id + '" aria-label="Supprimer">🗑</button></div></div>';
  }).join('');
  artEl('adminPane_cat').innerHTML = '<div class="adm-bar"><input type="text" id="newCatName" class="adm-input" placeholder="Nouvelle catégorie…" maxlength="60"><button type="button" class="btn btn-solid btn-small" data-act="cat-add">➕ Ajouter</button></div>' +
    (rows || '<p class="adm-empty">Aucune catégorie pour l\u2019instant.</p>');
}
const EV_STATUS = {
  pending: ['⏳ À valider', 'warn'], approved: ['✅ Approuvé', 'ok'],
  rejected: ['❌ Refusé', 'off'], correction: ['✏️ Correction demandée', 'warn']
};
function adminEventRow(ev){
  const b = ART.businesses.find(x => x.id === ev.business_id);
  const id = escapeAttr(ev.id);
  const [lab, cls] = EV_STATUS[ev.status] || ['?', 'off'];
  const btn = (act, txt) => '<button type="button" class="btn btn-ghost btn-small" data-act="' + act + '" data-id="' + id + '">' + txt + '</button>';
  let actions = btn('ev-edit', '✏️ Modifier');
  if(ev.status === 'pending') actions = btn('ev-approve', '✅ Accepter et publier') + actions + btn('ev-correct', '✍️ Demander une correction') + btn('ev-reject', '❌ Refuser');
  else if(ev.status === 'correction') actions = btn('ev-approve', '✅ Publier') + actions + btn('ev-reject', '❌ Refuser');
  else if(ev.status === 'rejected') actions = btn('ev-approve', '✅ Publier') + actions;
  else actions += btn('ev-toggle', '👁 ' + (ev.hidden ? 'Afficher' : 'Masquer'));
  actions += btn('ev-del', '🗑');
  const by = ev.submitted_by ? ' · signalé par un artisan' : '';
  return '<div class="adm-row"><div class="adm-info"><span><b>' + escapeHtml(ev.title) + '</b>' +
    '<span class="pill ' + cls + '">' + lab + '</span>' + (ev.hidden ? '<span class="pill off">Masqué</span>' : '') + '</span>' +
    '<small>' + escapeHtml((b ? b.name : 'Entreprise supprimée') + ' · ' + formatEventDates(ev) + by) + '</small>' +
    (ev.admin_note ? '<small>Message : ' + escapeHtml(ev.admin_note) + '</small>' : '') + '</div>' +
    '<div class="adm-btns">' + actions + '</div></div>';
}
function renderAdminEv(){
  const pend = ART.events.filter(e => e.status === 'pending');
  const others = ART.events.filter(e => e.status !== 'pending').slice().sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  artEl('adminPane_ev').innerHTML =
    '<div class="adm-bar"><button type="button" class="btn btn-solid btn-small" data-act="ev-add">➕ Ajouter un événement</button></div>' +
    '<p class="adm-group">À valider (' + pend.length + ')</p>' +
    (pend.length ? pend.map(adminEventRow).join('') : '<p class="adm-empty">Aucun événement en attente de validation.</p>') +
    '<p class="adm-group">Tous les autres événements (' + others.length + ')</p>' +
    (others.length ? others.map(adminEventRow).join('') : '<p class="adm-empty">Aucun événement pour l\u2019instant.</p>');
}
function renderAdminSet(){
  artEl('adminPane_set').innerHTML =
    '<label class="check-row"><input type="checkbox" id="setArtisanEvents"' + (artisanFeatureOn() ? ' checked' : '') + '> Autoriser les artisans à signaler des événements</label>' +
    '<p class="adm-note">Pour qu\u2019un artisan puisse signaler un événement, il doit avoir un compte membre, et tu dois associer ce compte à sa fiche (champ « Compte artisan associé » dans le formulaire de l\u2019entreprise). Tout événement signalé reste « À valider » tant que tu ne l\u2019as pas publié toi-même.</p>';
}
async function handleAdminAction(act, id, btn){
  const biz = ART.businesses.find(b => b.id === id);
  const ev = ART.events.find(e => e.id === id);
  let ok = false;
  switch(act){
    case 'biz-add': openBizForm(null); return;
    case 'biz-edit': openBizForm(id); return;
    case 'biz-toggle': ok = await dbRun(sb.from('businesses').update({ published: !biz.published }).eq('id', id), biz.published ? 'Fiche masquée' : 'Fiche publiée'); break;
    case 'biz-del':
      if(!confirm('Supprimer définitivement « ' + biz.name + ' » et tous ses événements ?')) return;
      ok = await dbRun(sb.from('businesses').delete().eq('id', id), 'Entreprise supprimée'); break;
    case 'cat-add': {
      const name = (artEl('newCatName').value || '').trim();
      if(!name){ toast('Écris un nom de catégorie.'); return; }
      ok = await dbRun(sb.from('categories').insert({ id: newId(), name }), 'Catégorie ajoutée'); break;
    }
    case 'cat-save': {
      const name = (btn.closest('[data-cat]').querySelector('input').value || '').trim();
      if(!name){ toast('Le nom ne peut pas être vide.'); return; }
      ok = await dbRun(sb.from('categories').update({ name }).eq('id', id), 'Catégorie modifiée'); break;
    }
    case 'cat-del': {
      const c = ART.categories.find(x => x.id === id);
      if(!confirm('Supprimer la catégorie « ' + (c ? c.name : '') + ' » ? Elle sera retirée des fiches qui l\u2019utilisent.')) return;
      ok = await dbRun(sb.from('categories').delete().eq('id', id), 'Catégorie supprimée'); break;
    }
    case 'ev-add': openEventForm(null, 'admin'); return;
    case 'ev-edit': openEventForm(id, 'admin'); return;
    case 'ev-approve': ok = await dbRun(sb.from('events').update({ status:'approved', hidden:false, admin_note:null }).eq('id', id), 'Événement publié'); break;
    case 'ev-reject': ok = await dbRun(sb.from('events').update({ status:'rejected' }).eq('id', id), 'Événement refusé'); break;
    case 'ev-correct': {
      const msg = prompt("Message pour l'artisan (que doit-il corriger ?)", ev && ev.admin_note ? ev.admin_note : '');
      if(msg === null) return;
      ok = await dbRun(sb.from('events').update({ status:'correction', admin_note: msg.trim() || null }).eq('id', id), 'Correction demandée'); break;
    }
    case 'ev-toggle': ok = await dbRun(sb.from('events').update({ hidden: !ev.hidden }).eq('id', id), ev.hidden ? 'Événement affiché' : 'Événement masqué'); break;
    case 'ev-del':
      if(!confirm('Supprimer définitivement cet événement ?')) return;
      ok = await dbRun(sb.from('events').delete().eq('id', id), 'Événement supprimé'); break;
  }
  if(ok) await loadArtisansData(true);
}

/* ---------- Formulaire entreprise ---------- */
async function loadProfiles(){
  try{
    const { data } = await sb.from('profiles').select('id, pseudo');
    ART.profiles = (data || []).filter(p => p.pseudo);
  }catch(e){ ART.profiles = []; }
}
async function openBizForm(id){
  const b = id ? ART.businesses.find(x => x.id === id) : null;
  ART.editingBiz = b ? b.id : null;
  artEl('bizFormTitle').textContent = b ? "Modifier l'entreprise" : 'Ajouter une entreprise';
  const soc = (b && b.socials) || {};
  const set = (k, v) => { artEl(k).value = v || ''; };
  set('bizName', b && b.name); set('bizActivity', b && b.activity); set('bizCity', b && b.city);
  set('bizRating', b && b.rating ? String(b.rating) : ''); set('bizDesc', b && b.description); set('bizActDesc', b && b.activity_description);
  set('bizContact', b && b.contact); set('bizWebsite', b && b.website);
  set('bizFacebook', soc.facebook); set('bizInstagram', soc.instagram); set('bizTiktok', soc.tiktok); set('bizOther', soc.other);
  artEl('bizPublished').checked = b ? !!b.published : true;
  artEl('bizCats').innerHTML = ART.categories.length
    ? ART.categories.map(c => '<label class="chip-pick"><input type="checkbox" value="' + escapeAttr(c.id) + '"' + (b && b.category_ids.includes(c.id) ? ' checked' : '') + '><span>' + escapeHtml(c.name) + '</span></label>').join('')
    : '<span class="adm-note">Aucune catégorie : crées-en d\u2019abord dans l\u2019onglet « Catégories ».</span>';
  ART.uploaders.bizImg.reset(b && b.image_url);
  ART.uploaders.bizLogo.reset(b && b.logo_url);
  openOv('bizFormOverlay');
  await loadProfiles();
  const owner = artEl('bizOwner');
  owner.innerHTML = '<option value="">Aucun</option>' + ART.profiles.map(p => '<option value="' + escapeAttr(p.id) + '">' + escapeHtml(p.pseudo) + '</option>').join('');
  owner.value = (b && b.owner_id) || '';
}
async function saveBusiness(e){
  e.preventDefault();
  const name = artEl('bizName').value.trim();
  if(!name){ toast("Le nom de l'entreprise est obligatoire."); return; }
  const website = artEl('bizWebsite').value.trim();
  const websiteOk = website ? safeUrl(website) : null;
  if(website && !websiteOk){ toast('Adresse du site internet invalide.'); return; }
  const socials = {};
  for(const [k, id, label] of [['facebook', 'bizFacebook', 'Facebook'], ['instagram', 'bizInstagram', 'Instagram'], ['tiktok', 'bizTiktok', 'TikTok'], ['other', 'bizOther', 'Autre lien']]){
    const raw = artEl(id).value.trim();
    if(!raw) continue;
    const u = k === 'other' ? safeUrl(raw) : normalizeSocial(k, raw);
    if(!u){ toast('Lien invalide : ' + label + '.'); return; }
    socials[k] = u;
  }
  const btn = artEl('bizFormSave');
  btn.disabled = true;
  try{
    const image_url = await ART.uploaders.bizImg.ensureUploaded();
    const logo_url = await ART.uploaders.bizLogo.ensureUploaded();
    const id = ART.editingBiz || newId();
    const rating = artEl('bizRating').value ? Number(artEl('bizRating').value) : null;
    const row = {
      name, activity: artEl('bizActivity').value.trim() || null, city: artEl('bizCity').value.trim() || null,
      description: artEl('bizDesc').value.trim() || null, activity_description: artEl('bizActDesc').value.trim() || null,
      contact: artEl('bizContact').value.trim() || null, website: websiteOk, socials, rating,
      image_url: image_url || null, logo_url: logo_url || null,
      published: artEl('bizPublished').checked, owner_id: artEl('bizOwner').value || null
    };
    const q = ART.editingBiz ? sb.from('businesses').update(row).eq('id', id) : sb.from('businesses').insert({ id, ...row });
    if(!(await dbRun(q))) return;
    const chosen = Array.from(artEl('bizCats').querySelectorAll('input:checked')).map(i => i.value);
    if(!(await dbRun(sb.from('business_categories').delete().eq('business_id', id)))) return;
    if(chosen.length && !(await dbRun(sb.from('business_categories').insert(chosen.map(cid => ({ business_id: id, category_id: cid })))))) return;
    closeOv('bizFormOverlay');
    toast('Entreprise enregistrée');
    await loadArtisansData(true);
  }catch(err){
    toast(friendlyDbError(err));
  }finally{
    btn.disabled = false;
  }
}

/* ---------- Formulaire événement (administrateur et artisan) ---------- */
function toLocalInput(iso){
  if(!iso) return '';
  const d = new Date(iso), p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function fromLocalInput(v){ return v ? new Date(v).toISOString() : null; }
function openEventForm(id, mode){
  const admin = mode === 'admin';
  const ev = id ? ART.events.find(x => x.id === id) : null;
  ART.editingEv = ev ? ev.id : null;
  ART.evMode = mode;
  artEl('evFormTitle').textContent = ev ? "Modifier l'événement" : (admin ? 'Ajouter un événement' : 'Signaler un événement');
  artEl('evIntro').style.display = admin ? 'none' : 'block';
  artEl('evAdminOnly').style.display = admin ? 'block' : 'none';
  const list = admin ? ART.businesses : ART.businesses.filter(b => currentUser && b.owner_id === currentUser.id);
  artEl('evBusiness').innerHTML = list.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'))
    .map(b => '<option value="' + escapeAttr(b.id) + '">' + escapeHtml(b.name) + (b.published ? '' : ' (masquée)') + '</option>').join('');
  const set = (k, v) => { artEl(k).value = v || ''; };
  artEl('evBusiness').value = (ev && ev.business_id) || (list[0] ? list[0].id : '');
  set('evTitle', ev && ev.title); set('evDesc', ev && ev.description);
  set('evStart', ev ? toLocalInput(ev.start_at) : ''); set('evEnd', ev ? toLocalInput(ev.end_at) : '');
  set('evLocation', ev && ev.location); set('evCity', ev && ev.city); set('evContact', ev && ev.contact);
  set('evLink', ev && ev.link); set('evPractical', ev && ev.practical_info);
  artEl('evStatus').value = ev ? ev.status : 'approved';
  set('evNote', ev && ev.admin_note);
  set('evDispFrom', ev ? toLocalInput(ev.display_from) : ''); set('evDispUntil', ev ? toLocalInput(ev.display_until) : '');
  artEl('evKeep').checked = !!(ev && ev.keep_after_end);
  artEl('evHidden').checked = !!(ev && ev.hidden);
  ART.uploaders.evImg.reset(ev && ev.image_url);
  openOv('evFormOverlay');
}
async function saveEvent(e){
  e.preventDefault();
  const admin = ART.evMode === 'admin';
  const title = artEl('evTitle').value.trim();
  const business_id = artEl('evBusiness').value;
  if(!business_id){ toast("Choisis l'entreprise concernée."); return; }
  if(!title){ toast("Le nom de l'événement est obligatoire."); return; }
  if(!artEl('evStart').value){ toast('La date de début est obligatoire.'); return; }
  const start_at = fromLocalInput(artEl('evStart').value);
  const end_at = fromLocalInput(artEl('evEnd').value);
  if(end_at && new Date(end_at) < new Date(start_at)){ toast('La fin ne peut pas être avant le début.'); return; }
  const linkRaw = artEl('evLink').value.trim();
  const link = linkRaw ? safeUrl(linkRaw) : null;
  if(linkRaw && !link){ toast("Lien d'inscription ou site invalide."); return; }
  const btn = artEl('evFormSave');
  btn.disabled = true;
  try{
    const image_url = await ART.uploaders.evImg.ensureUploaded();
    const base = {
      business_id, title, description: artEl('evDesc').value.trim() || null, image_url: image_url || null,
      start_at, end_at, location: artEl('evLocation').value.trim() || null, city: artEl('evCity').value.trim() || null,
      contact: artEl('evContact').value.trim() || null, link, practical_info: artEl('evPractical').value.trim() || null
    };
    const row = admin
      ? { ...base, status: artEl('evStatus').value, hidden: artEl('evHidden').checked, keep_after_end: artEl('evKeep').checked,
          display_from: fromLocalInput(artEl('evDispFrom').value), display_until: fromLocalInput(artEl('evDispUntil').value),
          admin_note: artEl('evNote').value.trim() || null }
      : { ...base, status: 'pending', admin_note: null };
    const id = ART.editingEv || newId();
    let q;
    if(ART.editingEv) q = sb.from('events').update(row).eq('id', id);
    else q = sb.from('events').insert({ id, ...row, ...(admin ? {} : { submitted_by: currentUser.id }) });
    if(!(await dbRun(q))) return;
    closeOv('evFormOverlay');
    toast(admin ? 'Événement enregistré' : 'Événement envoyé : il sera relu avant publication.');
    await loadArtisansData(true);
  }catch(err){
    toast(friendlyDbError(err));
  }finally{
    btn.disabled = false;
  }
}

/* ---------- Espace artisan ---------- */
function ownedBusinesses(){ return currentUser ? ART.businesses.filter(b => b.owner_id === currentUser.id) : []; }
function updateArtisanAccountUI(){
  const link = artEl('myEventsLink');
  if(!link) return;
  link.style.display = (sb && currentUser && !isOwnerUser() && ownedBusinesses().length && artisanFeatureOn()) ? 'block' : 'none';
}
function renderMyEvents(){
  const box = artEl('myEventsList');
  if(!artEl('myEventsOverlay').classList.contains('open')) return;
  const mine = ART.events.filter(e => currentUser && e.submitted_by === currentUser.id)
    .slice().sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  if(!mine.length){ box.innerHTML = '<p class="adm-empty">Tu n\u2019as pas encore signalé d\u2019événement.</p>'; return; }
  box.innerHTML = mine.map(ev => {
    const [lab, cls] = EV_STATUS[ev.status] || ['?', 'off'];
    const id = escapeAttr(ev.id);
    const editable = ev.status === 'pending' || ev.status === 'correction';
    const b = ART.businesses.find(x => x.id === ev.business_id);
    return '<div class="my-ev"><b>' + escapeHtml(ev.title) + '<span class="pill ' + cls + '">' + lab + '</span></b>' +
      '<small>' + escapeHtml((b ? b.name + ' · ' : '') + formatEventDates(ev)) + '</small>' +
      (ev.status === 'correction' && ev.admin_note ? '<small>✍️ Correction demandée : ' + escapeHtml(ev.admin_note) + '</small>' : '') +
      (editable ? '<div class="adm-btns" style="margin-top:8px;"><button type="button" class="btn btn-ghost btn-small" data-act="my-edit" data-id="' + id + '">✏️ Modifier</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-act="my-del" data-id="' + id + '" aria-label="Supprimer">🗑</button></div>' : '') + '</div>';
  }).join('');
}

/* ---------- Branchements ---------- */
function initArtisans(){
  artEl('artSearch').addEventListener('input', e => { ART.filters.q = e.target.value; renderArtisanGrid(); });
  [['artCategory', 'cat'], ['artCity', 'city'], ['artRating', 'rating'], ['artDate', 'date'], ['artSort', 'sort']].forEach(([id, key]) =>
    artEl(id).addEventListener('change', e => { ART.filters[key] = e.target.value; renderArtisanGrid(); }));
  artEl('artReset').addEventListener('click', () => {
    ART.filters = { q:'', cat:'', city:'', rating:'', date:'', sort:'relevance' };
    artEl('artSearch').value = '';
    ['artCategory', 'artCity', 'artRating', 'artDate'].forEach(id => { artEl(id).value = ''; });
    artEl('artSort').value = 'relevance';
    renderArtisanGrid();
  });
  artEl('artFiltersToggle').addEventListener('click', () => {
    const open = artEl('artFilters').classList.toggle('open');
    artEl('artFiltersToggle').setAttribute('aria-expanded', String(open));
  });
  artEl('artisansSection').addEventListener('click', e => {
    const el = e.target.closest('[data-biz]');
    if(el) openBizDetail(el.dataset.biz);
  });
  artEl('bizDetailClose').addEventListener('click', () => closeOv('bizDetailOverlay'));
  artEl('bizDetailOverlay').addEventListener('click', e => { if(e.target.id === 'bizDetailOverlay') closeOv('bizDetailOverlay'); });
  artEl('goArtisans').addEventListener('click', () => artEl('artisansSection').scrollIntoView({ behavior:'smooth', block:'start' }));

  // administration
  artEl('openAdminPanel').addEventListener('click', () => {
    if(!isOwnerUser()) return;
    ART.adminTab = pendingCount() ? 'ev' : 'biz';
    openOv('adminOverlay');
    renderAdmin();
  });
  artEl('adminClose').addEventListener('click', () => closeOv('adminOverlay'));
  artEl('adminOverlay').addEventListener('click', async e => {
    if(e.target.id === 'adminOverlay'){ closeOv('adminOverlay'); return; }
    if(!isOwnerUser()) return;
    const tab = e.target.closest('[data-tab]');
    if(tab){ ART.adminTab = tab.dataset.tab; renderAdmin(); return; }
    const btn = e.target.closest('[data-act]');
    if(btn) await handleAdminAction(btn.dataset.act, btn.dataset.id, btn);
  });
  artEl('adminOverlay').addEventListener('change', async e => {
    if(e.target.id !== 'setArtisanEvents' || !isOwnerUser()) return;
    const on = e.target.checked;
    const ok = await dbRun(sb.from('site_settings').upsert({ key:'artisan_events_enabled', value: on ? 'true' : 'false' }, { onConflict:'key' }),
      on ? 'Signalement par les artisans activé' : 'Signalement par les artisans désactivé');
    if(ok) await loadArtisansData(true); else e.target.checked = !on;
  });

  // formulaires
  ART.uploaders.bizImg = makeUploader({ file:'bizImgFile', preview:'bizImgPrev', importBtn:'bizImgImport', remove:'bizImgRemove', status:'bizImgStatus', prefix: () => 'businesses/', maxDim:1600 });
  ART.uploaders.bizLogo = makeUploader({ file:'bizLogoFile', preview:'bizLogoPrev', importBtn:'bizLogoImport', remove:'bizLogoRemove', status:'bizLogoStatus', prefix: () => 'logos/', maxDim:600, keepAlpha:true });
  ART.uploaders.evImg = makeUploader({ file:'evImgFile', preview:'evImgPrev', importBtn:'evImgImport', remove:'evImgRemove', status:'evImgStatus',
    prefix: () => (ART.evMode === 'admin' ? 'events/admin/' : 'events/' + (currentUser ? currentUser.id : 'x') + '/'), maxDim:1600 });
  artEl('bizForm').addEventListener('submit', e => { if(isOwnerUser()) saveBusiness(e); else e.preventDefault(); });
  artEl('bizFormCancel').addEventListener('click', () => closeOv('bizFormOverlay'));
  artEl('evForm').addEventListener('submit', e => { if(currentUser) saveEvent(e); else e.preventDefault(); });
  artEl('evFormCancel').addEventListener('click', () => closeOv('evFormOverlay'));

  // espace artisan
  artEl('myEventsLink').addEventListener('click', () => {
    closeOv('accountOverlay');
    openOv('myEventsOverlay');
    renderMyEvents();
  });
  artEl('myEventsClose').addEventListener('click', () => closeOv('myEventsOverlay'));
  artEl('myEventsOverlay').addEventListener('click', async e => {
    if(e.target.id === 'myEventsOverlay'){ closeOv('myEventsOverlay'); return; }
    if(e.target.id === 'myEvAdd'){ if(artisanFeatureOn()) openEventForm(null, 'artisan'); return; }
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    if(btn.dataset.act === 'my-edit') openEventForm(btn.dataset.id, 'artisan');
    if(btn.dataset.act === 'my-del'){
      if(!confirm('Supprimer cet événement ?')) return;
      if(await dbRun(sb.from('events').delete().eq('id', btn.dataset.id), 'Événement supprimé')) await loadArtisansData(true);
    }
  });
}
initArtisans();

/* ===================== Notation du site ===================== */
function safeGet(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
function safeSet(key, val){ try{ localStorage.setItem(key, val); }catch(e){} }

function getVoterToken(){
  let t = safeGet('site-voter-token');
  if(!t){ t = crypto.randomUUID(); safeSet('site-voter-token', t); }
  return t;
}

async function refreshRatingStats(){
  const el = document.getElementById('ratingStats');
  if(!sb) return;
  try{
    const { data, error } = await sb.rpc('site_rating_stats');
    if(error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const total = Number(row?.total || 0);
    const avg = Number(row?.average || 0);
    if(!total){
      el.textContent = "Sois le premier à donner ton avis !";
      return;
    }
    const avgTxt = avg.toLocaleString('fr-FR', { minimumFractionDigits:1, maximumFractionDigits:1 });
    el.textContent = `★ ${avgTxt} / 5 · ${total} avis` + (safeGet('site-rating-score') ? ' · merci pour ta note !' : '');
  }catch(e){}
}

function initRating(){
  const box = document.getElementById('starRating');
  const saved = safeGet('site-rating-score');
  if(saved){
    const r = box.querySelector(`input[value="${saved}"]`);
    if(r) r.checked = true;
  }
  box.addEventListener('change', async (e)=>{
    const score = Number(e.target.value);
    if(!score) return;
    safeSet('site-rating-score', String(score));
    if(!sb){
      document.getElementById('ratingStats').textContent = "Merci pour ta note !";
      return;
    }
    try{
      const { error } = await sb.rpc('rate_site', { p_token: getVoterToken(), p_score: score });
      if(error) throw error;
      toast("Merci pour ta note !");
      refreshRatingStats();
    }catch(err){
      toast("Impossible d'enregistrer ta note pour le moment.");
    }
  });
  refreshRatingStats();
}
initRating();

document.getElementById('footerYear').textContent = new Date().getFullYear();
document.getElementById('openLegal').onclick = ()=>document.getElementById('legalOverlay').classList.add('open');
document.getElementById('legalClose').onclick = ()=>document.getElementById('legalOverlay').classList.remove('open');
document.getElementById('legalOverlay').addEventListener('click', e=>{
  if(e.target.id === 'legalOverlay') document.getElementById('legalOverlay').classList.remove('open');
});
document.getElementById('openPrivacy').onclick = ()=>document.getElementById('privacyOverlay').classList.add('open');
document.getElementById('privacyClose').onclick = ()=>document.getElementById('privacyOverlay').classList.remove('open');
document.getElementById('privacyOverlay').addEventListener('click', e=>{
  if(e.target.id === 'privacyOverlay') document.getElementById('privacyOverlay').classList.remove('open');
});

populateCountrySelect();
restoreSession();
initStorage();
