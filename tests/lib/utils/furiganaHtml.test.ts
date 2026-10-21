/**
 * @jest-environment node
 */

import { normalizeFuriganaArray, normalizeFuriganaHtml } from '../../../lib/utils/furiganaHtml';

const RUBY = '<ruby>旅行<rp>(</rp><rt>りょこう</rt><rp>)</rp></ruby>の<ruby>準備<rp>(</rp><rt>じゅんび</rt><rp>)</rp></ruby>';

describe('normalizeFuriganaHtml', () => {
  it('keeps a stored ruby line', () => {
    expect(normalizeFuriganaHtml(RUBY)).toBe(RUBY);
  });

  it('unwraps a markdown fence and collapses newlines', () => {
    const fenced = '```html\n<ruby>今日<rp>(</rp><rt>きょう</rt><rp>)</rp></ruby>\nはいい<ruby>天気<rp>(</rp><rt>てんき</rt><rp>)</rp></ruby>です\n```';
    expect(normalizeFuriganaHtml(fenced)).toBe(
      '<ruby>今日<rp>(</rp><rt>きょう</rt><rp>)</rp></ruby>はいい<ruby>天気<rp>(</rp><rt>てんき</rt><rp>)</rp></ruby>です'
    );
  });

  it('drops a wrapper element around ruby', () => {
    const wrapped = '<div><ruby>本<rp>(</rp><rt>ほん</rt><rp>)</rp></ruby>を</div>';
    expect(normalizeFuriganaHtml(wrapped)).toBe('<ruby>本<rp>(</rp><rt>ほん</rt><rp>)</rp></ruby>を');
  });

  it('rejects a style block left beside the ruby', () => {
    const dirty = '<ruby>本<rp>(</rp><rt>ほん</rt><rp>)</rp></ruby><style>body{font-size:40px}</style>';
    expect(normalizeFuriganaHtml(dirty)).toBeNull();
  });

  it('rejects a numbered study card', () => {
    const card = '1/ 今日はいい天気です\n2/ きょうはいいてんきです\n3/ kyou wa ii tenki desu\n4/ The weather is nice today';
    expect(normalizeFuriganaHtml(card)).toBeNull();
  });

  it('rejects ruby mixed with the study-card lines', () => {
    const mixed = '<ruby>今日<rp>(</rp><rt>きょう</rt><rp>)</rp></ruby>はいい天気です\n2/ きょうはいいてんきです\n4/ The weather is nice';
    expect(normalizeFuriganaHtml(mixed)).toBeNull();
  });

  it('keeps a kana-only phrase', () => {
    expect(normalizeFuriganaHtml('こんにちは。')).toBe('こんにちは。');
  });

  it('rejects kanji with no ruby', () => {
    expect(normalizeFuriganaHtml('今日はいい天気です')).toBeNull();
  });
});

describe('normalizeFuriganaArray', () => {
  it('normalizes each cached clarification fragment', () => {
    const raw = JSON.stringify([RUBY, '```html\n<ruby>本<rt>ほん</rt></ruby>\n```']);
    expect(normalizeFuriganaArray(raw)).toEqual([RUBY, '<ruby>本<rt>ほん</rt></ruby>']);
  });

  it('rejects an array that contains a study card', () => {
    expect(normalizeFuriganaArray(JSON.stringify([RUBY, '1/ 今日\n2/ きょう\n3/ kyou\n4/ today']))).toBeNull();
  });

  it('rejects a plain ruby string', () => {
    expect(normalizeFuriganaArray(RUBY)).toBeNull();
  });
});
