(function () {
  async function login(academy_code, name, birthdate) {
    const data = await window.api.apiPost('/auth/login', {
      academy_code,
      name,
      birthdate,
    });

    sessionStorage.setItem(
      'pafa_student',
      JSON.stringify({
        student_id: data.student_id,
        name: data.name,
        token: data.token,
        academy_code,
      })
    );

    window.location.href = 'exam.html';
  }

  async function register(academy_code, name, birthdate, grade, cls, school) {
    const data = await window.api.apiPost('/auth/register', {
      academy_code,
      name,
      birthdate,
      grade,
      class: cls,
      school,
    });

    alert(`${data.name} 학생 가입이 완료되었습니다. 로그인 후 시험에 응시하세요.`);
  }

  function bindTabs() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const panels = document.querySelectorAll('[data-tab-panel]');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.tabTarget;
        tabButtons.forEach((item) => item.classList.toggle('active', item === button));
        panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tabPanel === target));
      });
    });
  }

  function bindForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
          await login(
            loginForm.academy_code.value.trim(),
            loginForm.name.value.trim(),
            loginForm.birthdate.value
          );
        } catch (error) {
          alert(error.message);
        } finally {
          submitButton.disabled = false;
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = registerForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
          await register(
            registerForm.academy_code.value.trim(),
            registerForm.name.value.trim(),
            registerForm.birthdate.value,
            registerForm.grade.value,
            registerForm.cls.value.trim(),
            registerForm.school.value.trim()
          );
          registerForm.reset();
        } catch (error) {
          alert(error.message);
        } finally {
          submitButton.disabled = false;
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindTabs();
    bindForms();
  });

  window.auth = {
    login,
    register,
  };
})();
