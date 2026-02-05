function base64UrlEncode(str) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fakeJwt(payload) {
  const header = { alg: "none", typ: "JWT" };
  return [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(payload)),
    "signature",
  ].join(".");
}

async function setAuthToken(page, payload) {
  const token = fakeJwt(payload);
  await page.addInitScript((t) => {
    window.localStorage.setItem("token", t);
  }, token);
  return token;
}

function corsHeaders(request, extra = {}) {
  const origin = request.headers()?.origin || "http://localhost:3000";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-expose-headers": "x-total-count",
    ...extra,
  };
}

async function fulfillCorsOptions(route, request) {
  return route.fulfill({
    status: 204,
    headers: corsHeaders(request),
    body: "",
  });
}

module.exports = {
  base64UrlEncode,
  fakeJwt,
  setAuthToken,
  corsHeaders,
  fulfillCorsOptions,
};

