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
    const abPat = /^\([A-Z]\)\s*.+?\s*(?:···|…|\.\.\.)\s*\([A-Z]\)\s*.+$/;
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
        const m = String(option).match(/^\(?[①②③④⑤\d]\)?\s*\(([A-Z])\)\s*(.+?)\s*(?:···|…|\.\.\.)\s*\(([A-Z])\)\s*(.+)$/);
        const circled = ['①','②','③','④','⑤'][index] || val;
        const aText = m ? m[2].trim() : option;
        const bText = m ? m[4].trim() : '';
        html += `<tr>
          <td><label class="ab-radio-label"><input type="radio" name="question-${question.question_no}" value="${val}"><span class="ab-num">${circled}</span></label></td>
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

  function renderQuestions(questions) {
    const questionContainer = document.getElementById('question-container');
    const answerSheet = document.getElementById('answer-sheet');

    questionContainer.innerHTML = questions
      .map(
        (question) => `
          <section class="question-card" id="question-${question.question_no}" data-question-no="${question.question_no}" data-question-type="${question.type}">
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
            ${question.summary ? `<div class="summary-box">${renderPassageText(question.summary)}</div>` : ''}
            ${
              question.type === '객관식'
                ? `<div class="choice-list">${buildChoices(question)}</div>`
                : `<div class="input-group"><label for="answer-${question.question_no}">답안 입력</label><textarea id="answer-${question.question_no}" placeholder="${question.qtype === '지칭추론' ? '예) 1. they  2. it  3. the machine  4. its  5. its' : question.qtype === '어법' ? '예) 2. divert  3. become  5. remained' : '답을 입력하세요.'}"></textarea></div>`
            }
          </section>
        `
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
            <h3>${exam.title}</h3>
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

    function render() {
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
      timerDisplay.classList.toggle('warning', remaining <= 600);
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
