export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const LIST_ID = process.env.MAILCHIMP_LIST_ID;

  if (API_KEY && LIST_ID) {
    try {
      const DC = API_KEY.split('-').pop();
      const authString = Buffer.from('anystring:' + API_KEY).toString('base64');

      // Step 1: Add/update the member
      const response = await fetch(
        `https://${DC}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + authString
          },
          body: JSON.stringify({
            email_address: email,
            status: 'subscribed',
            merge_fields: { FNAME: name || '' }
          })
        }
      );

      const data = await response.json();
      console.log('Mailchimp add response:', response.status, JSON.stringify(data));

      // Step 2: Add tag (separate API call — Mailchimp requires this)
      const emailHash = await md5(email.toLowerCase().trim());
      await fetch(
        `https://${DC}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${emailHash}/tags`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + authString
          },
          body: JSON.stringify({
            tags: [{ name: 'prompt-engine', status: 'active' }]
          })
        }
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Mailchimp error:', err.message || err);
      return res.status(200).json({ success: true, warning: 'Email noted' });
    }
  }

  console.log('EMAIL_SIGNUP:', email, name || '');
  return res.status(200).json({ success: true, warning: 'No email service configured' });
}

// Simple MD5 hash for Mailchimp subscriber hash
async function md5(str) {
  const { createHash } = await import('crypto');
  return createHash('md5').update(str).digest('hex');
}
