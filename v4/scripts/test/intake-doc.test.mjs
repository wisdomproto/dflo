import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageAt, buildIntakeHtml } from '../../src/features/admin/intake/intakeDoc.ts';

/** 최소 제출 1건. 테스트마다 필요한 필드만 덮어쓴다. */
const base = {
  id: 'sub-1',
  token: 't',
  created_at: '2026-09-02T03:00:00.000Z',
  lang: 'en',
  country: 'US',
  status: 'pending',
  name: 'Ava',
  birth_date: '2014-03-13',
  gender: 'female',
  uploads: [],
};

const sub = (extra = {}) => ({ ...base, ...extra });

test('만 나이: 생일 전이면 한 살 덜 센다', () => {
  assert.equal(ageAt('2014-03-13', '2026-09-02T00:00:00Z'), '만 12세 5개월');
  assert.equal(ageAt('2014-10-01', '2026-09-02T00:00:00Z'), '만 11세 11개월');
  assert.equal(ageAt(undefined, '2026-09-02T00:00:00Z'), '');
  assert.equal(ageAt('not-a-date', '2026-09-02T00:00:00Z'), '');
});

test('환자 입력은 escape 된다 (태그 주입 차단)', () => {
  const html = buildIntakeHtml(sub({ name: '<script>alert(1)</script>' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('성별에 따라 사춘기 문항이 갈린다', () => {
  const girl = buildIntakeHtml(sub({ intake_survey: { menarche: 'recent6m' } }));
  assert.ok(girl.includes('초경'));
  assert.ok(girl.includes('시작됨 (최근 6개월 내)'));
  assert.ok(!girl.includes('변성기'));

  const boy = buildIntakeHtml(sub({ gender: 'male', intake_survey: { voice_change: 'done' } }));
  assert.ok(boy.includes('변성기'));
  assert.ok(boy.includes('완료됨'));
  assert.ok(!boy.includes('초경'));
});

test('첨부가 있으면 목록 표, 없으면 섹션 자체가 없다', () => {
  const none = buildIntakeHtml(sub());
  assert.ok(!none.includes('첨부 파일'));

  const withFiles = buildIntakeHtml(
    sub({ uploads: [{ kind: 'lab', path: 'p/a.pdf', filename: 'CBC.pdf', size: 184617 }] }),
  );
  assert.ok(withFiles.includes('첨부 파일 (1건)'));
  assert.ok(withFiles.includes('CBC.pdf'));
  assert.ok(withFiles.includes('180 KB'));
});

test('내부 메모는 있을 때만 렌더된다', () => {
  assert.ok(!buildIntakeHtml(sub()).includes('내부 메모'));
  assert.ok(buildIntakeHtml(sub({ admin_note: '10/9 예약' })).includes('10/9 예약'));
});

test('설문(intake_survey)이 없어도 죽지 않는다', () => {
  const html = buildIntakeHtml(sub({ intake_survey: null }));
  assert.ok(html.includes('사전 문진'));
  assert.ok(html.includes('기본 정보'));
});

test('첨부 페이지 HTML 은 문서 끝(푸터 뒤)에 붙는다', () => {
  const html = buildIntakeHtml(sub(), '<figure class="att">PAGES</figure>');
  assert.ok(html.includes('PAGES'));
  assert.ok(html.indexOf('PAGES') > html.indexOf('</footer>'));
  // 인자를 안 주면 본문만 — 기존 호출부 무회귀
  assert.ok(!buildIntakeHtml(sub()).includes('class="att"'));
});
