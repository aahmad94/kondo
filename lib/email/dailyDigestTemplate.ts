import { formatResponseHTML, formatResponseText, type EmailResponse, type EmailFormatOptions } from './format';

/**
 * Generate HTML template for daily digest email
 */
export async function generateDailyDigestHTML(userName: string, responses: any[], userId: string, isTest: boolean = false, unsubscribeToken?: string): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Get user's language preference for proper formatting
  const { getUserLanguageCode } = await import('./emailService');
  const userLanguageCode = await getUserLanguageCode(userId);
  const formatOptions: EmailFormatOptions = {
    selectedLanguage: userLanguageCode,
    isPhoneticEnabled: true,
    isKanaEnabled: true
  };

  const testBadge = isTest ? `<div style="background:#000;color:#fff;padding:8px 16px;text-align:center;margin-bottom:20px;font-size:14px;font-weight:bold">This is a test email</div>` : '';

  const responsesHTML = responses.map((response: EmailResponse, index: number) => {
    const contentHTML = formatResponseHTML(response, formatOptions);
    
    return `<div style="border-left:3px solid #000;padding:15px;margin:15px 0">
<div style="font-weight:bold;margin-bottom:8px;color:#000">${index + 1}</div>
${contentHTML}
</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${currentDate} Dojo Report</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#000">
<!-- Email ID: ${Date.now()} -->
${testBadge}
<div style="text-align:center;margin-bottom:30px">
<h1 style="color:#000">Dojo Report<br/>${currentDate}</h1>
</div>
${responsesHTML}
<div style="text-align:center;margin:30px 0">
<a href="https://kondoai.com" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block">Continue Learning on Kondo</a>
</div>
<div style="border-top:1px solid #ccc;padding-top:20px;text-align:center;font-size:12px;color:#000">
<p style="color:#000">You're receiving this because you subscribed to Kondo daily updates.</p>
${unsubscribeToken ? `<p style="color:#000"><a href="https://kondoai.com/unsubscribe?token=${unsubscribeToken}" style="color:#000">Unsubscribe</a></p>` : ''}
</div>
</body>
</html>`;
}

/**
 * Generate plain text template for daily digest email
 */
export async function generateDailyDigestText(responses: any[], userId: string, unsubscribeToken?: string): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Get user's language preference for proper formatting
  const { getUserLanguageCode } = await import('./emailService');
  const userLanguageCode = await getUserLanguageCode(userId);
  const formatOptions: EmailFormatOptions = {
    selectedLanguage: userLanguageCode,
    isPhoneticEnabled: true,
    isKanaEnabled: true
  };
  
  const responsesText = responses.map((response: EmailResponse, index: number) => {
    const contentText = formatResponseText(response, formatOptions);
    
    return `${index + 1}. ${contentText}`;
  }).join('\n\n');

  const unsubscribeText = unsubscribeToken 
    ? `\nUnsubscribe: https://kondoai.com/unsubscribe?token=${unsubscribeToken}` 
    : '';

  return `
🪶 Dojo Report
${currentDate}

${responsesText}

Continue learning: https://kondoai.com

---
You're receiving this because you subscribed to Kondo daily updates.${unsubscribeText}
  `;
}
