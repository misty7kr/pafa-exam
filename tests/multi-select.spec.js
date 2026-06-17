const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const parseExamQuestions = require('../parseExamQuestions.js');

const APP = process.env.PAFA_EXAM_APP || `file://${path.resolve(__dirname, '..', 'exam.html')}?debug=7958`;
const DEFAULT_RUN = '/Users/justin/Downloads/0617 3 4 동형json/_INSPECT_RUN_20260617_current_20260617_010031';
const RUN = process.env.PAFA_INSPECT_RUN || DEFAULT_RUN;
const CIRCLED_RE = /[①②③④⑤⑥⑦⑧⑨⑩]/g;

function registeredFiles() {
  const unitRoot = path.join(RUN, 'unit_reports');
  if (!fs.existsSync(unitRoot)) {
    throw new Error(`PAFA inspect run not found: ${RUN}. Set PAFA_INSPECT_RUN=/path/to/_INSPECT_RUN...`);
  }
  return fs.readdirSync(unitRoot).sort().flatMap(unit => {
    const reg = path.join(unitRoot, unit, 'registered');
    if (!fs.existsSync(reg)) return [];
    return fs.readdirSync(reg)
      .filter(name => name.endsWith('_동형등록.json'))
      .map(name => ({ unit, file: path.join(reg, name) }));
  });
}

function buildMultiQuestionsFromRegisteredFiles() {
  const out = [];
  let syntheticNo = 1;
  for (const { unit, file } of registeredFiles()) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const result = raw['결과'] || '';
    const parsed = parseExamQuestions(result);
    const byQ = new Map(parsed.map(q => [String(q.question_no), q]));
    const blocks = result.split(/(?=\[(?:Q|SQ):\d+\])/);
    for (const block of blocks) {
      const m = block.trim().match(/^\[Q:(\d+)\]/);
      if (!m) continue;
      const ansM = block.match(/\[ANS:([^\]]*)\]/);
      const labels = ansM ? (ansM[1].match(CIRCLED_RE) || []) : [];
      if (labels.length <= 1) continue;
      const originalQNo = Number(m[1]);
      const q = byQ.get(String(originalQNo));
      if (!q) throw new Error(`parsed question missing unit=${unit} q=${originalQNo}`);
      out.push({
        ...q,
        question_no: syntheticNo,
        title: `[unit ${unit} q${originalQNo}] ${q.title || ''}`,
        correct_answer: labels.join(''),
        __expectedLabels: labels,
        __unit: unit,
        __originalQNo: originalQNo,
        __file: path.basename(file),
      });
      syntheticNo += 1;
    }
  }
  return out;
}

async function mountExamWithQuestions(page, questions, attemptId = 'attempt-multi-smoke') {
  let submitted = null;
  await page.route('https://pfexam.classby.kr/exam/student/exams**', async route => {
    await route.fulfill({ json: [{ id: 'exam-multi-smoke', title: '복수정답 smoke', registered_at: '2026-06-17T00:00:00Z' }] });
  });
  await page.route('https://pfexam.classby.kr/exam/student/attempts', async route => {
    await route.fulfill({ json: { attempt_id: attemptId } });
  });
  await page.route(`https://pfexam.classby.kr/exam/student/attempts/${attemptId}`, async route => {
    await route.fulfill({ json: { attempt_id: attemptId, started_at: new Date().toISOString(), questions } });
  });
  await page.route(`https://pfexam.classby.kr/exam/student/attempts/${attemptId}/submit`, async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { attempt_id: attemptId, total_score: 100, max_score: 100, responses: submitted.answers || [] } });
  });

  await page.addInitScript(() => {
    localStorage.setItem('pafa_student', JSON.stringify({ student_id: 'stu-multi-smoke', name: '테스트학생' }));
  });
  await page.goto(APP);
  await page.locator('.exam-card').click();
  await expect(page.locator('[data-question-no="1"]')).toBeVisible();
  return () => submitted;
}

