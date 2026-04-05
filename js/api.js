const API_BASE = 'https://pfexam.classby.kr/exam';

async function readJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || '요청 처리에 실패했습니다.');
  }
  return data;
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });

  return readJsonResponse(response);
}

async function apiGet(path, params) {
  const query = new URLSearchParams(params || {}).toString();
  const url = query ? `${API_BASE}${path}?${query}` : `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: 'GET',
  });

  return readJsonResponse(response);
}

window.API_BASE = API_BASE;
window.api = { apiPost, apiGet };
