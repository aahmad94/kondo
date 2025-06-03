// Simple test for furigana functionality
const Kuroshiro = require('kuroshiro').default || require('kuroshiro');
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji').default || require('kuroshiro-analyzer-kuromoji');

async function testFurigana() {
  try {
    console.log('Initializing Kuroshiro...');
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer());
    console.log('Kuroshiro initialized successfully!');

    // Test with a simple Japanese sentence
    const testText = '感じ取れたら手を繋ごう';
    console.log('Original text:', testText);

    const furiganaResult = await kuroshiro.convert(testText, {
      mode: 'furigana',
      to: 'hiragana'
    });
    
    console.log('Furigana result:', furiganaResult);
    
    // Test with another example
    const testText2 = '今日は良い天気です';
    console.log('\nOriginal text 2:', testText2);
    
    const furiganaResult2 = await kuroshiro.convert(testText2, {
      mode: 'furigana',
      to: 'hiragana'
    });
    
    console.log('Furigana result 2:', furiganaResult2);
    
  } catch (error) {
    console.error('Error testing furigana:', error);
  }
}

testFurigana(); 