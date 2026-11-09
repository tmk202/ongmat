/**
 * Shared server-side handler for POST /api/lead
 * Works in both Cloudflare Workers (`src/worker.js`) and Node/Vite Dev Server (`astro.config.mjs`).
 * Dispatches enterprise lead submissions to Telegram Bot API and Gmail.
 */

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function processLeadSubmission(payload, env = {}) {
  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim();
  const telegram = String(payload?.telegram || '').trim();
  const warehouse = String(payload?.warehouse || 'Snowflake / BigQuery').trim();
  const platforms = Array.isArray(payload?.platforms)
    ? payload.platforms.map((p) => String(p).trim()).filter(Boolean)
    : ['Shopee', 'TikTok Shop', 'Amazon'];
  const message = String(payload?.message || '').trim();
  const submittedAt = new Date().toISOString();

  if (!name || !email) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Please provide both your Name/Company and Work Email.',
      },
    };
  }

  const botToken = env.TELEGRAM_BOT_TOKEN || '';
  const chatId = env.TELEGRAM_CHAT_ID || '';
  const notifyEmail = env.LEAD_NOTIFICATION_EMAIL || 'giadung8686@gmail.com';
  const resendApiKey = env.RESEND_API_KEY || '';
  const gasWebhookUrl = env.GAS_WEBHOOK_URL || '';

  const platformStr = platforms.length > 0 ? platforms.join(', ') : 'All Marketplaces';

  const telegramHtml = [
    `🐝 <b>NEW ENTERPRISE DATA LEAD — ecommarketdata</b>`,
    ``,
    `👤 <b>Client / Company:</b> ${escapeHtml(name)}`,
    `📧 <b>Work Email:</b> ${escapeHtml(email)}`,
    `💬 <b>Telegram / Phone:</b> ${escapeHtml(telegram || 'N/A')}`,
    `🛒 <b>Marketplaces:</b> ${escapeHtml(platformStr)}`,
    `🗄️ <b>Target Stack:</b> ${escapeHtml(warehouse)}`,
    `📝 <b>Scope / Notes:</b> ${escapeHtml(message || 'Requesting sample dataset & SLA consultation')}`,
    `⏱️ <b>Timestamp:</b> ${escapeHtml(submittedAt)}`,
  ].join('\n');

  const results = {
    telegram: 'skipped',
    gmail: 'skipped',
  };

  // 1. Send to Telegram Bot API if configured
  if (botToken && chatId) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      results.telegram = tgRes.ok ? 'sent' : `error_${tgRes.status}`;
    } catch {
      results.telegram = 'network_error';
    }
  }

  // 2. Send to Gmail via Google Apps Script Webhook, Resend API, or FormSubmit AJAX
  if (gasWebhookUrl) {
    try {
      const gasRes = await fetch(gasWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: notifyEmail,
          subject: `[ecommarketdata] Enterprise Lead: ${name}`,
          name,
          email,
          telegram,
          platforms: platformStr,
          warehouse,
          message,
          submittedAt,
        }),
      });
      if (gasRes.ok) results.gmail = 'sent_webhook';
    } catch {
      // continue to fallback
    }
  }

  if (results.gmail === 'skipped' && resendApiKey) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ecommarketdata Leads <onboarding@resend.dev>',
          to: [notifyEmail],
          reply_to: email,
          subject: `[ecommarketdata] New Enterprise Lead: ${name} (${platformStr})`,
          html: `
            <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #dbe4ff; border-radius: 12px;">
              <h2 style="color: #1129e2; margin-top: 0;">New Enterprise Data Request</h2>
              <p><strong>Client / Company:</strong> ${escapeHtml(name)}</p>
              <p><strong>Work Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
              <p><strong>Telegram / Phone:</strong> ${escapeHtml(telegram || 'N/A')}</p>
              <p><strong>Marketplaces:</strong> ${escapeHtml(platformStr)}</p>
              <p><strong>Target Warehouse / Stack:</strong> ${escapeHtml(warehouse)}</p>
              <p><strong>Data Scope / Message:</strong><br/>${escapeHtml(message || 'Requesting sample dataset & SLA consultation')}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <small style="color: #64748b;">Submitted at ${escapeHtml(submittedAt)} via ecommarketdata.com</small>
            </div>
          `,
        }),
      });
      if (resendRes.ok) results.gmail = 'sent_resend';
    } catch {
      // continue to fallback
    }
  }

  // Fallback / Direct Gmail relay via FormSubmit AJAX
  if (results.gmail === 'skipped' && notifyEmail) {
    try {
      const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://ecommarketdata.com',
          Referer: 'https://ecommarketdata.com/',
        },
        body: JSON.stringify({
          _subject: `[ecommarketdata] Enterprise Lead: ${name} (${platformStr})`,
          _template: 'table',
          Client_Company: name,
          Work_Email: email,
          Telegram_Phone: telegram || 'N/A',
          Marketplaces: platformStr,
          Target_Stack: warehouse,
          Data_Scope: message || 'Sample dataset & SLA consultation',
          Submitted_At: submittedAt,
        }),
      });
      results.gmail = fsRes.ok ? 'sent_formsubmit' : 'queued';
    } catch {
      results.gmail = 'queued';
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      notifyEmail,
      channels: results,
    },
  };
}