test('어휘(영영풀이) 복수정답은 radio가 아니라 multi_select로 렌더링된다', async ({ page }) => {
  const questions = [{
    question_no: 1,
    type: '객관식',
    qtype: '어휘(영영풀이)',
    title: '다음 밑줄 친 낱말의 영영풀이가 적절하지 않은 것을 모두 고르시오.',
    passage: '① [alpha] ② [beta] ③ [gamma] ④ [delta] ⑤ [epsilon]',
    options: ['①', '②', '③', '④', '⑤'],
    correct_answer: '②③',
    score: 2,
  }];
  const getSubmitted = await mountExamWithQuestions(page, questions, 'attempt-repro');

  const card = page.locator('[data-question-no="1"]');
  await expect(card).toHaveAttribute('data-question-type', 'multi_select');
  await expect(card.locator('input[type="radio"]')).toHaveCount(0);
  await card.locator('.ms-btn[data-val="②"]').click();
  await card.locator('.ms-btn[data-val="③"]').click();
  await expect(card.locator('.ms-btn.active')).toHaveCount(2);

  const active = await card.locator('.ms-btn.active').evaluateAll(btns => btns.map(b => b.dataset.val).join(''));
  expect(active).toBe('②③');
  const omrActive = await page.locator('.omr-row[data-omr-qno="1"] .omr-btn.active').evaluateAll(btns => btns.map(b => b.dataset.val).join(''));
  expect(omrActive).toBe('②③');

  await page.evaluate(() => document.getElementById('submit-button').click());
  await page.waitForURL(/result\.html/);
  expect(getSubmitted().answers).toEqual([{ question_no: 1, student_answer: '②③' }]);
});

test('등록본 전체 복수정답 문항은 학생 UI에서 전부 다중 클릭/제출 가능하다', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1920, height: 1200 });
  const questions = buildMultiQuestionsFromRegisteredFiles();
  expect(questions.length).toBeGreaterThan(0);
  const getSubmitted = await mountExamWithQuestions(page, questions, 'attempt-all-registered');

  const failures = [];
  for (const q of questions) {
    const qsel = `[data-question-no="${q.question_no}"]`;
    const card = page.locator(qsel);
    await card.scrollIntoViewIfNeeded();
    const renderType = await card.getAttribute('data-question-type');
    const msCount = await card.locator('.ms-btn').count();
    if (renderType !== 'multi_select' || msCount < q.__expectedLabels.length) {
      failures.push({ unit: q.__unit, qno: q.__originalQNo, expected: q.__expectedLabels.join(''), renderType, msCount });
      continue;
    }
    for (const label of q.__expectedLabels) {
      const btn = card.locator(`.ms-btn[data-val="${label}"]`);
      if (await btn.count() !== 1) {
        failures.push({ unit: q.__unit, qno: q.__originalQNo, expected: q.__expectedLabels.join(''), missingButton: label });
        continue;
      }
      await btn.click();
    }
    const expected = q.__expectedLabels.join('');
    const active = await card.locator('.ms-btn.active').evaluateAll(btns => btns.map(b => b.dataset.val).join(''));
    if (active !== expected) failures.push({ unit: q.__unit, qno: q.__originalQNo, expected, active });
    const omrActive = await page.locator(`.omr-row[data-omr-qno="${q.question_no}"] .omr-btn.active`).evaluateAll(btns => btns.map(b => b.dataset.val).join(''));
    if (omrActive !== expected) failures.push({ unit: q.__unit, qno: q.__originalQNo, expected, omrActive });
  }
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);

  await page.evaluate(() => document.getElementById('submit-button').click());
  await page.waitForURL(/result\.html/);
  const submitted = getSubmitted();
  expect(submitted).toBeTruthy();
  const ansMap = new Map(submitted.answers.map(a => [String(a.question_no), a.student_answer]));
  const payloadFailures = questions.filter(q => ansMap.get(String(q.question_no)) !== q.__expectedLabels.join(''))
    .map(q => ({ unit: q.__unit, qno: q.__originalQNo, expected: q.__expectedLabels.join(''), got: ansMap.get(String(q.question_no)) }));
  expect(payloadFailures, JSON.stringify(payloadFailures, null, 2)).toEqual([]);
});
