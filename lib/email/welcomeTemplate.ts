/**
 * Welcome email template with black and white theme
 */
export function generateWelcomeEmailHTML(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Welcome to Kondo</title>
    </head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#000;background:#fff">
      <div style="text-align:center;margin-bottom:30px">
        <h1 style="color:#000;margin-bottom:10px">🥋 Welcome to Kondo!</h1>
        <p style="color:#000;font-size:18px">Your Daily Language Learning Journey Begins</p>
      </div>
      
      <div style="border-left:3px solid #000;padding:20px;margin-bottom:20px">
        <p>Hi ${userName},</p>
        <p>Thank you for subscribing to Kondo's daily email updates! You'll now receive personalized language learning content from your Dojo directly in your inbox.</p>
        
        <h3 style="color:#000;margin-top:20px">What to expect:</h3>
        <ul style="margin:10px 0">
          <li>📚 Daily curated content from your bookmarks</li>
          <li>🎯 Personalized to your learning level</li>
          <li>🌐 Support for multiple languages</li>
          <li>📱 Mobile-friendly format</li>
        </ul>
      </div>
      
      <div style="text-align:center;margin:30px 0">
        <a href="https://kondoai.com" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block">Visit Kondo</a>
      </div>
      
      <div style="border-top:1px solid #ccc;padding-top:20px;text-align:center;font-size:12px">
        <p>Happy learning!</p>
        <p>The Kondo Team</p>
      </div>
    </body>
    </html>
  `;
}

export function generateWelcomeEmailText(userName: string): string {
  return `
🥋 Welcome to Kondo!

Hi ${userName},

Thank you for subscribing to Kondo's daily email updates! You'll now receive personalized language learning content from your Dojo directly in your inbox.

What to expect:
- Daily curated content from your bookmarks
- Personalized to your learning level  
- Support for multiple languages
- Mobile-friendly format

Visit Kondo: https://kondoai.com

Happy learning!
The Kondo Team
  `;
}
