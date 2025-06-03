# Tests for Lib Services

This directory contains test files for various services in the `lib` directory.

## Furigana Service Tests

### Running the Furigana Test

To test the furigana functionality:

```bash
node lib/tests/furigana.test.js
```

### What it tests

The furigana test verifies that:
- Kuroshiro library initializes correctly
- Japanese text with kanji is converted to furigana format
- The output contains proper HTML ruby tags for furigana display
- Various types of Japanese sentences are handled correctly

### Test Cases

The test includes several scenarios:
- Simple greetings with basic kanji
- Complex sentences with multiple kanji characters
- Self-introduction phrases
- Common restaurant requests

### Expected Output

The test should output furigana in HTML format using `<ruby>` and `<rt>` tags, which can be rendered in browsers to display furigana above kanji characters.

Example output:
```html
<ruby>今日<rp>(</rp><rt>きょう</rt><rp>)</rp></ruby>は<ruby>良<rp>(</rp><rt>よ</rt><rp>)</rp></ruby>い<ruby>天気<rp>(</rp><rt>てんき</rt><rp>)</rp></ruby>です
```

This will display as: 今日(きょう)は良(よ)い天気(てんき)です with furigana above the kanji. 