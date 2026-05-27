// ════════════════════════════════════════════════════════════
// 1등급 측정기 — 학생 화면 (목업 v3 뽀스 네온 + v1 API 연동, 2026-05-27)
// 계약(SSOT v1-tracker.js): GET /v1/scope, GET/POST /v1/tracker
// 인증: student_id (세션 고정, UI 미입력 — Codex#3)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // 슬라이더 5축 (목업 v3 라벨 = sliders 키. completion_pct = 평균, 서버계산)
  const SLIDERS = ['해석 완성도', '지문 이해도', '문법 완성도', '워크북 완성도', '변형문제 완성도'];
  // 틀린 유형 19종 (목업 v3) — 객관식 14 + 서술형 5
  const OBJ = ['대의파악', '함의추론', '일치불일치', '어법', '어휘', '빈칸추론', '흐름무관', '문장순서', '문장삽입', '요약빈칸', '추론', '연결사', '지칭추론', '학생반응'];
  const WRT = ['요약빈칸영작', '주제/요지영작', '빈칸영작', '한영영작', '복합지문영작'];
  const TYPES = [...OBJ, ...WRT];
  const CIRC = 226; // 2π·36 (도넛)

  let STUDENT = null, SCOPE = null, PASSAGES = [];
  const state = {};            // idx → { sliders{}, counters{}, done[], reinforce }
  const saveTimers = {};       // idx → debounce timer

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parse = (v, d) => { if (v == null) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };

  function getStudent() {
    const raw = localStorage.getItem('pafa_student') || sessionStorage.getItem('pafa_student');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function blankCard() {
    const sliders = {}; SLIDERS.forEach(s => sliders[s] = 0);
    const counters = {}; TYPES.forEach(t => counters[t] = 0);
    return { sliders, counters, done: [], reinforce: false };
  }
  function getCard(idx) { if (!state[idx]) state[idx] = blankCard(); return state[idx]; }

  function cardPct(idx) {
    const c = getCard(idx);
    const sum = SLIDERS.reduce((a, s) => a + (Number(c.sliders[s]) || 0), 0);
    return Math.round(sum / SLIDERS.length);
  }
  function overallPct() {
    if (!PASSAGES.length) return 0;
    const sum = PASSAGES.reduce((a, _, i) => a + cardPct(i), 0);
    return Math.round(sum / PASSAGES.length);
  }
  function ddayNum() {
    if (!SCOPE || !SCOPE.exam_date) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const e = new Date(SCOPE.exam_date); e.setHours(0, 0, 0, 0);
    return Math.round((e - t) / 86400000);
  }

  // ── 진입 ──
  async function boot() {
    STUDENT = getStudent();
    if (!STUDENT || !STUDENT.student_id) { location.href = 'index.html'; return; }
    if (!STUDENT.school || !STUDENT.grade) {
      $('plist').innerHTML = '<div class="state-msg">학교·학년 정보 갱신이 필요해요.<br><a href="index.html">다시 로그인</a> 후 이용해주세요.</div>';
      return;
    }
    $('footAcademy').textContent = ({ J: '저스틴영어학원', P: '패스파인더학원', '4': '4.0' }[STUDENT.academy_code] || '학원') + ' · 1등급 측정기';
    try {
      const sc = await window.api.v1Get('/scope', { academy_code: STUDENT.academy_code, school: STUDENT.school, grade: STUDENT.grade });
      if (!sc.ok || !sc.scope) { $('plist').innerHTML = '<div class="state-msg">아직 등록된 시험범위가 없어요.<br>학원에서 시험범위를 올리면 표시됩니다.</div>'; return; }
      SCOPE = sc.scope;
      PASSAGES = (sc.passages || []).map(p => ({
        id: p.id, num: p.number || p.passage_idx,
        title: (p.passage_text || '').trim().slice(0, 32) || ('지문 ' + (p.number || p.passage_idx)),
        textbook: p.textbook || p.category || '', unit: p.unit || '',
      }));
      $('examLabel').textContent = `${STUDENT.school} · ${STUDENT.grade} · ${SCOPE.exam_year || ''} ${SCOPE.exam_term || ''}`.trim();
      // 기존 입력 로드
      const tr = await window.api.v1Get('/tracker', { student_id: STUDENT.student_id, scope_id: SCOPE.id });
      (tr.progress || []).forEach(pr => {
        const idx = PASSAGES.findIndex(p => p.id === pr.scope_passage_id);
        if (idx < 0) return;
        const c = blankCard();
        const sl = parse(pr.sliders, {}); SLIDERS.forEach(s => { if (sl[s] != null) c.sliders[s] = Number(sl[s]) || 0; });
        const wc = parse(pr.wrong_counters, {}); TYPES.forEach(t => { if (wc[t] != null) c.counters[t] = Number(wc[t]) || 0; });
        c.done = parse(pr.done_types, []) || [];
        c.reinforce = !!pr.watched_reinforce;
        state[idx] = c;
      });
      $('heroWrap').style.display = '';
      $('secLbl').style.display = '';
      $('secLbl').textContent = `시험범위 지문 (${PASSAGES.length}개) — 지문별로 입력하세요`;
      renderList();
      renderHero();
      renderWeak();
    } catch (e) {
      $('plist').innerHTML = '<div class="state-msg" style="color:var(--danger)">불러오기 실패: ' + esc(e.message) + '</div>';
    }
  }

  // ── 지문 목록 ──
  function renderList() {
    $('plist').innerHTML = PASSAGES.map((p, idx) => {
      const pct = cardPct(idx);
      const col = pct >= 100 ? 'var(--accent)' : pct > 0 ? 'var(--accent)' : 'var(--muted)';
      const src = (p.textbook ? `<span class="tagm">${esc(p.textbook)}</span>` : '') + esc(p.unit || '');
      return `<div class="pcard" id="pc-${idx}">
        <div class="top" onclick="trk.toggle(${idx})">
          <div class="num">${esc(p.num)}</div>
          <div class="ptitle"><div class="txt">${esc(p.title)}</div><div class="src">${src || '&nbsp;'}</div></div>
          <div class="pct" id="pct-${idx}" style="color:${col}">${pct}%</div>
        </div>
        <div class="pbody" id="pb-${idx}"></div>
      </div>`;
    }).join('');
  }

  function renderBody(idx) {
    const c = getCard(idx);
    const sliders = SLIDERS.map((s, i) => `
      <div class="slider"><div class="row"><b>${s}</b><span class="v" id="sv-${idx}-${i}">${c.sliders[s] || 0}%</span></div>
        <input type="range" min="0" max="100" step="5" value="${c.sliders[s] || 0}" oninput="trk.slide(${idx},${i},this.value)"></div>`).join('');
    const counter = (t) => {
      const n = c.counters[t] || 0;
      return `<div class="counter ${n > 0 ? 'hit' : ''}" id="ct-${idx}-${cid(t)}"><div class="nm">${esc(t)}</div>
        <div class="ctl"><button class="minus" onclick="trk.cnt(${idx},'${esc(t)}',-1)">−</button>
        <span class="n ${n > 0 ? 'on' : ''}" id="cn-${idx}-${cid(t)}">${n}</span>
        <button class="plus" onclick="trk.cnt(${idx},'${esc(t)}',1)">+</button></div></div>`;
    };
    const chips = TYPES.map(t => `<span class="chip ${c.done.includes(t) ? 'on' : ''}" id="ch-${idx}-${cid(t)}" onclick="trk.chip(${idx},'${esc(t)}')">${esc(t)}</span>`).join('');
    $('pb-' + idx).innerHTML = `
      <div class="block-lbl">공부 완성도 <span class="hint">각 항목을 드래그해서 지금 수준을 표시하세요</span></div>
      ${sliders}
      <div class="block-lbl" style="color:var(--danger);">계속 틀리는 유형 <span class="hint">틀릴 때마다 +를 눌러 기록하세요 (내 약점 측정)</span></div>
      <div class="sub-lbl">객관식</div><div class="cgrid">${OBJ.map(counter).join('')}</div>
      <div class="sub-lbl" style="margin-top:11px;">서술형</div><div class="cgrid">${WRT.map(counter).join('')}</div>
      <div class="block-lbl" style="color:var(--accent);">완성한 유형 <span class="hint">이제 자신 있는 유형을 체크하세요</span></div>
      <div class="chips">${chips}</div>
      <div class="reinforce"><div class="t">직전보강 강의 시청<small>시험 전 보강 강의를 봤나요?</small></div>
        <div class="toggle ${c.reinforce ? '' : 'off'}" id="tg-${idx}" onclick="trk.toggleReinforce(${idx})"></div></div>
      <div class="savebar"><button class="btn save" onclick="trk.save(${idx},true)">저장</button>
        <button class="btn next" onclick="trk.next(${idx})">다음 지문 →</button></div>
      <div class="saved-note" id="note-${idx}">입력하면 자동 저장됩니다</div>`;
  }
  function cid(t) { return t.replace(/[^0-9a-zA-Z가-힣]/g, '_'); }

  // ── hero (도넛 + D-day + 개인화 멘트) ──
  function renderHero() {
    const pct = overallPct();
    $('overallPct').textContent = pct + '%';
    $('donutArc').setAttribute('stroke-dashoffset', String(Math.round(CIRC * (1 - pct / 100))));
    const d = ddayNum();
    $('ddayBadge').textContent = d == null ? '시험일 미정' : (d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : `D+${-d}`);
    $('heroMsg').innerHTML = `<b style="color:var(--accent);font-weight:700;">${ddayLine(d, pct)}</b><br>${personalLine(d, pct)}`;
  }
  function ddayLine(d, p) {
    if (d == null) return '함께 차근차근 채워가요';
    if (d < 0) return '시험은 끝났어요. 정말 수고했어요!';
    if (d === 0) return '오늘이 시험! 자신 있게 가요';
    if (d <= 3) return `D-${d} · 컨디션 챙기고 차분하게`;
    if (d <= 7) return `D-${d} · 마지막 1주, 약점만 집중!`;
    if (d <= 14) return `D-${d} · 2주 남았어요, 페이스 끌어올려요`;
    if (d <= 30) return `D-${d} · 한 달 안쪽, 지금이 황금기`;
    if (d <= 60) return `D-${d} · 여유 있을 때 기초부터 탄탄히`;
    return `D-${d} · 천천히 함께 시작해요`;
  }
  function pctLine(p) {
    if (p >= 100) return '범위 전체 완성! 약점 유형만 마무리하면 완벽해요';
    if (p >= 80) return '거의 다 왔어요 · 틀린 유형만 한 번 더 점검해요';
    if (p >= 60) return '후반이에요 · 자신 없는 지문 위주로 돌려요';
    if (p >= 40) return '절반 넘었어요 · 약점 유형부터 메워가요';
    if (p >= 20) return '초반 페이스 좋아요 · 하루 한 지문씩 쌓아가요';
    if (p > 0) return '막 시작했어요 · 오늘 한 지문이면 충분해요';
    return '아직 시작 전 · 첫 지문부터 가볍게 열어볼까요?';
  }
  function personalLine(d, pct) {
    // 전체 집계
    const weak = {}; TYPES.forEach(t => weak[t] = 0);
    let anyReinforce = false, doneCnt = 0;
    PASSAGES.forEach((_, i) => {
      const c = getCard(i);
      TYPES.forEach(t => weak[t] += c.counters[t] || 0);
      if (c.reinforce) anyReinforce = true;
      if (cardPct(i) > 0) doneCnt++;
    });
    const sliderAvg = {};
    SLIDERS.forEach(s => { sliderAvg[s] = PASSAGES.length ? PASSAGES.reduce((a, _, i) => a + (getCard(i).sliders[s] || 0), 0) / PASSAGES.length : 0; });
    // 1. 시험 임박 + 직전보강 미시청
    if (d != null && d >= 0 && d <= 7 && !anyReinforce) return '시험이 코앞! 직전보강 강의부터 챙겨봐요';
    // 2. 특정 유형 반복 오답
    const wk = Object.entries(weak).sort((a, b) => b[1] - a[1])[0];
    if (wk && wk[1] >= 3) return `<b style="color:var(--danger)">${esc(wk[0])}</b>이 자꾸 걸리네요. 그것만 잡으면 점수가 확 올라요`;
    // 3. 슬라이더 한 항목만 유독 낮음
    const vals = Object.values(sliderAvg), avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const low = Object.entries(sliderAvg).sort((a, b) => a[1] - b[1])[0];
    if (low && (avg - low[1]) >= 15) return `<b>${esc(low[0])}</b>이 약해요. 거기만 보강하면 균형이 맞아요`;
    // 4. 완성도 높은데 오답 多
    const wkSum = Object.values(weak).reduce((a, b) => a + b, 0);
    if (pct >= 70 && wkSum >= 10) return '완성도는 높은데 실수가 잦아요. 실전 정확도를 올려봐요';
    // 5. fallback
    return pctLine(pct);
  }

  // ── 약점 Top4 ──
  function renderWeak() {
    const weak = {}; TYPES.forEach(t => weak[t] = 0);
    PASSAGES.forEach((_, i) => TYPES.forEach(t => weak[t] += getCard(i).counters[t] || 0));
    const top = Object.entries(weak).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (!top.length) { $('weakWrap').innerHTML = ''; return; }
    $('weakWrap').innerHTML = `<div class="sec-lbl">내 약점 (가장 많이 틀린 유형)</div>
      <div class="weak-box"><div class="h">집중 보완 필요 Top ${top.length}</div>
      ${top.map(([t, n]) => `<span class="w">${esc(t)} ×${n}</span>`).join('')}</div>`;
  }

  // ── 핸들러 (window.trk) ──
  const openIdx = { v: -1 };
  window.trk = {
    toggle(idx) {
      const card = $('pc-' + idx);
      const isOpen = card.classList.contains('open');
      if (openIdx.v >= 0 && openIdx.v !== idx) { const o = $('pc-' + openIdx.v); if (o) o.classList.remove('open'); }
      if (isOpen) { card.classList.remove('open'); openIdx.v = -1; }
      else { renderBody(idx); card.classList.add('open'); openIdx.v = idx; card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    },
    slide(idx, i, val) {
      const c = getCard(idx); c.sliders[SLIDERS[i]] = Number(val);
      $('sv-' + idx + '-' + i).textContent = val + '%';
      refreshCardPct(idx); this.save(idx);
    },
    cnt(idx, t, delta) {
      const c = getCard(idx); c.counters[t] = Math.max(0, (c.counters[t] || 0) + delta);
      const n = c.counters[t];
      const cell = $('cn-' + idx + '-' + cid(t)), box = $('ct-' + idx + '-' + cid(t));
      if (cell) { cell.textContent = n; cell.classList.toggle('on', n > 0); }
      if (box) box.classList.toggle('hit', n > 0);
      this.save(idx);
    },
    chip(idx, t) {
      const c = getCard(idx); const i = c.done.indexOf(t);
      if (i >= 0) c.done.splice(i, 1); else c.done.push(t);
      const el = $('ch-' + idx + '-' + cid(t)); if (el) el.classList.toggle('on', c.done.includes(t));
      this.save(idx);
    },
    toggleReinforce(idx) {
      const c = getCard(idx); c.reinforce = !c.reinforce;
      const el = $('tg-' + idx); if (el) el.classList.toggle('off', !c.reinforce);
      this.save(idx);
    },
    next(idx) {
      if (idx + 1 < PASSAGES.length) this.toggle(idx + 1);
      else { const o = $('pc-' + idx); if (o) o.classList.remove('open'); openIdx.v = -1; }
    },
    save(idx, immediate) {
      if (saveTimers[idx]) clearTimeout(saveTimers[idx]);
      const run = () => pushToServer(idx);
      if (immediate) run(); else saveTimers[idx] = setTimeout(run, 700);
    },
  };

  function refreshCardPct(idx) {
    const pct = cardPct(idx);
    const el = $('pct-' + idx);
    if (el) { el.textContent = pct + '%'; el.style.color = pct > 0 ? 'var(--accent)' : 'var(--muted)'; }
    renderHero();
  }

  async function pushToServer(idx) {
    const p = PASSAGES[idx]; if (!p || !p.id || !STUDENT) return;
    const c = getCard(idx);
    const note = $('note-' + idx);
    try {
      const r = await window.api.v1Post('/tracker', {
        student_id: STUDENT.student_id, scope_passage_id: p.id,
        sliders: c.sliders, wrong_counters: c.counters, done_types: c.done,
        watched_reinforce: c.reinforce, memo: '',
      });
      if (!r.ok) throw new Error(r.error || '저장 실패');
      if (note) { note.textContent = '✓ 저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); note.style.color = 'var(--accent)'; }
      renderWeak();
    } catch (e) {
      if (note) { note.textContent = '저장 실패 (네트워크) — 다시 시도하세요'; note.style.color = 'var(--danger)'; }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
