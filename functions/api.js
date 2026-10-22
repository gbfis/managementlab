/**
 * Cloudflare Pages Function — /api proxy ke Google Apps Script
 *
 * Browser tidak bisa fetch GAS langsung karena GAS redirect POST→GET
 * ke script.googleusercontent.com yang berbeda origin (CORS block).
 *
 * Solusi: semua request frontend dikirim ke /api (same-origin, tidak ada CORS),
 * lalu function ini forward ke GAS dari sisi server — tidak ada CORS issue
 * karena server-to-server tidak dibatasi browser CORS policy.
 *
 * Route: POST /api → forward ke GAS_API_URL env variable
 */
export async function onRequestPost(context) {
  const gasUrl = context.env.GAS_API_URL;

  if (!gasUrl) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'GAS_API_URL tidak dikonfigurasi di Cloudflare env' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Baca body dari request browser
    const body = await context.request.text();

    // Forward ke GAS — server-to-server, bebas CORS
    const gasResp = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'CloudflarePages-Proxy/1.0'
      },
      body: body,
      redirect: 'follow'
    });

    const responseText = await gasResp.text();

    // Kembalikan ke browser dengan CORS header yang benar
    return new Response(responseText, {
      status: gasResp.ok ? 200 : gasResp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'PROXY_ERROR', message: 'Gagal menghubungi server: ' + err.message } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle preflight OPTIONS (tidak diperlukan untuk same-origin, tapi untuk jaga-jaga)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
