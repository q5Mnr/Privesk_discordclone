const API_URL = '';

export async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function apiGet(path) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data.error || 'Request failed');
    } catch (e) {
      if (e.message === 'Request failed') throw e;
      throw new Error(`HTTP ${res.status}`);
    }
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function apiPost(path, body) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data.error || 'Request failed');
    } catch (e) {
      if (e.message === 'Request failed') throw e;
      throw new Error(`HTTP ${res.status}`);
    }
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function apiPut(path, body) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data.error || 'Request failed');
    } catch (e) {
      if (e.message === 'Request failed') throw e;
      throw new Error(`HTTP ${res.status}`);
    }
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function apiDelete(path) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data.error || 'Request failed');
    } catch (e) {
      if (e.message === 'Request failed') throw e;
      throw new Error(`HTTP ${res.status}`);
    }
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function apiUpload(files) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!res.ok) throw new Error('Upload failed');
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}
