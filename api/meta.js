// api/meta.js — Meta Graph API proxy

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN   = process.env.META_ACCESS_TOKEN;
  const ACCOUNT = process.env.META_AD_ACCOUNT_ID; // without act_ prefix
  const BASE    = 'https://graph.facebook.com/v20.0';

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({ error: 'META_ACCESS_TOKEN or META_AD_ACCOUNT_ID not configured.' });
  }

  const INSIGHT_FIELDS = [
    'spend', 'impressions', 'reach', 'frequency',
    'clicks', 'unique_clicks', 'ctr', 'cpc', 'cpm',
    'actions', 'cost_per_action_type',
    'purchase_roas', 'action_values'
  ].join(',');

  // ── GET — fetch campaigns / adsets / ads / account overview ──
  if (req.method === 'GET') {
    const { type, id, date_preset } = req.query;
    const dp = date_preset || 'last_30d';
    let url = '';

    if (type === 'campaigns') {
      url = `${BASE}/act_${ACCOUNT}/campaigns`
          + `?fields=id,name,status,objective,daily_budget,lifetime_budget,budget_remaining`
          + `,insights.date_preset(${dp}){${INSIGHT_FIELDS}}`
          + `&limit=50&access_token=${TOKEN}`;
    } else if (type === 'adsets') {
      url = `${BASE}/${id}/adsets`
          + `?fields=id,name,status,campaign_id,daily_budget,lifetime_budget`
          + `,bid_amount,bid_strategy,start_time,end_time`
          + `,insights.date_preset(${dp}){${INSIGHT_FIELDS}}`
          + `&limit=50&access_token=${TOKEN}`;
    } else if (type === 'ads') {
      url = `${BASE}/${id}/ads`
          + `?fields=id,name,status,adset_id`
          + `,creative{thumbnail_url,body,title,call_to_action}`
          + `,insights.date_preset(${dp}){${INSIGHT_FIELDS}}`
          + `&limit=50&access_token=${TOKEN}`;
    } else if (type === 'account') {
      url = `${BASE}/act_${ACCOUNT}/insights`
          + `?fields=${INSIGHT_FIELDS}&date_preset=${dp}&access_token=${TOKEN}`;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: campaigns, adsets, ads, account' });
    }

    try {
      const r    = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST — update campaign / adset / ad ──
  if (req.method === 'POST') {
    const { action, objectId, fields } = req.body || {};

    if (action !== 'update' || !objectId || !fields) {
      return res.status(400).json({ error: 'Requires: action="update", objectId, fields' });
    }

    try {
      const body = new URLSearchParams({ ...fields, access_token: TOKEN });
      const r    = await fetch(`${BASE}/${objectId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
      });
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
