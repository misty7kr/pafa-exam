const API_BASE = 'https://pfexam.classby.kr/exam';
// 1등급 측정기 v1 — 기존 API_BASE(/exam)와 분리 필수 (별도 라우터)
const V1_BASE = 'https://pfexam.classby.kr/v1';

async function readJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || '요청 처리에 실패했습니다.');
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

async function v1Post(path, body) {
  const response = await fetch(`${V1_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return readJsonResponse(response);
}

async function v1Get(path, params) {
  const query = new URLSearchParams(params || {}).toString();
  const url = query ? `${V1_BASE}${path}?${query}` : `${V1_BASE}${path}`;
  const response = await fetch(url, { method: 'GET' });
  return readJsonResponse(response);
}

window.API_BASE = API_BASE;
window.V1_BASE = V1_BASE;
window.api = { apiPost, apiGet, v1Post, v1Get };
