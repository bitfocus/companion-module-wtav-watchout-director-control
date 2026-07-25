'use strict';
// HTTP client for the WTAV Director Control /api/v1 semantic API. apiUrl() is pure
// (unit-tested); getJson/postJson use Node 22's global fetch with a short timeout,
// and NEVER throw — a dead surface resolves to null so the caller can flag status.

function apiUrl(config, path) {
  const host = (config && config.host) || '127.0.0.1';
  const port = (config && config.port != null && config.port !== '') ? String(config.port) : '3333';
  const p = String(path || '');
  return 'http://' + host + ':' + port + '/api/v1' + (p.charAt(0) === '/' ? p : '/' + p);
}

function withTimeout(ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms || 2500);
  return { signal: ac.signal, done: () => clearTimeout(t) };
}

async function getJson(url, timeoutMs) {
  const to = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', signal: to.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; } finally { to.done(); }
}

// Writes are fire-and-forget on the app side (HTTP 202). We still return the
// parsed body so an action can log it, but a 202 with ok:true is success.
async function postJson(url, body, timeoutMs) {
  const to = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: to.signal
    });
    let json = null; try { json = await res.json(); } catch (e) {}
    return { status: res.status, ok: res.status >= 200 && res.status < 300, json };
  } catch (e) { return { status: 0, ok: false, error: e.message }; } finally { to.done(); }
}

module.exports = { apiUrl, getJson, postJson };
