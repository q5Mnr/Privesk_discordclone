const STORAGE_KEY = 'channel_drafts';

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAll(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new CustomEvent('channel_drafts_updated'));
}

export function getChannelDraft(channelId) {
  if (!channelId) return '';
  return loadAll()[channelId] || '';
}

export function setChannelDraft(channelId, text) {
  if (!channelId) return;
  const drafts = loadAll();
  const value = text ?? '';
  if (!value.trim()) {
    delete drafts[channelId];
  } else {
    drafts[channelId] = value;
  }
  saveAll(drafts);
}

export function hasChannelDraft(channelId) {
  return Boolean(getChannelDraft(channelId).trim());
}

export function getDraftPreview(channelId, maxLen = 24) {
  const draft = getChannelDraft(channelId).replace(/\s+/g, ' ').trim();
  if (!draft) return '';
  return draft.length > maxLen ? `${draft.slice(0, maxLen)}…` : draft;
}
