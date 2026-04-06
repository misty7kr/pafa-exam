(function () {
  async function submitExam(attempt_id, questions) {
    const answers = questions.map((question) => {
      const wrapper = document.querySelector(`[data-question-no="${question.question_no}"]`);
      let student_answer = '';

      if (wrapper) {
        if (question.type === '객관식') {
          const checked = wrapper.querySelector('input[type="radio"]:checked');
          student_answer = checked ? checked.value : '';
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
