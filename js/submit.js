(function () {
  async function submitExam(attempt_id, questions) {
    const answers = questions.map((question) => {
      const wrapper = document.querySelector(`[data-question-no="${question.question_no}"]`);
      let answer = '';

      if (wrapper) {
        if (question.type === '객관식') {
          const checked = wrapper.querySelector('input[type="radio"]:checked');
          answer = checked ? checked.value : '';
        } else {
          const textarea = wrapper.querySelector('textarea');
          answer = textarea ? textarea.value.trim() : '';
        }
      }

      return {
        question_no: question.question_no,
        answer,
      };
    });

    const result = await window.api.apiPost('/attempts/submit', {
      attempt_id,
      answers,
      questions,
    });

    const examState = JSON.parse(sessionStorage.getItem('pafa_current_exam') || '{}');
    const student = JSON.parse(sessionStorage.getItem('pafa_student') || '{}');

    sessionStorage.setItem(
      'pafa_result',
      JSON.stringify({
        student_name: student.name || '',
        exam_title: examState.title || '',
        total_score: result.total_score,
        max_score: result.max_score,
        responses: result.responses,
      })
    );
    sessionStorage.removeItem('pafa_answers');
    sessionStorage.removeItem('pafa_current_exam');
    window.location.href = 'result.html';
  }

  window.submitExam = submitExam;
})();
