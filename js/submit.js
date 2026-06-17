(function () {
  async function submitExam(attempt_id, questions) {
    const answers = questions.map((question) => {
      const wrapper = document.querySelector(`[data-question-no="${question.question_no}"]`);
      let student_answer = '';

      if (wrapper) {
        const renderType = wrapper.dataset.questionType;
        if (renderType === 'binary_choice') {
          // 괄호별 선택 단어 "① word ② word" 직렬화 (서버 binary_choice 채점 형식)
          const parts = [];
          wrapper.querySelectorAll('.binary-row').forEach((row) => {
            const sel = row.querySelector('.bin-btn.active');
            if (sel) parts.push(row.dataset.binNo + ' ' + sel.dataset.val);
          });
          student_answer = parts.join(' ');
        } else if (renderType === 'multi_select') {
          const selected = [...wrapper.querySelectorAll('.ms-btn.active')].map((button) => button.dataset.val);
          const circleToNum = { '①':'1', '②':'2', '③':'3', '④':'4', '⑤':'5', '⑥':'6', '⑦':'7', '⑧':'8', '⑨':'9', '⑩':'10' };
          const correctRaw = String(question.correct_answer || '');
          const expectsNumeric = question.type === '객관식' && !/[①②③④⑤⑥⑦⑧⑨⑩]/.test(correctRaw);
          student_answer = expectsNumeric
            ? selected.map((value) => circleToNum[value] || value).join(' ')
            : selected.join('');
        } else if (question.type === '객관식') {
          const checked = wrapper.querySelector('input[type="radio"]:checked');
          student_answer = checked ? checked.value : '';
        } else if (typeof window.examApp?.collectStructuredAnswer === 'function') {
          const structAnswer = window.examApp.collectStructuredAnswer(wrapper);
          student_answer = structAnswer !== null ? structAnswer : '';
          if (structAnswer === null) {
            const textarea = wrapper.querySelector('textarea');
            student_answer = textarea ? textarea.value.trim() : '';
          }
        } else {
          const textarea = wrapper.querySelector('textarea');
          student_answer = textarea ? textarea.value.trim() : '';
        }
      }

      return { question_no: question.question_no, student_answer };
    });

    const startedAt = parseInt(localStorage.getItem('pafa_exam_started') || '0', 10);
    const duration_sec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
    const result = await window.api.apiPost(`/student/attempts/${attempt_id}/submit`, { answers, duration_sec });

    const examState = JSON.parse(localStorage.getItem('pafa_current_exam') || sessionStorage.getItem('pafa_current_exam') || '{}');
    const student = JSON.parse(localStorage.getItem('pafa_student') || sessionStorage.getItem('pafa_student') || '{}');
    const resultData = JSON.stringify({
      attempt_id: result.attempt_id || attempt_id, // #5 캐시 대조용
      student_name: student.name || '',
      exam_title: examState.title || '',
      total_score: result.total_score || 0,
      max_score: result.max_score || 0,
      responses: result.responses || [],
    });
    localStorage.setItem('pafa_result', resultData);
    sessionStorage.setItem('pafa_result', resultData);
    localStorage.removeItem('pafa_answers');
    localStorage.removeItem('pafa_current_exam');
    sessionStorage.removeItem('pafa_answers');
    sessionStorage.removeItem('pafa_current_exam');
    window.location.href = 'result.html';
  }

  window.submitExam = submitExam;
})();
