(function () {
  function getStoredAnswers() {
    try {
      return JSON.parse(localStorage.getItem('pafa_answers') || sessionStorage.getItem('pafa_answers') || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveAnswers() {
    const answers = {};

    document.querySelectorAll('[data-question-no]').forEach((element) => {
      const questionNo = String(element.dataset.questionNo);
      const type = element.dataset.questionType;

      if (type === 'multi_select') {
        const selected = [...element.querySelectorAll('.ms-btn.active')].map(b => b.dataset.val).join('');
        answers[questionNo] = selected;
      } else if (type === '객관식') {
        const activeBtn = element.querySelector('.single-select-group .ms-btn.active');
        if (activeBtn) {
          answers[questionNo] = activeBtn.dataset.val;
        } else {
          const checked = element.querySelector('input[type="radio"]:checked');
          answers[questionNo] = checked ? checked.value : '';
        }
      } else {
        const structAnswer = collectStructuredAnswer(element);
        if (structAnswer !== null) {
          answers[questionNo] = structAnswer;
        } else {
          const textarea = element.querySelector('textarea');
          answers[questionNo] = textarea ? textarea.value.trim() : '';
        }
      }
    });

    localStorage.setItem('pafa_answers', JSON.stringify(answers));
    updateAnswerSheet();
    updateOMR();
  }

  function loadAnswers() {
    const answers = getStoredAnswers();

    document.querySelectorAll('[data-question-no]').forEach((element) => {
      const questionNo = String(element.dataset.questionNo);
      const type = element.dataset.questionType;
      const value = answers[questionNo] || '';

      if (type === 'multi_select') {
        element.querySelectorAll('.ms-btn').forEach(b => {
          b.classList.toggle('active', value.includes(b.dataset.val));
        });
      } else if (type === '객관식') {
        const group = element.querySelector('.single-select-group');
        if (group) {
          group.querySelectorAll('.ms-btn').forEach(b => b.classList.toggle('active', b.dataset.val === value));
        } else {
          const target = element.querySelector(`input[type="radio"][value="${CSS.escape(value)}"]`);
          if (target) target.checked = true;
        }
      } else if (element.querySelector('.structured-input')) {
        restoreStructuredAnswer(element, value);
      } else {
        const textarea = element.querySelector('textarea');
        if (textarea) {
          textarea.value = value;
        }
      }
    });

    updateAnswerSheet();
    updateOMR();
  }

  function updateAnswerSheet() {
    const answers = getStoredAnswers();
    document.querySelectorAll('.answer-sheet button[data-target-question]').forEach((button) => {
      const questionNo = button.dataset.targetQuestion;
      button.classList.toggle('answered', Boolean(answers[questionNo]));
    });
  }

  function renderQuestionTitle(text) {
    if (!text) return text;
    // 한국어 부정어
    text = text.replace(/(않[는은]\s*것은|않[는은]\s*것을|아닌\s*것은|아닌\s*것을|없는\s*것은|없는\s*것을|틀린\s*것은|틀린\s*것을)/g, '<u>$1</u>');
    // 영어 부정/핵심어 (단어 경계 기준)
    text = text.replace(/\b(NOT|EXCEPT|inappropriate|incorrect|wrong|false|least|unlikely|unsuitable|improper)\b/g, '<u>$1</u>');
    return text;
  }

  function renderPassageText(text, qtype) {
    const _blankQtypes = ['빈칸추론','객관식요약빈칸','연결사빈칸','요약빈칸'];
    let result = text
      .replace(/\[BLANK\]/g, '<span class="blank"></span>')
      .replace(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])\s*\[([^\]]+)\]/g, '$1<span class="ref-word">$2</span>')
      .replace(/_{3,}/g, '<span class="blank"></span>');
    if (_blankQtypes.includes(qtype)) {
      result = result.replace(/\n{2,}/g, '\n').replace(/\n/g, '<br>');
    } else {
      result = result.replace(/\n/g, '<br>');
    }
    return result;
  }

  // 어법/어휘 단일선택: 지문 속 ①~⑩ 번호를 가로 버튼으로 렌더링
  function buildNumberedSingleSelect(question) {
    const CIRCLES = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
    const fullText = (question.title || '') + (question.passage || '') + (question.given || '');
    let maxIdx = 4;
    CIRCLES.forEach((c, i) => { if (fullText.includes(c)) maxIdx = i; });
    const nums = CIRCLES.slice(0, maxIdx + 1);
    const qno = question.question_no;
    return `<div class="single-select-group" data-qno="${qno}">
      ${nums.map((c, i) => `<button type="button" class="ms-btn" data-val="${String(i + 1)}" onclick="singleSelect(this,'${qno}')">${c}</button>`).join('')}
    </div>`;
  }

  // 어법/어휘 복수: 번호 체크박스 UI
  function buildMultiSelect(question) {
    const CIRCLES = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
    // 지문+제목에서 최대 원형숫자 감지
    const fullText = (question.title || '') + (question.passage || '') + (question.given || '');
    let maxIdx = 4; // 기본 ⑤까지
    CIRCLES.forEach((c, i) => { if (fullText.includes(c)) maxIdx = i; });
    const nums = CIRCLES.slice(0, maxIdx + 1);
    return `<div class="multi-select-group" data-qno="${question.question_no}">
      <div style="font-size:11px;color:var(--muted,#888);margin-bottom:6px">틀린 번호를 모두 선택하세요</div>
      <div class="multi-select-btns">
        ${nums.map(c => `<button type="button" class="ms-btn" data-val="${c}" onclick="toggleMultiSelect(this,'${question.question_no}')">${c}</button>`).join('')}
      </div>
    </div>`;
  }

  function buildChoices(question) {
    const options = Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : ['1', '2', '3', '4', '5'];

    // (A) ... ··· (B) ... 패턴 감지 → 표 형식
    // 앞에 ①② 붙어 있을 수도 있음
    const abPat = /^[①②③④⑤]?\s*\([A-Z]\)\s*.+?\s*(?:···|…|\.\.\.)\s*\([A-Z]\)\s*.+$/;
    const isABPair = options.every(o => abPat.test(String(o).trim()));

    if (isABPair) {
      const header = (() => {
        const m = String(options[0]).match(/\(([A-Z])\).*?(?:···|…|\.\.\.)\s*\(([A-Z])\)/);
        return m ? [m[1], m[2]] : ['A', 'B'];
      })();
      let html = `<table class="ab-choice-table">
        <thead><tr><th></th><th>(${header[0]})</th><th>(${header[1]})</th></tr></thead><tbody>`;
      options.forEach((option, index) => {
        const val = String(index + 1);
        // 선두 ①② 제거 후 파싱
        const clean = String(option).replace(/^[①②③④⑤]\s*/, '').trim();
        const m = clean.match(/^\(([A-Z])\)\s*(.+?)\s*(?:···|…|\.\.\.)\s*\(([A-Z])\)\s*(.+)$/);
        const aText = m ? m[2].trim() : clean;
        const bText = m ? m[4].trim() : '';
        html += `<tr onclick="this.querySelector('input[type=radio]').click()">
          <td><input type="radio" name="question-${question.question_no}" value="${val}" onclick="event.stopPropagation()"></td>
          <td>${aText}</td>
          <td>${bText}</td>
        </tr>`;
      });
      html += '</tbody></table>';
      return html;
    }

    const CIRCLES = ['①','②','③','④','⑤'];
    return options
      .map(
        (option, index) => `
          <label class="choice-item">
            <input type="radio" name="question-${question.question_no}" value="${String(index + 1)}">
            <span><span class="choice-no">${CIRCLES[index] || (index + 1)}</span>${String(option).replace(/^[①②③④⑤]\s*/, '').trim()}</span>
          </label>
        `
      )
      .join('');
  }

  function getSubjectivePlaceholder(question) {
    return '답을 입력하세요.';
  }

  function isSubjectiveOverride(question) {
    return false;
  }

  // ── 구조화 입력: 어법/어휘/지칭추론 ──
  const CIRCLES = ['','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
  const STRUCT_QTYPES = new Set(['어법', '어휘']);
  const SUMMARY_QTYPES = ['요약 빈칸', '요약빈칸', '글의 요약 빈칸'];
  const AB_QTYPES = ['한영 영작', '한영영작'];

  function detectCircledNumbers(question) {
    const allText = [question.title, question.passage, question.given, question.condition]
      .filter(Boolean).join(' ');
    const found = [];
    for (let i = 1; i <= 10; i++) {
      if (allText.includes(CIRCLES[i])) found.push(i);
    }
    return found.length > 0 ? found : [1, 2, 3, 4, 5];
  }

  function isStructuredType(question) {
    if (question.type !== '주관식' && !isSubjectiveOverride(question)) return false;
    if (STRUCT_QTYPES.has(question.qtype)) return true;
    if (SUMMARY_QTYPES.some(t => (question.qtype || '').includes(t))) return true;
    if (AB_QTYPES.some(t => (question.qtype || '').includes(t))) return true;
    return false;
  }

  function buildStructuredInput(question) {
    const nums = detectCircledNumbers(question);
    const qno = question.question_no;

    // 요약빈칸: (A) (B) 두 칸
    if (SUMMARY_QTYPES.some(t => (question.qtype || '').includes(t))) {
      return `<div class="structured-input" data-input-type="summary" data-qno="${qno}">
        <div class="structured-label">빈칸에 들어갈 말을 각각 쓰세요</div>
        <div class="structured-row">
          <span class="struct-num" style="min-width:30px">(A)</span>
          <input type="text" class="struct-text" data-slot="A" placeholder="(A)에 들어갈 말">
        </div>
        <div class="structured-row">
          <span class="struct-num" style="min-width:30px">(B)</span>
          <input type="text" class="struct-text" data-slot="B" placeholder="(B)에 들어갈 말">
        </div>
      </div>`;
    }

    // 한영 영작: (A) (B) 두 문장
    if (AB_QTYPES.some(t => (question.qtype || '').includes(t))) {
      return `<div class="structured-input" data-input-type="summary" data-qno="${qno}">
        <div class="structured-label">주어진 문장을 영작하세요</div>
        <div class="structured-row" style="flex-direction:column;align-items:stretch;gap:4px">
          <span class="struct-num" style="min-width:30px">(A)</span>
          <textarea class="struct-textarea" data-slot="A" placeholder="(A) 영작" rows="2" style="width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:14px;resize:vertical;font-family:inherit"></textarea>
        </div>
        <div class="structured-row" style="flex-direction:column;align-items:stretch;gap:4px">
          <span class="struct-num" style="min-width:30px">(B)</span>
          <textarea class="struct-textarea" data-slot="B" placeholder="(B) 영작" rows="2" style="width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:14px;resize:vertical;font-family:inherit"></textarea>
        </div>
      </div>`;
    }

    if (question.qtype === '지칭추론') {
      return `<div class="structured-input" data-input-type="reference" data-qno="${qno}">
        <div class="structured-label">각 번호가 가리키는 대상을 쓰세요</div>
        ${nums.map(n => `<div class="structured-row">
          <span class="struct-num">${CIRCLES[n]}</span>
          <input type="text" class="struct-text" data-num="${n}" placeholder="가리키는 대상">
        </div>`).join('')}
      </div>`;
    }

    // 고치시오 + EXPLAIN에 수정어가 있는 경우만 수정어 입력칸 표시
    // (서버에서 correct_answer가 JSON이면 수정어 필요)
    const title = question.title || '';
    const needsCorrection = title.includes('고치시오');
    const inputType = needsCorrection ? 'correct' : 'select';
    const label = question.qtype === '어법'
      ? (needsCorrection ? '틀린 번호를 고르고 바르게 고치세요' : '틀린 번호를 모두 고르세요')
      : (needsCorrection ? '부적절한 번호를 고르고 바르게 고치세요' : '부적절한 번호를 모두 고르세요');

    return `<div class="structured-input" data-input-type="${inputType}" data-qno="${qno}">
      <div class="structured-label">${label}</div>
      ${nums.map(n => `<div class="structured-row" data-num="${n}" onclick="
        var row=this;var si=row.closest('.structured-input');
        var btn=row.querySelector('.struct-num-btn');
        var selected=btn.classList.toggle('selected');
        ${needsCorrection ? `var inp=row.querySelector('.struct-text');inp.disabled=!selected;if(!selected)inp.value='';` : ''}
        if(typeof saveAnswers==='function')saveAnswers();
      " style="cursor:pointer">
        <span class="struct-num-btn">${CIRCLES[n]}</span>
        ${needsCorrection ? `<input type="text" class="struct-text" data-num="${n}" placeholder="수정어" disabled onclick="event.stopPropagation()">` : ''}
      </div>`).join('')}
    </div>`;
  }

  function collectStructuredAnswer(element) {
    const si = element.querySelector('.structured-input');
    if (!si) return null;
    const inputType = si.dataset.inputType;

    if (inputType === 'summary') {
      const parts = [];
      // text inputs (요약빈칸)
      si.querySelectorAll('.struct-text[data-slot]').forEach(input => {
        const val = input.value.trim();
        if (val) parts.push(`(${input.dataset.slot}) ${val}`);
      });
      // textareas (한영영작)
      si.querySelectorAll('.struct-textarea[data-slot]').forEach(ta => {
        const val = ta.value.trim();
        if (val) parts.push(`(${ta.dataset.slot}) ${val}`);
      });
      return parts.join(' / ');
    }

    if (inputType === 'reference') {
      const parts = [];
      si.querySelectorAll('.struct-text').forEach(input => {
        const val = input.value.trim();
        if (val) parts.push(`${input.dataset.num}. ${val}`);
      });
      return parts.join('  ');
    }
    if (inputType === 'correct') {
      const parts = [];
      si.querySelectorAll('.struct-num-btn.selected').forEach(btn => {
        const num = btn.closest('.structured-row').dataset.num;
        const textInput = si.querySelector(`.struct-text[data-num="${num}"]`);
        const val = textInput ? textInput.value.trim() : '';
        if (val) parts.push(`${num}. ${val}`);
      });
      return parts.join('  ');
    }
    // select only
    const checked = [];
    si.querySelectorAll('.struct-num-btn.selected').forEach(btn => {
      checked.push(CIRCLES[parseInt(btn.closest('.structured-row').dataset.num)]);
    });
    return checked.join('');
  }

  function restoreStructuredAnswer(element, value) {
    const si = element.querySelector('.structured-input');
    if (!si || !value) return;
    const inputType = si.dataset.inputType;

    if (inputType === 'summary') {
      // parse "(A) xxx / (B) yyy"
      const mA = value.match(/\(A\)\s*([^/]*)/i);
      const mB = value.match(/\(B\)\s*(.*)/i);
      if (mA) {
        const inputA = si.querySelector('.struct-text[data-slot="A"]') || si.querySelector('.struct-textarea[data-slot="A"]');
        if (inputA) inputA.value = mA[1].trim();
      }
      if (mB) {
        const inputB = si.querySelector('.struct-text[data-slot="B"]') || si.querySelector('.struct-textarea[data-slot="B"]');
        if (inputB) inputB.value = mB[1].trim();
      }
      return;
    }

    if (inputType === 'reference' || inputType === 'correct') {
      // parse "2. wrote  6. argue" format
      const pairs = value.match(/(\d+)\.\s*([^0-9]+?)(?=\s+\d+\.|$)/g) || [];
      pairs.forEach(pair => {
        const m = pair.match(/^(\d+)\.\s*(.+)$/);
        if (!m) return;
        const num = m[1], val = m[2].trim();
        if (inputType === 'correct') {
          const row = si.querySelector(`.structured-row[data-num="${num}"]`);
          const btn = row ? row.querySelector('.struct-num-btn') : null;
          if (btn) btn.classList.add('selected');
          const ti = si.querySelector(`.struct-text[data-num="${num}"]`);
          if (ti) { ti.disabled = false; ti.value = val; }
        } else {
          const ti = si.querySelector(`.struct-text[data-num="${num}"]`);
          if (ti) ti.value = val;
        }
      });
    } else {
      // select: "①③⑤"
      for (let i = 1; i <= 10; i++) {
        if (value.includes(CIRCLES[i])) {
          const row = si.querySelector(`.structured-row[data-num="${i}"]`);
          const btn = row ? row.querySelector('.struct-num-btn') : null;
          if (btn) btn.classList.add('selected');
        }
      }
    }
  }

  function setupStructuredListeners(container) {
    // correct type: 수정어 입력칸 이벤트
    container.querySelectorAll('.structured-input[data-input-type="correct"]').forEach(si => {
      si.querySelectorAll('.struct-text').forEach(input => {
        input.addEventListener('input', saveAnswers);
      });
    });
    // reference type text inputs
    container.querySelectorAll('.structured-input[data-input-type="reference"]').forEach(si => {
      si.querySelectorAll('.struct-text').forEach(input => {
        input.addEventListener('input', saveAnswers);
      });
    });
    // summary type (요약빈칸 / 한영영작) text inputs + textareas
    container.querySelectorAll('.structured-input[data-input-type="summary"]').forEach(si => {
      si.querySelectorAll('.struct-text, .struct-textarea').forEach(input => {
        input.addEventListener('input', saveAnswers);
      });
    });
  }

  function renderQuestions(questions) {
    const questionContainer = document.getElementById('question-container');
    const answerSheet = document.getElementById('answer-sheet');

    questionContainer.innerHTML = questions
      .map(
        (question) => {
          const forceSubjective = isSubjectiveOverride(question);
          const MULTI_QTYPES = new Set(['어법', '어휘', '어법복수']);
          const forceObj = question.qtype === '지칭추론';
          const renderType = (question.type === 'multi_select' || MULTI_QTYPES.has(question.qtype)) ? 'multi_select' : (((question.type === '객관식' || forceObj) && !forceSubjective) ? '객관식' : '주관식');
          return `
          <section class="question-card" id="question-${question.question_no}" data-question-no="${question.question_no}" data-question-type="${renderType}">
            <div class="question-header">
              <div class="question-badge">${question.question_no}</div>
              <div class="question-meta">
                <div class="question-text">${renderQuestionTitle(question.title || question.question || `문항 ${question.question_no}`)}</div>
                <div class="question-score">
                  ${question.qtype || question.type} · ${question.score || 0}점
                  ${question.source ? `<span class="source-inline">[출처] ${question.source}</span>` : ''}
                </div>
              </div>
            </div>
            ${question.given ? `<div class="given-box">${renderPassageText(question.given, question.qtype||question.type)}</div>` : ''}
            ${question.passage ? `<div class="passage-box">${renderPassageText(question.passage, question.qtype||question.type)}</div>` : ''}
            ${question.summary ? `<div class="summary-box">${renderPassageText(question.summary)}</div>` : ''}
            ${question.condition ? `<div class="condition-box">${renderPassageText(question.condition)}</div>` : ''}
            ${
              renderType === 'multi_select'
                ? buildMultiSelect(question)
                : renderType === '객관식'
                ? `<div class="choice-list">${['어법', '어휘'].includes(question.qtype) ? buildNumberedSingleSelect(question) : buildChoices(question)}</div>`
                : (isStructuredType(question)
                  ? buildStructuredInput(question)
                  : `<div class="input-group"><label for="answer-${question.question_no}">답안 입력</label><textarea id="answer-${question.question_no}" placeholder="${getSubjectivePlaceholder(question)}"></textarea></div>`)
            }
          </section>
        `;
        }
      )
      .join('');

    answerSheet.innerHTML = questions
      .map(
        (question) => `
          <button type="button" data-target-question="${question.question_no}">${question.question_no}번</button>
        `
      )
      .join('');

    answerSheet.querySelectorAll('button[data-target-question]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(`question-${button.dataset.targetQuestion}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    questionContainer.querySelectorAll('input[type="radio"], textarea').forEach((field) => {
      field.addEventListener('change', saveAnswers);
      field.addEventListener('input', saveAnswers);
    });

    setupStructuredListeners(questionContainer);
    renderOMR(questions);
    loadAnswers();
  }

  function parseExamTitle(raw) {
    if (!raw) return raw;
    return raw
      .replace(/\.json$/i, '')
      .replace(/^패파리그_/, '')
      .replace(/_(최고난도|심화|고난도|기본)/g, '')
      .replace(/_[A-Z0-9]_동형등록$/i, '')
      .replace(/_동형등록$/i, '')
      .replace(/고([123])/, '$1학년')
      .replace(/_/g, ' ')
      .trim();
  }

  function renderExamList(exams, onSelect) {
    const container = document.getElementById('exam-list');

    if (!exams.length) {
      container.innerHTML = '<div class="empty-state">배정된 시험이 없습니다.</div>';
      return;
    }

    container.innerHTML = exams
      .map(
        (exam) => `
          <button type="button" class="exam-card" data-exam-id="${exam.id}" data-attempt-id="${exam.completed_attempt_id || ''}">
            <h3>${parseExamTitle(exam.title)}</h3>
            <p class="muted">${exam.completed_attempt_id ? '응시 완료 — 결과 보기' : '응시 가능'}</p>
          </button>
        `
      )
      .join('');

    container.querySelectorAll('[data-exam-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const exam = exams.find((item) => String(item.id) === button.dataset.examId);
        if (exam) {
          onSelect(exam);
        }
      });
    });
  }

  function startTimer(durationSec, onExpire) {
    const timerDisplay = document.getElementById('timer-display');
    const timerDisplaySub = document.getElementById('timer-display-sub');
    const endTime = Date.now() + durationSec * 1000;
    let expired = false;

    function render() {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      const text = `${minutes}:${seconds}`;
      timerDisplay.textContent = text;
      timerDisplay.classList.toggle('warning', remaining <= 600);
      if (timerDisplaySub) {
        timerDisplaySub.textContent = text;
        timerDisplaySub.style.color = remaining <= 600 ? '#e53e3e' : 'var(--navy)';
      }
      if (remaining <= 0 && !expired) {
        expired = true;
        window.clearInterval(intervalId);
        onExpire();
      }
    }

    render();
    const intervalId = window.setInterval(render, 1000);

    return () => window.clearInterval(intervalId);
  }

  const ALL_CIRCLES_OMR = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

  function renderOMR(questions) {
    const omrCard = document.getElementById('omr-card');
    const omrGrid = document.getElementById('omr-grid');
    if (!omrCard || !omrGrid) return;
    omrCard.style.display = '';

    const OBJ_CIRCLES_5  = ['①','②','③','④','⑤'];
    const OBJ_CIRCLES_10 = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

    omrGrid.innerHTML = questions.map(q => {
      const qno = q.question_no;
      const forceSubj = isSubjectiveOverride(q);
      const forceObjOMR = !forceSubj && ['어법', '어휘'].includes(q.qtype);
      const type = q.type === 'multi_select' ? 'multi_select'
        : (((q.type === '객관식' || forceObjOMR) && !forceSubj) ? '객관식' : '주관식');

      if (type === '객관식') {
        const circles = ['어법', '어휘'].includes(q.qtype) ? OBJ_CIRCLES_10 : OBJ_CIRCLES_5;
        return `<div class="omr-row" data-omr-qno="${qno}" data-omr-type="객관식">
          <span class="omr-qno">${qno}</span>
          <div class="omr-choices">
            ${circles.map((c, i) => `<button type="button" class="omr-btn" data-val="${i+1}" onclick="omrSelect(this,'${qno}','${i+1}')">${c}</button>`).join('')}
          </div>
        </div>`;
      }

      if (type === 'multi_select') {
        const fullText = (q.title||'')+(q.passage||'')+(q.given||'');
        let maxIdx = 4;
        ALL_CIRCLES_OMR.forEach((c, i) => { if (fullText.includes(c)) maxIdx = i; });
        const circles = ALL_CIRCLES_OMR.slice(0, maxIdx + 1);
        return `<div class="omr-row" data-omr-qno="${qno}" data-omr-type="multi_select">
          <span class="omr-qno">${qno}</span>
          <div class="omr-choices">
            ${circles.map(c => `<button type="button" class="omr-btn" data-val="${c}" onclick="omrToggleMulti(this,'${qno}','${c}')">${c}</button>`).join('')}
          </div>
        </div>`;
      }

      // 주관식: 구조화 입력은 읽기전용 힌트, 단순 textarea는 직접 입력
      const structured = isStructuredType(q);
      return `<div class="omr-row" data-omr-qno="${qno}" data-omr-type="주관식">
        <span class="omr-qno">${qno}</span>
        ${structured
          ? `<span class="omr-subj-hint" onclick="document.getElementById('question-${qno}').scrollIntoView({behavior:'smooth',block:'start'})">—</span>`
          : `<textarea class="omr-text" placeholder="답 입력" oninput="omrTextInput(this,'${qno}')"></textarea>
             <button type="button" class="omr-clear-btn" onclick="omrClear('${qno}')" title="지우기">×</button>`
        }
      </div>`;
    }).join('');
  }

  function updateOMR() {
    const answers = getStoredAnswers();
    document.querySelectorAll('.omr-row').forEach(row => {
      const qno = row.dataset.omrQno;
      const type = row.dataset.omrType;
      const val = answers[qno] || '';

      if (type === '객관식') {
        row.querySelectorAll('.omr-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === val);
        });
      } else if (type === 'multi_select') {
        row.querySelectorAll('.omr-btn').forEach(b => {
          b.classList.toggle('active', val.includes(b.dataset.val));
        });
      } else {
        const inp = row.querySelector('.omr-text');
        if (inp && inp !== document.activeElement) inp.value = val;
        const hint = row.querySelector('.omr-subj-hint');
        if (hint) hint.textContent = val || '—';
      }
    });
  }

  function omrSelect(btn, qno, val) {
    // OMR → 라디오 동기화
    const radio = document.querySelector(`input[type="radio"][name="question-${qno}"][value="${val}"]`);
    if (radio) { radio.checked = true; }
    saveAnswers();
  }

  function omrToggleMulti(btn, qno, val) {
    btn.classList.toggle('active');
    // OMR → ms-btn 동기화
    const questionEl = document.querySelector(`[data-question-no="${qno}"]`);
    if (questionEl) {
      const msBtn = [...questionEl.querySelectorAll('.ms-btn')].find(b => b.dataset.val === val);
      if (msBtn) msBtn.classList.toggle('active', btn.classList.contains('active'));
    }
    saveAnswers();
  }

  function omrTextInput(input, qno) {
    // OMR → textarea 동기화
    const questionEl = document.querySelector(`[data-question-no="${qno}"]`);
    if (questionEl) {
      const ta = questionEl.querySelector('textarea');
      if (ta) ta.value = input.value;
    }
    saveAnswers();
  }

  function omrClear(qno) {
    // OMR 텍스트 지우기
    const row = document.querySelector(`.omr-row[data-omr-qno="${qno}"]`);
    if (row) {
      const inp = row.querySelector('.omr-text');
      if (inp) inp.value = '';
    }
    // 본문 textarea 동기화
    const questionEl = document.querySelector(`[data-question-no="${qno}"]`);
    if (questionEl) {
      const ta = questionEl.querySelector('textarea');
      if (ta) ta.value = '';
    }
    saveAnswers();
  }

  function toggleOMRCard() {
    const grid = document.getElementById('omr-grid');
    const btn = document.getElementById('omr-toggle-btn');
    if (!grid || !btn) return;
    const collapsed = grid.style.display === 'none';
    grid.style.display = collapsed ? '' : 'none';
    btn.textContent = collapsed ? '접기 ▲' : '펼치기 ▼';
  }

  window.singleSelect = singleSelect;
  window.omrSelect = omrSelect;
  window.omrToggleMulti = omrToggleMulti;
  window.omrTextInput = omrTextInput;
  window.omrClear = omrClear;
  window.toggleOMRCard = toggleOMRCard;

  function singleSelect(btn, qno) {
    const group = btn.closest('.single-select-group');
    if (group) group.querySelectorAll('.ms-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // OMR 동기화
    const omrRow = document.querySelector(`.omr-row[data-omr-qno="${qno}"]`);
    if (omrRow) {
      omrRow.querySelectorAll('.omr-btn').forEach(b => b.classList.toggle('active', b.dataset.val === btn.dataset.val));
    }
    saveAnswers();
  }

  function toggleMultiSelect(btn, qno) {
    btn.classList.toggle('active');
    saveAnswers();
  }

  window.toggleMultiSelect = toggleMultiSelect;

  window.examApp = {
    renderExamList,
    renderQuestions,
    startTimer,
    saveAnswers,
    loadAnswers,
    collectStructuredAnswer,
  };
})();
