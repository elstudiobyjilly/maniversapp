const API_BASE = 'https://maniverse444.onrender.com';

let _token = null;
export function setApiToken(t) { _token = t; }

export async function req(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 204) return null;
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      const err = new Error('Session expired');
      err.status = 401;
      throw err;
    }
    const msg = typeof data.detail === 'string'
      ? data.detail
      : Array.isArray(data.detail)
        ? data.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
        : JSON.stringify(data.detail) || 'Error';
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── AUTH ──────────────────────────────────────────────────────────────
export async function loginRequest(username, password) {
  const res = await fetch(API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

export async function registerRequest({ full_name, username, email, password }) {
  const res = await fetch(API_BASE + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data;
}

export async function sendOtp(email, purpose = 'verify') {
  return req('POST', '/auth/send-otp', { email, purpose });
}

export async function verifyOtp(email, code) {
  return req('POST', '/auth/verify-otp', { email, code });
}

export async function forgotPassword(email) {
  return req('POST', '/auth/forgot-password', { email });
}

// code = OTP sent via forgotPassword; returns a fresh session token like login.
export async function resetPassword(email, code, new_password) {
  return req('POST', '/auth/reset-password', { email, code, new_password });
}

export async function changePassword(current_password, new_password) {
  return req('POST', '/auth/change-password', { current_password, new_password });
}

export async function deleteAccount() {
  return req('DELETE', '/auth/delete-account');
}

export async function submitFeedback(message, category = 'general') {
  return req('POST', '/auth/feedback', { message, category });
}

export async function getMe() {
  return req('GET', '/auth/me');
}

// ── DESIRES ───────────────────────────────────────────────────────────
export async function getDesires() {
  return req('GET', '/desires');
}

// Free: 2 desires TOTAL EVER, no refund on delete. Paid: 50/month.
export async function createDesire({ title, description = '', target_date = null, category = null, images = null }) {
  return req('POST', '/desires', { title, description, target_date, category, images });
}

export async function getDesire(desireId) {
  return req('GET', `/desires/${desireId}`);
}

// status: 'active' | 'manifested' | 'released'
export async function updateDesire(desireId, body) {
  return req('PATCH', `/desires/${desireId}`, body);
}

export async function deleteDesire(desireId) {
  return req('DELETE', `/desires/${desireId}`);
}

export async function touchDesireActivity(desireId) {
  return req('PATCH', `/desires/${desireId}/activity`);
}

// Link a desire to another content item -- content_type must be one of:
// affirmation, story, mind_movie, script, feel_it_card, let_go, practice,
// read, self_work, gratitude, meditation, vision_board, belief, roadmap,
// subliminal.
export async function linkDesire(desireId, { content_type, content_id, content_title = null }) {
  return req('POST', `/desires/${desireId}/links`, { content_type, content_id, content_title });
}

export async function unlinkDesire(desireId, linkId) {
  return req('DELETE', `/desires/${desireId}/links/${linkId}`);
}

// ── AFFIRMATIONS ──────────────────────────────────────────────────────
// Save a user-WRITTEN affirmation set (not AI-generated). Matches
// website's "own affirmations" flow — counts against own_affirmations_total
// (free) / own_affirmations_per_month (paid), separate from AI generation.
export async function saveOwnAffirmationSet({ title = 'My Affirmations', affs, repeat_count = 10, voice_id = 'luna' }) {
  return req('POST', '/affirmations/own', { title, affs, repeat_count, voice_id });
}

// Poll while TTS is generating in the background -- returns audio_url once
// ready, plus live "N of M" progress. Call every ~2s after generate/own.
export async function getAffirmationAudioStatus(affId) {
  return req('GET', `/affirmations/${affId}/audio-status`);
}

// Force a fresh audio generation in a specific voice (e.g. user switches
// from Luna to Orion on an existing set). Paid plans only (cloudinary_audio).
export async function regenerateAffirmationAudio(affId, voiceId) {
  return req('POST', `/affirmations/${affId}/regenerate-audio`, { voice_id: voiceId });
}

export async function generateAffirmation(desire, opts = {}) {
  const body = {
    desire,
    count: opts.count || 5,
    repeat_count: opts.repeat_count || 10,
  };
  if (opts.style) body.style = opts.style;
  return req('POST', '/affirmations/generate', body);
}

export async function getAffirmations(limit = 30, offset = 0) {
  return req('GET', `/affirmations/?limit=${limit}&offset=${offset}`);
}

export async function favoriteAffirmation(affId) {
  return req('POST', `/affirmations/${affId}/favorite`);
}

export async function pinAffirmation(affId) {
  return req('POST', `/affirmations/${affId}/pin`);
}

export async function renameAffirmationSet(affId, desire) {
  return req('PATCH', `/affirmations/${affId}/rename`, { desire });
}

export async function deleteAffirmation(affId) {
  return req('DELETE', `/affirmations/${affId}`);
}

export async function getPinnedSets() {
  return req('GET', '/affirmations/pinned-sets');
}

export async function savePinnedSets(sets) {
  return req('PUT', '/affirmations/pinned-sets', { sets });
}

export async function getLastSession() {
  return req('GET', '/affirmations/last-session');
}

export async function saveLastSession(data) {
  return req('PUT', '/affirmations/last-session', { data });
}

export async function getMyAffLibrary() {
  return req('GET', '/affirmations/my-library');
}

export async function saveMyAffLibrary(items) {
  return req('PUT', '/affirmations/my-library', { items });
}

// ── STORIES ───────────────────────────────────────────────────────────
export async function generateStory(desire, opts = {}) {
  return req('POST', '/stories/generate', {
    desire,
    length: opts.length || 'medium',
    theme: opts.theme || 'general',
    story_mode: opts.story_mode || '',
    label: opts.label || '',
  });
}

export async function saveStory({ title, content, desire = '', client_id = '', source = 'user' }) {
  return req('POST', '/stories/', { title, content, desire, client_id, source });
}

export async function getStories(limit = 20, offset = 0) {
  return req('GET', `/stories/?limit=${limit}&offset=${offset}`);
}

export async function getStoryUsage() {
  return req('GET', '/stories/usage');
}

export async function favoriteStory(storyId) {
  return req('POST', `/stories/${storyId}/favorite`);
}

export async function pinStory(storyId) {
  return req('POST', `/stories/${storyId}/pin`);
}

export async function updateStoryTitle(storyId, title) {
  return req('PATCH', `/stories/${storyId}/title`, { title });
}

export async function regenerateStory(storyId) {
  return req('POST', `/stories/${storyId}/regenerate`);
}

export async function deleteStory(storyId) {
  return req('DELETE', `/stories/${storyId}`);
}

// Save a user-WRITTEN story (matches website's "write your own story" flow).
export async function saveOwnStory({ title, content, desire = '', client_id = '', voice_id = 'luna' }) {
  return req('POST', '/stories/', { title, content, desire, client_id, source: 'user', voice_id });
}

export async function getStoryAudioStatus(storyId) {
  return req('GET', `/stories/${storyId}/audio-status`);
}

export async function regenerateStoryAudio(storyId, voiceId) {
  return req('POST', `/stories/${storyId}/regenerate-audio`, { voice_id: voiceId });
}

export async function updateStoryLabel(storyId, label) {
  return req('PATCH', `/stories/${storyId}/label`, { label });
}

export async function updateStoryContent(storyId, content, title = '', voiceId = 'luna') {
  return req('PATCH', `/stories/${storyId}/content`, { content, title, voice_id: voiceId });
}

// Daily story-play cap tracking (3/day free, unlimited paid).
export async function getStoryPlaysToday() {
  return req('GET', '/stories/plays/today');
}

export async function addStoryPlay() {
  return req('POST', '/stories/plays/add');
}

// ── VOICES ────────────────────────────────────────────────────────────
export async function getVoices() {
  return req('GET', '/tts/voices');
}

// ── PLAN / LIMITS ─────────────────────────────────────────────────────
// Single source of truth for gating — mirrors PLAN_LIMITS in backend
// core/config.py. Always fetch live rather than hardcoding limits here.
export async function getPlanLimits() {
  return req('GET', '/plan/limits');
}

export async function getPlanSelection(feature) {
  return req('GET', `/plan/selections/${feature}`);
}

export async function savePlanSelection(feature, itemIds) {
  return req('PUT', `/plan/selections/${feature}`, { item_ids: itemIds });
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────
export async function createCheckout(priceKey, voiceId = null) {
  const body = { price_key: priceKey };
  if (voiceId) body.voice_id = voiceId;
  return req('POST', '/subscriptions/checkout', body);
}

export async function openBillingPortal() {
  return req('POST', '/subscriptions/billing-portal');
}

export async function getFoundingCount() {
  return req('GET', '/subscriptions/founding-count');
}


// ── TTS / AUDIO ───────────────────────────────────────────────────────
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '', i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    result += chars[bytes[i] >> 2];
    result += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += chars[bytes[i + 2] & 63];
  }
  if (i < bytes.length) {
    const b0 = bytes[i], b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[(b1 & 15) << 2] : '=';
    result += '==';
  }
  return result;
}

export async function getItemAudio(itemType, itemId, text, voiceId = 'luna') {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  const res = await fetch(API_BASE + '/tts/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, item_type: itemType, item_id: itemId, voice_id: voiceId, speed: 1.0 }),
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Audio generation failed');
    return data.url;
  }
  if (!res.ok) throw new Error('Audio generation failed');
  const buffer = await res.arrayBuffer();
  return 'data:audio/mpeg;base64,' + arrayBufferToBase64(buffer);
}

export async function getAffirmationAudio(itemId, text, voiceId = 'luna') {
  return getItemAudio('affirmation', itemId, text, voiceId);
}

// ── SUBLIMINAL ────────────────────────────────────────────────────────
// Free users' 2 permanent samples (1 audible + 1 silent) -- always
// available regardless of plan, even on paid.
export async function getSubPreloaded() {
  return req('GET', '/subliminal/preloaded');
}

export async function getSubBackgrounds() {
  return req('GET', '/subliminal/backgrounds');
}

export async function getSubAffirmationSets() {
  return req('GET', '/subliminal/affirmation-sets');
}

export async function saveSubSession(payload) {
  return req('POST', '/subliminal/sessions', payload);
}

export async function getSubSessions() {
  return req('GET', '/subliminal/sessions');
}

export async function deleteSubSession(sessionId) {
  return req('DELETE', `/subliminal/sessions/${sessionId}`);
}

export function resolveMusicUrl(trackId) {
  return `https://manivers.com/sounds/${trackId}.mp3`;
}

// Server-side DSB-SC "Silent" subliminal audio -- returns a {uri, headers}
// source for Audio.Sound.createAsync (the endpoint needs the auth header,
// which createAsync supports passing straight through). Regenerated fresh
// on every call server-side, never cached.
export function getSilentAudioSource(affirmationId) {
  return {
    uri: `${API_BASE}/subliminal/silent-audio?affirmation_id=${affirmationId}`,
    headers: _token ? { Authorization: 'Bearer ' + _token } : {},
  };
}

// ── VISION BOARD ──────────────────────────────────────────────────────
export async function getVisionBoard() {
  return req('GET', '/vision-board/');
}

export async function saveVisionBoard(items, isLocked = null) {
  const body = { items };
  if (isLocked !== null) body.is_locked = isLocked;
  return req('PUT', '/vision-board/', body);
}

export async function setVisionBoardLock(isLocked) {
  return req('PUT', '/vision-board/lock', { is_locked: isLocked });
}

// Images now go through our own backend (R2 storage), NOT direct-to-
// Cloudinary. This also lets the backend enforce plan gating (Vision
// Board / Mind Movie are paid-only) before ever writing to storage.
// folder must be 'vision-board' or 'mind-movie'.
export async function uploadImage(localUri, folder = 'vision-board') {
  const formData = new FormData();
  formData.append('file', { uri: localUri, type: 'image/jpeg', name: 'upload.jpg' });
  formData.append('folder', folder);

  const headers = {};
  if (_token) headers['Authorization'] = 'Bearer ' + _token;

  const res = await fetch(API_BASE + '/image/upload', {
    method: 'POST',
    headers, // NOTE: do not set Content-Type — RN sets the multipart boundary itself
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = typeof data.detail === 'string' ? data.detail : 'Image upload failed';
    throw new Error(msg);
  }
  return data.secure_url;
}

// Deprecated alias kept so older screens don't crash while being migrated.
export async function uploadImageToCloudinary(localUri) {
  return uploadImage(localUri, 'vision-board');
}


// ── MIND MOVIE ────────────────────────────────────────────────────────
export async function getMindMovies() {
  return req('GET', '/mindmovie/');
}

// NOTE: `voice` is REQUIRED and is locked for the movie's lifetime once
// created -- the backend never accepts a voice change on update (matches
// mindmovie.py MMUpdate, which intentionally omits voice).
export async function createMindMovie({ title, scenes, mood = 'spiritual', slideDur = 8, loop = false, voice = 'luna', client_id = null }) {
  return req('POST', '/mindmovie/', { title, scenes, mood, slideDur, loop, voice, client_id });
}

export async function updateMindMovie(movieId, { title, scenes, mood = 'spiritual', slideDur = 8, loop = false }) {
  return req('PUT', `/mindmovie/${movieId}`, { title, scenes, mood, slideDur, loop });
}

export async function deleteMindMovie(movieId) {
  return req('DELETE', `/mindmovie/${movieId}`);
}

// Finalize is the ONLY point the mind-movie plan cap is actually enforced
// (drafts/edits are free). Call this on the "Save" button, not on every
// scene edit. Returns 403 upgrade_required or mind_movie_limit_reached if
// the user's plan slot is full.
export async function finalizeMindMovie(movieId) {
  return req('POST', `/mindmovie/${movieId}/finalize`);
}

// Pre-generates TTS for every scene in the movie's locked voice and caches
// to Cloudinary. Call once right before/after finalize.
export async function generateMindMovieAudio(movieId) {
  return req('POST', `/mindmovie/${movieId}/generate-audio`);
}

// ── ORACLE ────────────────────────────────────────────────────────────
export async function pullOracleCard() {
  return req('GET', '/oracle/pull');
}

export async function getOracleHistory() {
  return req('GET', '/oracle/history');
}

// ── GRATITUDE ─────────────────────────────────────────────────────────
export async function addGratitude(content) {
  return req('POST', '/gratitude/', { content });
}

export async function getGratitudeList(limit = 50, offset = 0) {
  return req('GET', `/gratitude/?limit=${limit}&offset=${offset}`);
}

export async function deleteGratitude(itemId) {
  return req('DELETE', `/gratitude/${itemId}`);
} 

// ── BELIEFS ───────────────────────────────────────────────────────────
export async function getBeliefs() {
  return req('GET', '/beliefs/');
}

export async function addBelief(belief) {
  return req('POST', '/beliefs/', { belief });
}

export async function updateBelief(beliefId, { belief, reframe }) {
  const body = {};
  if (belief !== undefined) body.belief = belief;
  if (reframe !== undefined) body.reframe = reframe;
  return req('PATCH', `/beliefs/${beliefId}`, body);
}

export async function deleteBelief(beliefId) {
  return req('DELETE', `/beliefs/${beliefId}`);
}

// ── LET GO ────────────────────────────────────────────────────────────
export async function getLetGo() {
  return req('GET', '/letgo/');
}

export async function addLetGo(content) {
  return req('POST', '/letgo/', { content });
}

export async function deleteLetGo(entryId) {
  return req('DELETE', `/letgo/${entryId}`);
}

// ── FUTURE SELF ───────────────────────────────────────────────────────
export async function getFutureSelf() {
  return req('GET', '/futureself/');
}

export async function saveFutureSelf(body) {
  return req('POST', '/futureself/', body);
}

// ── IDENTITY ──────────────────────────────────────────────────────────
export async function getIdentity() {
  return req('GET', '/identity/');
}

export async function saveIdentity(body) {
  return req('POST', '/identity/', body);
}

// ── ROADMAP ───────────────────────────────────────────────────────────
export async function getRoadmaps() {
  return req('GET', '/roadmap/');
}

export async function createRoadmap({ desire, days, weeks, practices = [] }) {
  return req('POST', '/roadmap/', { desire, days, weeks, practices });
}

export async function checkRoadmapAction(rmId, week, actionIdx, checked) {
  return req('PATCH', `/roadmap/${rmId}/check`, { week, action_idx: actionIdx, checked });
}

export async function noteRoadmap(rmId, week, note) {
  return req('PATCH', `/roadmap/${rmId}/note`, { week, note });
}

export async function deleteRoadmap(rmId) {
  return req('DELETE', `/roadmap/${rmId}`);
}

// ── SCRIPTING ─────────────────────────────────────────────────────────
export async function getScripts() {
  return req('GET', '/scripting/');
}

export async function addScript(content) {
  return req('POST', '/scripting/', { content });
}

export async function updateScript(entryId, content) {
  return req('PATCH', `/scripting/${entryId}`, { content });
}

export async function deleteScript(entryId) {
  return req('DELETE', `/scripting/${entryId}`);
}

// "Daily Script" is a separate resource from the Dream Life Script above —
// one upsert-by-date entry per day, matching the website's script-my-day
// endpoints (no delete endpoint exists server-side; the site only clears
// its local cache, so we mirror that instead of inventing one).
export async function getScriptMyDay() {
  return req('GET', '/practice/script-my-day');
}

export async function saveScriptMyDay(content, scriptDate) {
  return req('POST', '/practice/script-my-day', { content, script_date: scriptDate });
}

// ── REPS ──────────────────────────────────────────────────────────────
export async function getRepsToday() {
  return req('GET', '/reps/today');
}

export async function addReps(count) {
  return req('POST', '/reps/add', { count });
}

// ── TRACKER (HABITS) ─────────────────────────────────────────────────
export async function getHabits() {
  return req('GET', '/tracker/');
}

export async function addHabit(habit) {
  return req('POST', '/tracker/', { habit });
}

export async function toggleHabitCheck(habitId, date) {
  return req('PATCH', `/tracker/${habitId}/check`, { date });
}

export async function deleteHabit(habitId) {
  return req('DELETE', `/tracker/${habitId}`);
}

// ── MANIFESTED ────────────────────────────────────────────────────────
export async function getManifested() {
  return req('GET', '/manifested/');
}

export async function addManifested({ title, note = '', desire_id = null, photo_url = '' }) {
  return req('POST', '/manifested/', { title, note, desire_id, photo_url });
}

export async function deleteManifested(itemId) {
  return req('DELETE', `/manifested/${itemId}`);
}

// ── PRACTICE LOG: SYNC LOG ───────────────────────────────────────────
export async function getSyncLog() {
  return req('GET', '/practice/sync-log');
}

export async function addSyncLog(tag, content) {
  return req('POST', '/practice/sync-log', { tag, content });
}

export async function deleteSyncLog(entryId) {
  return req('DELETE', `/practice/sync-log/${entryId}`);
}

// ── PRACTICE LOG: JOURNAL ─────────────────────────────────────────────
export async function getJournal() {
  return req('GET', '/practice/journal');
}

export async function addJournalEntry(prompt, content) {
  return req('POST', '/practice/journal', { prompt, content });
}

export async function deleteJournalEntry(entryId) {
  return req('DELETE', `/practice/journal/${entryId}`);
}

// ── PRACTICE LOG: ABUNDANCE CHEQUE ─────────────────────────────────────
export async function getAbundanceCheque() {
  return req('GET', '/practice/abundance-cheque');
}

export async function saveAbundanceCheque({ pay_to, amount, memo = '' }) {
  return req('POST', '/practice/abundance-cheque', { pay_to, amount, memo });
}

// ── PRACTICE LOG: DAILY INTENTION ──────────────────────────────────────
export async function getDailyIntention() {
  return req('GET', '/practice/daily-intention');
}

export async function saveDailyIntention(intention) {
  return req('POST', '/practice/daily-intention', { intention });
}

// ── PRACTICE LOG: METHODS SESSIONS & CHECKS ────────────────────────────
export async function getPracticeChecks() {
  return req('GET', '/practice/sessions/checks');
}

export async function savePracticeChecks(checksData) {
  return req('PUT', '/practice/sessions/checks', checksData);
}

export async function logPracticeSession(name) {
  return req('POST', '/practice/sessions', { name });
}

export async function getPracticeSessions() {
  return req('GET', '/practice/sessions');
}

// ── HOROSCOPE ─────────────────────────────────────────────────────────
export async function generateHoroscope(starSign) {
  return req('POST', '/horoscope/generate', { star_sign: starSign });
}

// ── PROFILE ───────────────────────────────────────────────────────────
export async function getProfile() {
  return req('GET', '/profile');
}

export async function updateProfile(body) {
  return req('PUT', '/profile', body);
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────
export async function getSubscriptionStatus() {
  return req('GET', '/subscriptions/status');
}

export async function cancelSubscription() {
  return req('POST', '/subscriptions/cancel');
}

export async function reactivateSubscription() {
  return req('POST', '/subscriptions/reactivate');
}

// ── COMMUNITY ─────────────────────────────────────────────────────────
export async function getCommunityPosts(limit = 30, offset = 0) {
  return req('GET', `/community/?limit=${limit}&offset=${offset}`);
}

export async function createCommunityPost({ content, show_name = false, category = 'general', post_type = 'intention' }) {
  return req('POST', '/community/', { content, show_name, category, post_type });
}

export async function loveCommunityPost(postId) {
  return req('POST', `/community/${postId}/love`);
}

export async function deleteCommunityPost(postId) {
  return req('DELETE', `/community/${postId}`);
}

// ── DISCOVER ──────────────────────────────────────────────────────────
export async function getDiscoverPosts() {
  return req('GET', '/discover/posts');
}

export async function getDiscoverGuides() {
  return req('GET', '/discover/guides');
}

// ── REVIEWS ───────────────────────────────────────────────────────────
export async function submitReview(text, rating) {
  return req('POST', '/reviews', { text, rating });
}

export async function getApprovedReviews() {
  return req('GET', '/reviews/approved');
}

// ── FEEL IT ───────────────────────────────────────────────────────────
export async function generateFeelIt(state) {
  return req('POST', '/feelit/generate', { state });
}

export async function saveFeelItCard(card) {
  return req('POST', '/feelit/cards', card);
}

export async function getFeelItCards(favouritesOnly = false) {
  return req('GET', `/feelit/cards?favourites_only=${favouritesOnly}`);
}

export async function updateFeelItCard(cardId, body) {
  return req('PATCH', `/feelit/cards/${cardId}`, body);
}

export async function deleteFeelItCard(cardId) {
  return req('DELETE', `/feelit/cards/${cardId}`);
}

// ── FUN TOOLS — generic user KV store ───────────────────────────────────
// Backend allows these exact keys only: fun_bank, fun_auction, fun_spell,
// fun_ritual, fun_roulette, fun_frequency, fun_beat, fun_moon, fun_bubble,
// fun_identity_flip, fun_prefs. Value can be any JSON-serialisable data.
export async function getFunToolData(key) {
  const res = await req('GET', `/user-kv/${key}`);
  return res ? res.value : null;
}

export async function saveFunToolData(key, value) {
  return req('PUT', `/user-kv/${key}`, { value });
}

// ── GENERIC KV (unrestricted, any key) — used by Desire Action & matches
// the website's life.js sync pattern. NOT the same endpoint as the Fun
// Tools KV above — this one accepts any key string, no allowlist.
export async function getKv(key) {
  const res = await req('GET', `/affirmations/kv/${key}`);
  return res ? res.value : null;
}

export async function saveKv(key, value) {
  return req('PUT', '/affirmations/kv', { key, value });
}

export const API = API_BASE;