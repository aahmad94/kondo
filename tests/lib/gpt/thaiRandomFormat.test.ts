import fs from 'fs';
import path from 'path';
import {
  isTopiclessRandomPrompt,
  thaiTopiclessRandomMissingEnglish,
} from '@/lib/gpt/thaiRandomFormat';

const THAI = 'ฉันเพิ่งเจอเพื่อนเก่าในร้านกาแฟเมื่อเช้านี้ครับ';
const ROMAN = 'chăn phǒeng jer pheūan-gào nai ráhn-gaa-fae méua-cháo-níi khrap';
const ENGLISH = 'I just ran into an old friend at a cafe this morning.';

describe('isTopiclessRandomPrompt', () => {
  it('matches random with no topic, including a difficulty word', () => {
    expect(isTopiclessRandomPrompt('random')).toBe(true);
    expect(isTopiclessRandomPrompt('  random easy  ')).toBe(true);
    expect(isTopiclessRandomPrompt('random hard')).toBe(true);
  });

  it('ignores random once a topic is present', () => {
    expect(isTopiclessRandomPrompt('random coffee')).toBe(false);
    expect(isTopiclessRandomPrompt('translate hello')).toBe(false);
  });
});

describe('thaiTopiclessRandomMissingEnglish', () => {
  it('flags a last line that repeats the Thai sentence', () => {
    const card = `1/ ${THAI}\n2/ ${ROMAN}\n3/ ${THAI}`;
    expect(thaiTopiclessRandomMissingEnglish('random', card)).toBe(true);
  });

  it('accepts an English last line', () => {
    const card = `1/ ${THAI}\n2/ ${ROMAN}\n3/ ${ENGLISH}`;
    expect(thaiTopiclessRandomMissingEnglish('random', card)).toBe(false);
  });

  it('flags a card that never reaches an English third line', () => {
    const card = `1/ ${THAI}\n2/ ${ROMAN}`;
    expect(thaiTopiclessRandomMissingEnglish('random medium', card)).toBe(true);
  });

  it('leaves topical random and other commands alone', () => {
    const card = `1/ ${THAI}\n2/ ${ROMAN}\n3/ ${THAI}`;
    expect(thaiTopiclessRandomMissingEnglish('random coffee', card)).toBe(false);
    expect(thaiTopiclessRandomMissingEnglish('translate hello', card)).toBe(false);
  });
});

describe('Thai study prompt', () => {
  it('tells topicless random to put English on line 3', () => {
    const prompt = fs.readFileSync(
      path.join(process.cwd(), 'prompts/th_gpt_prompt.txt'),
      'utf8',
    );
    expect(prompt).toMatch(/EXCEPTION FOR RANDOM WITH NO TOPIC/);
    expect(prompt).toMatch(/must not contain any Thai script/);
  });
});
