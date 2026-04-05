(function () {
  // 지역별 학교 목록 (공식 교육청/구청 기준)
  const SCHOOLS_BY_REGION = {
    // 인천 연수구청 공식 현황 기준
    '인천': [
      // 중학교 (20개)
      '능허대중학교','미송중학교','박문중학교','선학중학교','신송중학교',
      '신정중학교','연성중학교','연수중학교','연화중학교','예송중학교',
      '옥련중학교','은송중학교','인송중학교','인천여자중학교','인천중학교',
      '청량중학교','청학중학교','함박중학교','해송중학교','현송중학교',
      // 고등학교 (16개)
      '박문여자고등학교','송도고등학교','신송고등학교','연송고등학교',
      '연수고등학교','연수여자고등학교','옥련여자고등학교','인천대건고등학교',
      '인천바이오과학고등학교','인천뷰티예술고등학교','인천생활과학고등학교',
      '인천여자고등학교','인천포스코고등학교','인천해송고등학교',
      '인천해양과학고등학교','인천과학예술영재학교',
    ],
    // 부천교육지원청 공식 현황 기준
    '부천': [
      // 중학교
      '계남중학교','까치울중학교','내동중학교','덕산중학교','도당중학교',
      '범박중학교','부명중학교','부인중학교','부일중학교','부천남중학교',
      '부천동여자중학교','부천동중학교','부천부곡중학교','부천부흥중학교',
      '부천북여자중학교','부천북중학교','부천여월중학교','부천여자중학교',
      '부천일신중학교','부천중학교','상도중학교','상동중학교','석천중학교',
      '소사중학교','송내중학교','심원중학교','역곡중학교','오정중학교',
      '원미중학교','중흥중학교','춘의중학교',
      // 고등학교
      '계남고등학교','덕산고등학교','도당고등학교','범박고등학교',
      '부명고등학교','부천고등학교','부천북고등학교','부천여자고등학교',
      '상동고등학교','상원고등학교','상일고등학교','소사고등학교',
      '송내고등학교','수주고등학교','심원고등학교','역곡고등학교',
      '원미고등학교','원종고등학교','중원고등학교','중흥고등학교',
    ],
    // 세종특별자치시교육청 공식 현황 기준
    '세종': [
      // 중학교 (28개)
      '고운중학교','글벗중학교','금호중학교','나성중학교','다정중학교',
      '도담중학교','두루중학교','반곡중학교','보람중학교','부강중학교',
      '산울중학교','새뜸중학교','새롬중학교','새움중학교','세종중학교',
      '소담중학교','아름중학교','양지중학교','어진중학교','연동중학교',
      '연서중학교','장기중학교','전의중학교','조치원중학교','종촌중학교',
      '집현중학교','한솔중학교','해밀중학교',
      // 고등학교 (22개)
      '고운고등학교','다정고등학교','도담고등학교','두루고등학교',
      '반곡고등학교','보람고등학교','새롬고등학교','세종고등학교',
      '세종국제고등학교','세종대성고등학교','세종미래고등학교',
      '세종여자고등학교','세종예술고등학교','세종장영실고등학교',
      '세종캠퍼스고등학교','소담고등학교','아름고등학교','양지고등학교',
      '종촌고등학교','한솔고등학교','해밀고등학교','세종과학예술영재학교',
    ],
  };

  function filterGradesBySchool(schoolName) {
    const gradeSel = document.getElementById('register-grade');
    if (!gradeSel) return;
    const isHigh = schoolName && (schoolName.includes('고등') || schoolName.endsWith('고'));
    const isMiddle = schoolName && schoolName.includes('중학');
    const all = [
      { v: '중1', show: !isHigh }, { v: '중2', show: !isHigh }, { v: '중3', show: !isHigh },
      { v: '고1', show: !isMiddle }, { v: '고2', show: !isMiddle }, { v: '고3', show: !isMiddle },
    ];
    const current = gradeSel.value;
    gradeSel.innerHTML = '<option value="">학년 선택</option>';
    all.filter(g => g.show).forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.v;
      opt.textContent = g.v;
      if (g.v === current) opt.selected = true;
      gradeSel.appendChild(opt);
    });
    // 현재 선택값이 필터 후 없으면 초기화
    if (current && !all.filter(g => g.show).some(g => g.v === current)) {
      gradeSel.value = '';
    }
  }

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
    filterGradesBySchool('');
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

    const schoolSel = document.getElementById('register-school');
    if (schoolSel) {
      schoolSel.addEventListener('change', () => filterGradesBySchool(schoolSel.value));
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
