(function () {
  // 지역별 학교 목록 (공식 교육청/구청 기준, 인문계만)
  const SCHOOLS_BY_REGION = {
    // 인천 연수구청 공식 현황 기준
    '인천': {
      '중학교': [
        '능허대중학교','미송중학교','박문중학교','선학중학교','신송중학교',
        '신정중학교','연성중학교','연수중학교','연화중학교','예송중학교',
        '옥련중학교','은송중학교','인송중학교','인천여자중학교','인천중학교',
        '청량중학교','청학중학교','함박중학교','해송중학교','현송중학교',
      ],
      '고등학교': [
        '박문여자고등학교','송도고등학교','신송고등학교','연송고등학교',
        '연수고등학교','연수여자고등학교','옥련여자고등학교','인천대건고등학교',
        '인천여자고등학교','인천포스코고등학교','인천해송고등학교',
      ],
    },
    // 부천교육지원청 공식 현황 기준
    '부천': {
      '중학교': [
        '계남중학교','까치울중학교','내동중학교','덕산중학교','도당중학교',
        '범박중학교','부명중학교','부인중학교','부일중학교','부천남중학교',
        '부천동여자중학교','부천동중학교','부천부곡중학교','부천부흥중학교',
        '부천북여자중학교','부천북중학교','부천여월중학교','부천여자중학교',
        '부천일신중학교','부천중학교','상도중학교','상동중학교','석천중학교',
        '소사중학교','송내중학교','심원중학교','역곡중학교','오정중학교',
        '원미중학교','중흥중학교','춘의중학교',
      ],
      '고등학교': [
        '계남고등학교','덕산고등학교','도당고등학교','범박고등학교',
        '부명고등학교','부천고등학교','부천북고등학교','부천여자고등학교',
        '상동고등학교','상원고등학교','상일고등학교','소사고등학교',
        '송내고등학교','수주고등학교','심원고등학교','역곡고등학교',
        '원미고등학교','원종고등학교','중원고등학교','중흥고등학교',
      ],
    },
    // 세종특별자치시교육청 공식 현황 기준
    '세종': {
      '중학교': [
        '고운중학교','글벗중학교','금호중학교','나성중학교','다정중학교',
        '도담중학교','두루중학교','반곡중학교','보람중학교','부강중학교',
        '산울중학교','새뜸중학교','새롬중학교','새움중학교','세종중학교',
        '소담중학교','아름중학교','양지중학교','어진중학교','연동중학교',
        '연서중학교','장기중학교','전의중학교','조치원중학교','종촌중학교',
        '집현중학교','한솔중학교','해밀중학교',
      ],
      '고등학교': [
        '고운고등학교','다정고등학교','도담고등학교','두루고등학교',
        '반곡고등학교','보람고등학교','새롬고등학교','세종고등학교',
        '세종국제고등학교','세종대성고등학교','세종미래고등학교',
        '세종여자고등학교','세종예술고등학교','세종장영실고등학교',
        '세종캠퍼스고등학교','소담고등학교','아름고등학교','양지고등학교',
        '종촌고등학교','한솔고등학교','해밀고등학교',
      ],
    },
    // 공주시 (인문계)
    '공주': {
      '중학교': [
        '경천중학교','공주북중학교','공주여자중학교','공주영명중학교','공주중학교',
        '국립공주대학교사범대학부설중학교','반포중학교','봉황중학교',
        '사곡중학교','우성중학교','유구중학교','이인중학교','정안중학교','탄천중학교',
      ],
      '고등학교': [
        '공주고등학교','공주금성여자고등학교','공주대학교사범대학부설고등학교',
        '공주여자고등학교','공주영명고등학교','한일고등학교',
      ],
    },
    // 서울 송파구 (잠실 포함, 인문계)
    '잠실': {
      '중학교': [
        '가락중학교','가원중학교','거원중학교','문정중학교','문현중학교',
        '방산중학교','방이중학교','배명중학교','보성중학교','보인중학교',
        '석촌중학교','세륜중학교','송례중학교','송파중학교','신천중학교',
        '아주중학교','영파여자중학교','오금중학교','오륜중학교','오주중학교',
        '위례솔중학교','잠신중학교','잠실여자중학교','잠실중학교',
        '정신여자중학교','풍납중학교','풍성중학교','해누리중학교',
      ],
      '고등학교': [
        '가락고등학교','덕수고등학교','문정고등학교','문현고등학교',
        '방산고등학교','배명고등학교','보성고등학교','보인고등학교',
        '영동일고등학교','영파여자고등학교','오금고등학교','잠신고등학교',
        '잠실고등학교','잠실여자고등학교','잠일고등학교',
        '정신여자고등학교','창덕여자고등학교',
      ],
    },
    // 경기 남양주시
    '남양주': {
      '중학교': [
        '가운중학교','광동중학교','광릉중학교','금곡중학교','남양주다산중학교',
        '남양주새봄중학교','다산한강중학교','덕소중학교','도농중학교','동화중학교',
        '마석중학교','미금중학교','별가람중학교','별내중학교','송라중학교',
        '수동중학교','심석중학교','양오중학교','어람중학교','연세중학교',
        '예봉중학교','오남중학교','와부중학교','장내중학교','주곡중학교',
        '진건중학교','진접중학교','천마중학교','퇴계원중학교','판곡중학교',
        '평내중학교','풍양중학교','하랑중학교','한별중학교','호평중학교',
        '화광중학교','화접중학교',
      ],
      '고등학교': [
        '가운고등학교','광동고등학교','금곡고등학교','남양주고등학교',
        '남양주다산고등학교','덕소고등학교','도농고등학교','동화고등학교',
        '마석고등학교','별가람고등학교','별내고등학교','심석고등학교',
        '오남고등학교','와부고등학교','진건고등학교','진접고등학교',
        '청학고등학교','퇴계원고등학교','판곡고등학교','평내고등학교','호평고등학교',
      ],
    },
    // 경기 광주시
    '광주': {
      '중학교': [
        '경안중학교','경화여자중학교','광주광남중학교','광주중학교',
        '매양중학교','신현중학교','오포중학교','탄벌중학교','태전중학교',
      ],
      '고등학교': [
        '경화여자고등학교','곤지암고등학교','광남고등학교','광주고등학교',
        '광주중앙고등학교','오포고등학교','초월고등학교','태전고등학교',
      ],
    },
  };

  // 학년에서 학교 구분 판별 (중/고/null)
  function gradeToSchoolType(grade) {
    if (!grade) return null;
    if (grade.startsWith('중')) return '중학교';
    if (grade.startsWith('고')) return '고등학교';
    return null;
  }

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
    if (current && !all.filter(g => g.show).some(g => g.v === current)) {
      gradeSel.value = '';
    }
  }

  function populateSchools(region, schoolType) {
    const schoolSel = document.getElementById('register-school');
    if (!schoolSel) return;
    schoolSel.innerHTML = '<option value="">학교 선택</option>';
    const regionData = SCHOOLS_BY_REGION[region];
    if (!regionData) return;
    // 구분이 없으면 전체, 있으면 해당 구분만
    let list = [];
    if (schoolType && regionData[schoolType]) {
      list = regionData[schoolType];
    } else {
      list = [...(regionData['중학교'] || []), ...(regionData['고등학교'] || [])];
    }
    list.slice().sort().forEach((s) => {
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
    const gradeSel     = document.getElementById('register-grade');
    const schoolSel    = document.getElementById('register-school');

    if (regionSel) {
      regionSel.addEventListener('change', () => {
        const type = gradeSel ? gradeToSchoolType(gradeSel.value) : null;
        populateSchools(regionSel.value, type);
      });
    }

    if (gradeSel) {
      gradeSel.addEventListener('change', () => {
        // 학년 변경 → 학교 목록 필터링
        const type = gradeToSchoolType(gradeSel.value);
        if (regionSel && regionSel.value) populateSchools(regionSel.value, type);
        // 현재 선택된 학교가 다른 구분이면 초기화
        if (schoolSel && schoolSel.value) filterGradesBySchool(schoolSel.value);
      });
    }

    if (schoolSel) {
      schoolSel.addEventListener('change', () => filterGradesBySchool(schoolSel.value));
    }

    if (loginForm) {
      loginForm.querySelectorAll('input, select').forEach((inp) => {
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
          populateSchools('', null);
        } catch (error) {
          alert(error.message);
        } finally {
          btn.disabled = false;
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
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
