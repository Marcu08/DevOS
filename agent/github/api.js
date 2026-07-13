const https = require("https");

const API_BASE = "api.github.com";

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const opts = {
      hostname: API_BASE,
      path: endpoint,
      method: "GET",
      headers: {
        "User-Agent": "DevOS/1.4.0",
        Accept: "application/vnd.github.v3+json",
      },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try {
          if (res.statusCode >= 400) {
            resolve({ error: true, status: res.statusCode, message: body.slice(0, 200) });
          } else {
            resolve(JSON.parse(body));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function post(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const data = JSON.stringify(payload);
    const opts = {
      hostname: API_BASE,
      path: endpoint,
      method: "POST",
      headers: {
        "User-Agent": "DevOS/1.4.0",
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try {
          if (res.statusCode >= 400) {
            resolve({ error: true, status: res.statusCode, message: body.slice(0, 200) });
          } else {
            resolve(JSON.parse(body));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function isAuthenticated() {
  return !!getToken();
}

module.exports = { get, post, isAuthenticated };
