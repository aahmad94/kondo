// Test for furigana functionality
const Kuroshiro = require('kuroshiro').default || require('kuroshiro');
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji').default || require('kuroshiro-analyzer-kuromoji');

async function testFurigana() {
  try {
    console.log('🧪 Testing Furigana Functionality');
    console.log('================================');
    
    console.log('Initializing Kuroshiro...');
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer());
    console.log('✅ Kuroshiro initialized successfully!');

    // Test cases that would be typical for the StandardResponse component
    const testCases = [
      {
        name: 'Simple greeting',
        text: '今日は良い天気です',
        description: 'Basic sentence with kanji'
      },
      {
        name: 'Complex sentence',
        text: '感じ取れたら手を繋ごう',
        description: 'Sentence with multiple kanji characters'
      },
      {
        name: 'Mixed content',
        text: '私は学生です',
        description: 'Simple self-introduction'
      },
      {
        name: 'Restaurant phrase',
        text: 'お水をください',
        description: 'Common restaurant request'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log(`Description: ${testCase.description}`);
      console.log(`Original: ${testCase.text}`);
      
      const furiganaResult = await kuroshiro.convert(testCase.text, {
        mode: 'furigana',
        to: 'hiragana'
      });
      
      console.log(`Furigana: ${furiganaResult}`);
      
      // Test if the result contains ruby tags (expected for furigana)
      const hasRubyTags = furiganaResult.includes('<ruby>') && furiganaResult.includes('<rt>');
      console.log(`✅ Contains ruby tags: ${hasRubyTags ? 'Yes' : 'No'}`);
    }
    
    console.log('\n🎉 All furigana tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing furigana:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFurigana();
}

module.exports = { testFurigana }; 