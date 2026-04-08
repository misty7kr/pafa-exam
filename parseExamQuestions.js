function parseExamQuestions(resultStr) {
  if (!resultStr || typeof resultStr !== 'string') return [];
  // TYPE 기반 객관식/주관식 분류 (CHOICES 유무에 의존하지 않음)
  const OBJ_TYPES = new Set(['요지·주장','함의추론','주제·제목',
    '내용일치·불일치','내용일치·불일치(영)',  // 한국어판/영어판 둘 다
    '어법','어휘','빈칸추론','흐름무관문장','문장순서','문장삽입',
    '객관식요약빈칸','추론유형','추론유형(영)','연결사빈칸','학생반응','학생반응(영)']);
  // 지칭추론은 주관식 형식 (가리키는 대상 쓰시오) → OBJ_TYPES 제외
  const CIRCLED = ['①','②','③','④','⑤'];
  const blocks = resultStr.split(/(?=\[(?:Q|SQ):\d+\])/);
  const questions = [];
  // Q 블록 먼저 파싱하여 최대 번호 파악
  let maxQNo = 0;
  for (const block of blocks) {
    const m = block.trim().match(/^\[Q:(\d+)\]/);
    if (m) maxQNo = Math.max(maxQNo, parseInt(m[1], 10));
  }
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const qNoMatch = trimmed.match(/^\[(Q|SQ):(\d+)\]/);
    if (!qNoMatch) continue;
    const isSQ = qNoMatch[1] === 'SQ';
    const question_no = isSQ ? maxQNo + parseInt(qNoMatch[2], 10) : parseInt(qNoMatch[2], 10);
    const typeMatch    = trimmed.match(/\[TYPE:([^\]]+)\]/);
    const qType        = typeMatch ? typeMatch[1].trim() : '';
    const ansMatch     = trimmed.match(/\[ANS:([^\]]*)\]/);
    const sourceMatch  = trimmed.match(/\[SOURCE:([^\]]*)\]/);
    const source = sourceMatch ? sourceMatch[1].trim() : null;
    const givenMatch   = trimmed.match(/\[GIVEN\]([\s\S]*?)\[\/GIVEN\]/);
    const summaryTagMatch = trimmed.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/);
    const conditionMatch = trimmed.match(/\[CONDITION\]([\s\S]*?)\[\/CONDITION\]/);
    const condition = conditionMatch ? conditionMatch[1].trim() : null;
    const given = givenMatch ? givenMatch[1].trim() : null;
    const passageMatches = [...trimmed.matchAll(/\[PASSAGE\]([\s\S]*?)\[\/PASSAGE\]/g)];
    let passage = null, summary = null;
    if (passageMatches.length > 0) {
      const labels = ['지문A', '지문B', '지문C'];
      const raws = passageMatches.map((m, i) => {
        let raw = m[1].trim()
          .replace(/\[U\]([\s\S]*?)\[\/U\]/g, '<u>$1</u>')
          .replace(/\[B\]([\s\S]*?)\[\/B\]/g, '<b>$1</b>')
          .replace(/\[I\]([\s\S]*?)\[\/I\]/g, '<i>$1</i>')
          .replace(/\[[A-Z_]+\]([\s\S]*?)\[\/[A-Z_]+\]/g, '$1');
        return passageMatches.length > 1 ? `[${labels[i] || '지문' + (i+1)}]\n${raw}` : raw;
      });
      let combined = raws.join('\n\n');
      // [SUMMARY] 태그 우선 추출, 없으면 → Summary: 패턴 분리
      if (summaryTagMatch) {
        summary = summaryTagMatch[1].trim();
      } else {
        const sumIdx = combined.search(/→\s*Summary:/i);
        if (sumIdx >= 0) {
          summary = combined.slice(sumIdx).trim();
          combined = combined.slice(0, sumIdx).trim();
        }
      }
      passage = combined || null;
    }
    const choicesMatch = trimmed.match(/\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/);
    // TYPE 기반 판별 — TYPE 없으면 CHOICES 유무로 fallback
    // 어법이라도 "모두 고르고 고치시오" 형식(①~⑩)은 주관식
    const isSubjectiveGrammar = qType === '어법' &&
      (trimmed.includes('모두 고르') || trimmed.includes('고치시오') || trimmed.includes('⑥') || trimmed.includes('⑦'));
    // 어휘복수: ANS에 원문자(①-⑩)가 2개 이상이면 주관식
    const isSubjectiveVocab = qType === '어휘' && ansMatch &&
      [...ansMatch[1]].filter(c => { const cp = c.codePointAt(0); return cp >= 0x2460 && cp <= 0x2469; }).length > 1;
    // SQ 블록은 항상 주관식
    const isObj = isSQ ? false : (isSubjectiveGrammar ? false : (isSubjectiveVocab ? false : (qType ? OBJ_TYPES.has(qType) : !!choicesMatch)));
    let options = [];
    if (choicesMatch && choicesMatch[1]) {
      options = choicesMatch[1].trim().split('\n')
        .map(l => l.replace(/^[①②③④⑤]\s*/, '').trim())
        .filter(l => l.length > 0);
    }
    // CHOICES 없는 객관식(문장삽입 등): 기본 5지선다
    if (isObj && options.length === 0) {
      options = ['①', '②', '③', '④', '⑤'];
    }
    // SCORING 태그를 title 제거 전에 미리 추출
    const scoringTagMatch = trimmed.match(/\[SCORING\]([\s\S]*?)\[\/SCORING\]/);
    const scoring_criteria = scoringTagMatch ? scoringTagMatch[1].trim() : '';
    const title = trimmed
      .replace(/\[(?:Q|SQ):\d+\]/g, '')
      .replace(/\[TYPE:[^\]]+\]/g, '')
      .replace(/\[DIFF:[^\]]+\]/g, '')
      .replace(/\[CHALLENGING:[^\]]+\]/g, '')
      .replace(/\[PASSAGE\][\s\S]*?\[\/PASSAGE\]/g, '')
      .replace(/\[CHOICES\][\s\S]*?\[\/CHOICES\]/g, '')
      .replace(/\[GIVEN\][\s\S]*?\[\/GIVEN\]/g, '')
      .replace(/\[CONDITION\][\s\S]*?\[\/CONDITION\]/g, '')
      .replace(/\[ANS\][\s\S]*?\[\/ANS\]/g, '')
      .replace(/\[SCORING\][\s\S]*?\[\/SCORING\]/g, '')
      .replace(/\[sub_answers\][\s\S]*?\[\/sub_answers\]/g, '')
      .replace(/\[BLOCK_[A-Z]\]([\s\S]*?)\[\/BLOCK_[A-Z]\]/g, '$1')
      .replace(/\[U\]([\s\S]*?)\[\/U\]/g, '$1')
      .replace(/\[B\]([\s\S]*?)\[\/B\]/g, '$1')
      .replace(/\[SOURCE:[^\]]*\]/g, '')
      .replace(/\[ANS:[^\]]*\]/g, '')
      .replace(/\[EXPLAIN\][\s\S]*/g, '')
      .trim()
      .replace(/\n{2,}/g, '\n')
      .trim();
    // EXPLAIN 파싱 (어법 수정 정답 추출용)
    const explainMatch = trimmed.match(/\[EXPLAIN\]([\s\S]*?)(?:\[\/EXPLAIN\]|$)/);
    const explainText = explainMatch ? explainMatch[1] : '';
    // SQ 정답: [ANS]...[/ANS] 블록 형식 파싱
    const ansBlockMatch = trimmed.match(/\[ANS\]([\s\S]*?)\[\/ANS\]/);
    // sub_answers: 평문 'sub_answers: [...]' 라인 파싱 (위치 변형 유사 정답 배열)
    const subAnswersLineMatch = trimmed.match(/^sub_answers:\s*(\[[\s\S]*?\])/m);
    let sub_answers = [];
    if (subAnswersLineMatch) {
      try { sub_answers = JSON.parse(subAnswersLineMatch[1]); } catch(_) { sub_answers = []; }
    }
    let correct_answer = '';
    if (ansMatch) {
      const ans = ansMatch[1].trim();
      if (isObj) {
        // Unicode 코드포인트로 동그라미 숫자 변환 (인코딩 무관하게 처리)
        const cp = ans.codePointAt(0);
        if (cp >= 0x2460 && cp <= 0x2468) correct_answer = String(cp - 0x2460 + 1); // ①-⑨
        else if (cp >= 0x2776 && cp <= 0x277E) correct_answer = String(cp - 0x2776 + 1); // ❶-❾
        else if (cp >= 0x2780 && cp <= 0x2788) correct_answer = String(cp - 0x2780 + 1); // ➀-➈
        else if (ans.match(/^[1-9]$/)) correct_answer = ans;
        else correct_answer = ans; // fallback
      } else if (qType === '어법' && explainText) {
        // 어법(고치시오): EXPLAIN 세그먼트별 수정어 추출
        // correct_answer = JSON: {"②":"creates","⑤":"Embrace",...}
        const corrections = {};
        const segs = explainText.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/);
        for (const seg of segs) {
          const cm = seg.match(/^([①②③④⑤⑥⑦⑧⑨⑩])/);
          if (!cm || !seg.includes('→ 오류')) continue;
          const circle = cm[1];
          let correction = null;
          // "X가/이 되어야" / "X가/이 맞다"
          let m2 = seg.match(/([A-Za-z][A-Za-z\s\-]*)(?:가|이) (?:되어야|맞다)/);
          if (m2) correction = m2[1].trim();
          // "X으로/로 이끌어야/바꿔야/고쳐야"
          if (!correction) { m2 = seg.match(/([A-Za-z][A-Za-z\s\-]*)(?:으로|로) (?:이끌어야|바꿔야|고쳐야)/); if (m2) correction = m2[1].trim(); }
          if (correction) corrections[circle] = correction;
        }
        correct_answer = Object.keys(corrections).length > 0 ? JSON.stringify(corrections) : ans;
      } else if (qType === '어휘' && explainText) {
        // 어휘(고치시오): EXPLAIN에서 "적절어: X" 패턴으로 수정어 추출
        const vocabCorrections = {};
        const segs = explainText.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/);
        for (const seg of segs) {
          const cm = seg.match(/^([①②③④⑤⑥⑦⑧⑨⑩])/);
          if (!cm || !seg.includes('부적절')) continue;
          const m2 = seg.match(/적절어:\s*([^\n,.(]+)/);
          if (m2) vocabCorrections[cm[1]] = m2[1].trim();
        }
        correct_answer = Object.keys(vocabCorrections).length > 0 ? JSON.stringify(vocabCorrections) : ans;
      } else {
        correct_answer = ans;
      }
    } else if (ansBlockMatch) {
      // SQ: [ANS]...[/ANS] 블록 형식 (서술형 정답)
      correct_answer = ansBlockMatch[1].trim();
    }
    // 인라인 선지 분리: title 안에 ①text ②text ... 패턴이 있으면 제목과 분리
    let finalTitle = title;
    let finalOptions = options;
    if (isObj && /①[^①②③④⑤]{5,}②/.test(title)) {
      const inlineMatch = title.match(/^([\s\S]*?)\s*①\s*([\s\S]+)$/);
      if (inlineMatch) {
        finalTitle = inlineMatch[1].trim();
        // options가 기본 번호(①②③④⑤)이거나 비어있을 때만 텍스트로 교체
        const isDefaultOptions = options.length === 0 || options.every(o => /^[①②③④⑤]$/.test(o.trim()));
        if (isDefaultOptions) {
          const choiceBlock = '①' + inlineMatch[2];
          const extracted = choiceBlock.split(/(?=[②③④⑤])/).map(c => c.replace(/^[①②③④⑤]\s*/, '').trim()).filter(Boolean);
          if (extracted.length >= 2) finalOptions = extracted;
        }
      }
    }
    questions.push({ question_no, type: isObj ? '객관식' : '주관식', qtype: qType, title: finalTitle, given, passage, summary, condition, source, options: finalOptions, score: isObj ? 2 : 4, correct_answer, sub_answers, scoring_criteria, explain_text: explainText });
  }
  // ── 100점 만점 배분 (주관식 = 객관식 2배 가중치) ──
  if (questions.length > 0) {
    const objCount = questions.filter(q => q.type === '객관식').length;
    const sqCount  = questions.filter(q => q.type === '주관식').length;
    const units = objCount + sqCount * 2;
    if (units > 0) {
      const objScore = Math.round((100 / units) * 10) / 10;
      const sqScore  = Math.round((100 / units) * 2 * 10) / 10;
      questions.forEach(q => { q.score = q.type === '객관식' ? objScore : sqScore; });
      const total = questions.reduce((s, q) => s + q.score, 0);
      const diff = Math.round((100 - total) * 10) / 10;
      if (diff !== 0) questions[questions.length - 1].score = Math.round((questions[questions.length - 1].score + diff) * 10) / 10;
    }
  }
  return questions;
}

module.exports = parseExamQuestions;
