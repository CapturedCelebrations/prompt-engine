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

  // If Mailchimp is configured, subscribe them
  if (API_KEY && LIST_ID) {
    try {
      const DC = API_KEY.split('-').pop(); // e.g. "us21"
      const response = await fetch(
        `https://${DC}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa('anystring:' + API_KEY)}`
          },
          body: JSON.stringify({
            email_address: email,
            status: 'subscribed',
            merge_fields: { FNAME: name || '' },
            tags: ['prompt-engine', 'expo-2025']
          })
        }
      );

      const data = await response.json();
      
      // Already subscribed is fine
      if (response.ok || data.title === 'Member Exists') {
        return res.status(200).json({ success: true });
      }
      
      console.error('Mailchimp error:', data);
      // Still let them through even if Mailchimp fails
      return res.status(200).json({ success: true, warning: 'Email noted' });
    } catch (err) {
      console.error('Mailchimp error:', err);
      return res.status(200).json({ success: true, warning: 'Email noted' });
    }
  }

  // No Mailchimp configured - still let them through
  // Emails will be logged in Vercel's runtime logs
  console.log('EMAIL_SIGNUP:', email, name || '');
  return res.status(200).json({ success: true, warning: 'No email service configured - check Vercel logs' });
}
