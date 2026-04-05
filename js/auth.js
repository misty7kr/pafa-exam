(function () {
  // 지역별 학교 목록
  const SCHOOLS_BY_REGION = {
    '인천': [
      '연수중학교','인천논현중학교','인천동막중학교','인천송도중학교',
      '인천포스코중학교','청학중학교','함박중학교','해송중학교',
      '인천논현고등학교','인천송도고등학교','연수고등학교',
      '인천외국어고등학교','인천과학예술영재학교',
    ],
    '부천': [
      '부곡중학교','부명중학교','부천중학교','상동중학교','송내중학교',
      '소사중학교','심원중학교','역곡중학교','오정중학교','원미중학교',
      '중흥중학교','춘의중학교','부천고등학교','부명고등학교',
      '부천북고등학교','부흥고등학교','상동고등학교','소사고등학교',
      '송내고등학교','중원고등학교',
    ],
    '세종': [
      '가람중학교','고운중학교','나성중학교','다솜중학교','도담중학교',
      '반곡중학교','보람중학교','새롬중학교','소담중학교','아름중학교',
      '종촌중학교','한솔중학교','해밀중학교','호려울중학교',
      '가람고등학교','고운고등학교','나성고등학교','도담고등학교',
      '두루고등학교','반곡고등학교','보람고등학교','새롬고등학교',
      '세종고등학교','세종예술고등학교','세종과학예술영재학교',
      '소담고등학교','아름고등학교','양지고등학교','종촌고등학교',
      '한솔고등학교','해밀고등학교',
    ],
  };

  function populateSchools(region) {
    const schoolSel = document.getElementById('register-school');
    if (!schoolSel) return;
    schoolSel.innerHTML = '<option value="">학교 선택</option>';
    (SCHOOLS_BY_REGION[region] || []).sort().forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      schoolSel.appendChild(opt);
    });
  }

  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function setInvalid(inputEl, invalid) {
    if (!inputEl) return;
    inputEl.classList.toggle('input-invalid', invalid);
  }

  function validateLogin() {
    const academy = document.getElementById('login-academy-code');
    const name    = document.getElementById('login-name');
    const birth   = document.getElementById('login-birthdate');
    let ok = true;

    const aOk = academy && academy.value.trim() !== '';
    showError('err-login-academy', !aOk);
    setInvalid(academy, !aOk);
    if (!aOk) ok = false;

    const nOk = name && name.value.trim() !== '';
    showError('err-login-name', !nOk);
    setInvalid(name, !nOk);
    if (!nOk) ok = false;

    const bOk = birth && /^\d{6}$/.test(birth.value.trim());
    showError('err-login-birthdate', !bOk);
    setInvalid(birth, !bOk);
    if (!bOk) ok = false;

    return ok;
  }

  function validateRegister() {
    const academy = document.getElementById('register-academy-code');
    const name    = document.getElementById('register-name');
    const birth   = document.getElementById('register-birthdate');
    const grade   = document.getElementById('register-grade');
    const school  = document.getElementById('register-school');
    let ok = true;

    const aOk = academy && academy.value.trim() !== '';
    showError('err-reg-academy', !aOk); setInvalid(academy, !aOk);
    if (!aOk) ok = false;

    const nOk = name && name.value.trim() !== '';
    showError('err-reg-name', !nOk); setInvalid(name, !nOk);
    if (!nOk) ok = false;

    const bOk = birth && /^\d{6}$/.test(birth.value.trim());
    showError('err-reg-birthdate', !bOk); setInvalid(birth, !bOk);
    if (!bOk) ok = false;

    const gOk = grade && grade.value !== '';
    showError('err-reg-grade', !gOk); setInvalid(grade, !gOk);
    if (!gOk) ok = false;

    const sOk = school && school.value !== '';
    showError('err-reg-school', !sOk); setInvalid(school, !sOk);
    if (!sOk) ok = false;

    return ok;
  }

  async function login(academy_code, name, birthdate) {
    const data = await window.api.apiPost('/auth/login', { academy_code: academy_code.toUpperCase(), name, birthdate });
    const studentData = JSON.stringify({ student_id: data.student_id, name: data.name, academy_code });
    localStorage.setItem('pafa_student', studentData);
    sessionStorage.setItem('pafa_student', studentData);
    window.location.href = 'exam.html';
  }

  async function register(academy_code, name, birthdate, grade, school) {
    const data = await window.api.apiPost('/auth/register', { academy_code: academy_code.toUpperCase(), name, birthdate, grade, class: '', school });
    alert(`${data.name} 학생 가입 신청이 완료되었습니다.\n원장님 승인 후 로그인할 수 있습니다.`);
  }

  function bindTabs() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const panels = document.querySelectorAll('[data-tab-panel]');
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.tabTarget;
        tabButtons.forEach((b) => b.classList.toggle('active', b === button));
        panels.forEach((p) => p.classList.toggle('active', p.dataset.tabPanel === target));
      });
    });
  }

  function bindForms() {
    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const regionSel    = document.getElementById('register-region');

    if (regionSel) {
      regionSel.addEventListener('change', () => populateSchools(regionSel.value));
    }

    if (loginForm) {
      // 입력 시 에러 즉시 해제
      loginForm.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('input', () => {
          inp.classList.remove('input-invalid');
          const errId = inp.closest('.input-group')?.querySelector('.field-error')?.id;
          if (errId) showError(errId, false);
        });
      });

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateLogin()) return;
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await login(
            document.getElementById('login-academy-code').value.trim(),
            document.getElementById('login-name').value.trim(),
            document.getElementById('login-birthdate').value.trim()
          );
        } catch (error) {
          alert(error.message);
        } finally {
          btn.disabled = false;
        }
      });
    }

    if (registerForm) {
      registerForm.querySelectorAll('input, select').forEach((inp) => {
        inp.addEventListener('input', () => {
          inp.classList.remove('input-invalid');
          const errId = inp.closest('.input-group')?.querySelector('.field-error')?.id;
          if (errId) showError(errId, false);
        });
        inp.addEventListener('change', () => {
          inp.classList.remove('input-invalid');
          const errId = inp.closest('.input-group')?.querySelector('.field-error')?.id;
          if (errId) showError(errId, false);
        });
      });

      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateRegister()) return;
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await register(
            document.getElementById('register-academy-code').value.trim(),
            document.getElementById('register-name').value.trim(),
            document.getElementById('register-birthdate').value.trim(),
            document.getElementById('register-grade').value,
            document.getElementById('register-school').value
          );
          registerForm.reset();
          populateSchools('');
        } catch (error) {
          alert(error.message);
        } finally {
          btn.disabled = false;
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // 이미 로그인된 경우 바로 이동
    const saved = localStorage.getItem('pafa_student');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.student_id) {
          sessionStorage.setItem('pafa_student', saved);
          window.location.href = 'exam.html';
          return;
        }
      } catch (_) {}
    }
    bindTabs();
    bindForms();
  });

  window.auth = { login, register };
})();
