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

  function buildChoices(question) {
    const options = Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : ['1', '2', '3', '4', '5'];

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
                <div class="question-text">${question.title || question.question || `문항 ${question.question_no}`}</div>
                <div class="question-score">${question.type} · ${question.score || 0}점</div>
              </div>
            </div>
            ${
              question.type === '객관식'
                ? `<div class="choice-list">${buildChoices(question)}</div>`
                : `<div class="input-group"><label for="answer-${question.question_no}">답안 입력</label><textarea id="answer-${question.question_no}" placeholder="답을 입력하세요."></textarea></div>`
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
          <button type="button" class="exam-card" data-exam-id="${exam.id}">
            <h3>${exam.title}</h3>
            <p class="muted">문항 수 ${exam.questions.length}개</p>
          </button>
        `
      )
      .join('');

    container.querySelectorAll('[data-exam-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const exam = exams.find((item) => item.id === button.dataset.examId);
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
