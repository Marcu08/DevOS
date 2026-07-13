const https = require("https");

const hostname = process.env.DEVOS_AI_HOST;
const apiPath = process.env.DEVOS_AI_PATH;
const authHeader = process.env.DEVOS_AI_AUTH;
const apiKey = process.env.DEVOS_AI_KEY;
const body = process.env.DEVOS_AI_BODY;

if (!hostname || !apiPath || !authHeader || !apiKey || !body) {
  process.stderr.write("Missing required env vars");
  process.exit(1);
}

const headers = { "content-type": "application/json" };
headers[authHeader] = authHeader === "Authorization" ? `Bearer ${apiKey}` : apiKey;

const ver = process.env.DEVOS_AI_VER;
if (ver) {
  const parts = ver.split(":");
  if (parts.length === 2) headers[parts[0]] = parts[1];
}

const data = [];
const req = https.request({ hostname, path: apiPath, method: "POST", headers }, (res) => {
  res.on("data", (c) => data.push(c));
  res.on("end", () => process.stdout.write(Buffer.concat(data)));
});
req.on("error", (e) => { process.stderr.write(e.message); process.exit(1); });
req.write(body);
req.end();
