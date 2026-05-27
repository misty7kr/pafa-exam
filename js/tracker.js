// ════════════════════════════════════════════════════════════
// 1등급 측정기 — 학생 자가평가 화면 (2026-05-27 신규)
// 계약(SSOT v1-tracker.js): GET /v1/scope, GET/POST /v1/tracker
// 인증: student_id (세션 고정값, UI 입력받지 않음 — Codex#3)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // 슬라이더 5축 = 영어 지문 학습 완성도 (completion_pct = 5축 평균, 서버계산)
  const SLIDERS = [
    { key: '어휘', label: '어휘' },
    { key: '해석', label: '해석' },
    { key: '구문', label: '구문' },
    { key: '내용', label: '내용' },
    { key: '문제', label: '문제' },
  ];
  // 약점 유형 14종 (학원 igzam-tracker.js와 동일 체계)
  const WEAK_TYPES = [
    '빈칸추론', '주제·제목', '요지·주장', '함의추론', '문장삽입', '문장순서',
    '흐름무관문장', '어법', '어휘', '지칭추론', '내용일치·불일치', '연결사빈칸',
    '추론유형', '서술형'
  ];

  let student = null;
  let scope = null;
  let passages = [];
  const progressMap = {}; // scope_passage_id → progress row

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function $(id) { return document.getElementById(id); }

  function getStudent() {
    const raw = localStorage.getItem('pafa_student') || sessionStorage.getItem('pafa_student');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async function boot() {
    student = getStudent();
    if (!student || !student.student_id) { location.href = 'index.html'; return; }
    $('student-label').textContent = `${student.name || ''} 학생`;
    if (!student.school || !student.grade) {
      // 기존 세션은 school/grade가 없음 → 재로그인 안내 (auth.js 갱신분 적용 위해)
      $('trk-body').innerHTML = '<div class="status-banner">학교·학년 정보 갱신이 필요합니다. <a href="index.html" style="color:var(--accent);font-weight:700">다시 로그인</a> 후 이용해주세요.</div>';
      return;
    }
    try {
      const sc = await window.api.v1Get('/scope', { academy_code: student.academy_code, school: student.school, grade: student.grade });
      if (!sc.ok || !sc.scope) { $('trk-body').innerHTML = '<div class="status-banner">아직 등록된 시험범위가 없습니다. 학원에서 시험범위를 등록하면 표시됩니다.</div>'; return; }
      scope = sc.scope; passages = Array.isArray(sc.passages) ? sc.passages : [];
      const tr = await window.api.v1Get('/tracker', { student_id: student.student_id, scope_id: scope.id });
      (tr.progress || []).forEach(p => { progressMap[p.scope_passage_id] = normalizeProgress(p); });
      renderBanner();
      renderList();
    } catch (e) { $('trk-body').innerHTML = '<div class="status-banner" style="color:var(--danger)">불러오기 실패: ' + esc(e.message) + '</div>'; }
  }

  function normalizeProgress(p) {
    const parse = (v, d) => { if (v == null) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };
    return {
      scope_passage_id: p.scope_passage_id,
      sliders: parse(p.sliders, {}),
      wrong_counters: parse(p.wrong_counters, {}),
      done_types: parse(p.done_types, []),
      watched_reinforce: !!p.watched_reinforce,
      memo: p.memo || '',
    };
  }

  function avgPct(sliders) {
    const vals = SLIDERS.map(s => Number(sliders[s.key]) || 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / SLIDERS.length);
  }

  function overallPct() {
    if (!passages.length) return 0;
    const sum = passages.reduce((acc, p) => acc + avgPct((progressMap[p.id] || {}).sliders || {}), 0);
    return Math.round(sum / passages.length);
  }

  function ddayInfo() {
    if (!scope.exam_date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ex = new Date(scope.exam_date); ex.setHours(0, 0, 0, 0);
    const diff = Math.round((ex - today) / 86400000);
    return diff;
  }

  function personalMsg(pct, dday) {
    if (dday != null && dday < 0) return '시험이 끝났어요. 틀린 유형을 복습하며 다음을 준비하자!';
    if (dday != null && dday <= 3) {
      if (pct < 70) return '시험이 코앞이야! 완성도 낮은 지문부터 다시 보자. 약점 유형 집중!';
      return '거의 다 됐어! 약점 유형만 마지막으로 점검하면 1등급 간다.';
    }
    if (pct >= 90) return '훌륭해! 이대로 약점만 메우면 1등급 안정권이야.';
    if (pct >= 60) return '잘하고 있어. 완성도 낮은 지문을 끌어올리자.';
    return '아직 초반이야. 지문별로 하나씩 완성도를 채워보자!';
  }

  function renderBanner() {
    const pct = overallPct();
    const dday = ddayInfo();
    const ddayTxt = dday == null ? '' : (dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`);
    $('trk-banner-wrap').innerHTML = `
      <div class="trk-banner">
        <div class="trk-dday">${esc(scope.title || (student.school + ' ' + student.grade))}${ddayTxt ? ' · ' + ddayTxt : ''}</div>
        <div class="trk-msg">${esc(personalMsg(pct, dday))}</div>
        <div class="trk-overall"><span style="font-size:12px">전체 완성도</span><div class="bar"><div style="width:${pct}%"></div></div><span style="font-size:13px;font-weight:700;color:var(--gold3)">${pct}%</span></div>
      </div>`;
  }

  function pctColor(pct) { return pct >= 80 ? 'background:#d6f0e2;color:var(--success)' : pct >= 50 ? 'background:#fdf0d0;color:#a07b1d' : 'background:#fbe0e0;color:var(--danger)'; }

  function renderList() {
    const html = passages.map(p => {
      const prog = progressMap[p.id] || {};
      const pct = avgPct(prog.sliders || {});
      const meta = [p.category, p.textbook, p.unit, p.number].filter(Boolean).join(' · ');
      return `
        <div class="psg-card" id="card-${p.id}" onclick="trkToggle(${p.id})">
          <div class="psg-head">
            <div><span class="psg-no">${esc(p.number || p.passage_idx)}</span> <span style="font-size:12px;color:var(--muted)">지문</span><div class="psg-meta">${esc(meta || '-')}</div></div>
            <span class="psg-pct" style="${pctColor(pct)}">${pct}%</span>
          </div>
          <div class="psg-form" id="form-${p.id}"></div>
        </div>`;
    }).join('');
    $('trk-body').innerHTML = `<div class="subtitle-sm">지문 ${passages.length}개 · 지문을 눌러 공부 완성도를 평가하세요.</div>${html}`;
  }

  function renderForm(pid) {
    const p = passages.find(x => x.id === pid);
    const prog = progressMap[pid] || { sliders: {}, wrong_counters: {}, done_types: [], watched_reinforce: false, memo: '' };
    const preview = (p.passage_text || '').slice(0, 90);
    const sliders = SLIDERS.map(s => {
      const v = Number(prog.sliders[s.key]) || 0;
      return `<div class="sl-row"><label>${s.label}</label><input type="range" min="0" max="100" step="10" value="${v}" oninput="trkSl(${pid},'${s.key}',this.value)"><span class="val" id="slv-${pid}-${s.key}">${v}%</span></div>`;
    }).join('');
    const chips = WEAK_TYPES.map(t => {
      const c = Number((prog.wrong_counters || {})[t]) || 0;
      return `<div class="wk-chip ${c > 0 ? 'has' : ''}" id="wk-${pid}-${cssId(t)}"><span>${esc(t)}</span><button onclick="event.stopPropagation();trkWk(${pid},'${esc(t)}',-1)">−</button><span class="c" id="wkc-${pid}-${cssId(t)}">${c}</span><button onclick="event.stopPropagation();trkWk(${pid},'${esc(t)}',1)">+</button></div>`;
    }).join('');
    const done = (prog.done_types || []).includes('완료');
    return `
      <div onclick="event.stopPropagation()">
        ${preview ? `<div style="font-size:11px;color:var(--muted);background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px">${esc(preview)}…</div>` : ''}
        <div class="subtitle-sm">완성도 (어휘·해석·구문·내용·문제)</div>
        ${sliders}
        <div class="subtitle-sm">틀린 유형 (풀다가 틀린 만큼 +)</div>
        <div class="wk-grid">${chips}</div>
        <label class="trk-check"><input type="checkbox" id="done-${pid}" ${done ? 'checked' : ''}> 이 지문 공부 완료</label>
        <label class="trk-check"><input type="checkbox" id="reinf-${pid}" ${prog.watched_reinforce ? 'checked' : ''}> 시험 직전 보강 자료 봤어요</label>
        <textarea id="memo-${pid}" placeholder="메모 (선택)" style="width:100%;min-height:48px;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px">${esc(prog.memo || '')}</textarea>
        <div class="trk-actions"><button class="btn btn-primary" onclick="event.stopPropagation();trkSave(${pid})" id="save-${pid}">저장</button></div>
      </div>`;
  }

  function cssId(t) { return t.replace(/[^0-9a-zA-Z가-힣]/g, '_'); }

  // 임시 편집 상태 (저장 전)
  const draft = {};
  function ensureDraft(pid) {
    if (!draft[pid]) {
      const prog = progressMap[pid] || { sliders: {}, wrong_counters: {}, done_types: [], watched_reinforce: false, memo: '' };
      draft[pid] = { sliders: Object.assign({}, prog.sliders), wrong_counters: Object.assign({}, prog.wrong_counters) };
    }
    return draft[pid];
  }

  window.trkToggle = function (pid) {
    const form = $('form-' + pid);
    if (!form) return;
    const open = form.classList.contains('open');
    document.querySelectorAll('.psg-form.open').forEach(f => { f.classList.remove('open'); f.innerHTML = ''; });
    if (!open) { form.innerHTML = renderForm(pid); form.classList.add('open'); }
  };

  window.trkSl = function (pid, key, val) {
    ensureDraft(pid).sliders[key] = Number(val);
    const lab = $('slv-' + pid + '-' + key); if (lab) lab.textContent = val + '%';
  };

  window.trkWk = function (pid, type, delta) {
    const d = ensureDraft(pid);
    const cur = Number(d.wrong_counters[type]) || 0;
    const next = Math.max(0, cur + delta);
    d.wrong_counters[type] = next;
    const cell = $('wkc-' + pid + '-' + cssId(type)); if (cell) cell.textContent = next;
    const chip = $('wk-' + pid + '-' + cssId(type)); if (chip) chip.classList.toggle('has', next > 0);
  };

  window.trkSave = async function (pid) {
    const d = ensureDraft(pid);
    const btn = $('save-' + pid);
    // 현재 폼의 슬라이더/체크 최종 수집 (draft + DOM)
    const sliders = {};
    SLIDERS.forEach(s => { sliders[s.key] = Number((d.sliders || {})[s.key]) || 0; });
    const done = $('done-' + pid) && $('done-' + pid).checked;
    const payload = {
      student_id: student.student_id,
      scope_passage_id: pid,
      sliders,
      wrong_counters: d.wrong_counters || {},
      done_types: done ? ['완료'] : [],
      watched_reinforce: $('reinf-' + pid) ? $('reinf-' + pid).checked : false,
      memo: $('memo-' + pid) ? $('memo-' + pid).value : '',
    };
    if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
    try {
      const r = await window.api.v1Post('/tracker', payload);
      if (!r.ok) throw new Error(r.error || '저장 실패');
      progressMap[pid] = { scope_passage_id: pid, sliders, wrong_counters: payload.wrong_counters, done_types: payload.done_types, watched_reinforce: payload.watched_reinforce, memo: payload.memo };
      delete draft[pid];
      // 카드 % 배지 갱신 + 폼 닫기 + 배너 재계산
      const form = $('form-' + pid); if (form) { form.classList.remove('open'); form.innerHTML = ''; }
      const pct = avgPct(sliders);
      const card = $('card-' + pid); const badge = card && card.querySelector('.psg-pct');
      if (badge) { badge.textContent = pct + '%'; badge.setAttribute('style', pctColor(pct)); }
      renderBanner();
    } catch (e) { alert('저장 실패: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '저장'; } }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
