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

      if (type === '객관식') {
        const checked = element.querySelector('input[type="radio"]:checked');
        answers[questionNo] = checked ? checked.value : '';
      } else {
        const textarea = element.querySelector('textarea');
        answers[questionNo] = textarea ? textarea.value.trim() : '';
      }
    });

    localStorage.setItem('pafa_answers', JSON.stringify(answers));
    updateAnswerSheet();
  }

  function loadAnswers() {
    const answers = getStoredAnswers();

    document.querySelectorAll('[data-question-no]').forEach((element) => {
      const questionNo = String(element.dataset.questionNo);
      const type = element.dataset.questionType;
      const value = answers[questionNo] || '';

      if (type === '객관식') {
        const target = element.querySelector(`input[type="radio"][value="${CSS.escape(value)}"]`);
        if (target) {
          target.checked = true;
        }
      } else {
        const textarea = element.querySelector('textarea');
        if (textarea) {
          textarea.value = value;
        }
      }
    });

    updateAnswerSheet();
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

  function renderPassageText(text) {
    return text
      .replace(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])\s*\[([^\]]+)\]/g, '$1<span class="ref-word">$2</span>')
      .replace(/_{3,}/g, '<span class="blank"></span>')
      .replace(/\n/g, '<br>');
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

    return options
      .map(
        (option, index) => `
          <label class="choice-item">
            <input type="radio" name="question-${question.question_no}" value="${String(index + 1)}">
            <span>${option}</span>
          </label>
        `
      )
      .join('');
  }

  function getSubjectivePlaceholder(question) {
    if (question.qtype === '지칭추론') return '예) 1. they  2. it  3. the machine  4. its  5. its';
    if (question.qtype === '어법') return '예) 2. divert  3. become  5. remained';
    if (question.qtype === '어휘') return '예) 4. expense→cost  7. restricts→expands';
    return '답을 입력하세요.';
  }

  function isSubjectiveOverride(question) {
    // 어휘 유형이지만 "고치시오" 지시문이 있으면 주관식으로 처리
    if (question.qtype === '어휘') {
      const title = question.title || question.question || '';
      if (title.includes('고치시오')) return true;
    }
    return false;
  }

  function renderQuestions(questions) {
    const questionContainer = document.getElementById('question-container');
    const answerSheet = document.getElementById('answer-sheet');

    questionContainer.innerHTML = questions
      .map(
        (question) => {
          const forceSubjective = isSubjectiveOverride(question);
          const renderType = (question.type === '객관식' && !forceSubjective) ? '객관식' : '주관식';
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
            ${question.given ? `<div class="given-box">${renderPassageText(question.given)}</div>` : ''}
            ${question.passage ? `<div class="passage-box">${renderPassageText(question.passage)}</div>` : ''}
            ${question.condition ? `<div class="condition-box">${renderPassageText(question.condition)}</div>` : ''}
            ${question.summary ? `<div class="summary-box">${renderPassageText(question.summary)}</div>` : ''}
            ${
              renderType === '객관식'
                ? `<div class="choice-list">${buildChoices(question)}</div>`
                : `<div class="input-group"><label for="answer-${question.question_no}">답안 입력</label><textarea id="answer-${question.question_no}" placeholder="${getSubjectivePlaceholder(question)}"></textarea></div>`
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
          <button type="button" class="exam-card" data-exam-id="${exam.id}" ${exam.completed_attempt_id ? 'disabled' : ''}>
            <h3>${parseExamTitle(exam.title)}</h3>
            <p class="muted">${exam.completed_attempt_id ? '응시 완료' : '응시 가능'}</p>
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
    let remaining = durationSec;
    let expired = false;

    const timerDisplaySub = document.getElementById('timer-display-sub');
    function render() {
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      const text = `${minutes}:${seconds}`;
      timerDisplay.textContent = text;
      timerDisplay.classList.toggle('warning', remaining <= 600);
      if (timerDisplaySub) {
        timerDisplaySub.textContent = text;
        timerDisplaySub.style.color = remaining <= 600 ? '#e53e3e' : 'var(--navy)';
      }
    }

    render();

    const intervalId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        render();
        if (!expired) {
          expired = true;
          window.clearInterval(intervalId);
          onExpire();
        }
        return;
      }
      render();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }

  window.examApp = {
    renderExamList,
    renderQuestions,
    startTimer,
    saveAnswers,
    loadAnswers,
  };
})();
