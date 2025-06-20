const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const PORT = process.env.PORT || 3000;

function serveStatic(res, filePath, contentType='text/html') {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('未找到');
    } else {
      res.writeHead(200, {'Content-Type': contentType});
      res.end(data);
    }
  });
}

function handleForm(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    let data;
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      try { data = JSON.parse(body); } catch(e) { data = {}; }
    } else {
      data = {};
      body.split('&').forEach(pair => {
        const [k,v] = pair.split('=');
        data[decodeURIComponent(k)] = decodeURIComponent(v||'');
      });
    }
    fs.readFile(DATA_FILE, (err, file) => {
      let users = [];
      if (!err) {
        try { users = JSON.parse(file); } catch(e) {}
      }
      users.push(data);
      fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), err => {
        if (err) console.error(err);
        res.writeHead(302, { 'Location': '/thanks.html' });
        res.end();
      });
    });
  });
}

function serveAdmin(res) {
  fs.readFile(DATA_FILE, (err, file) => {
    let users = [];
    if (!err) {
      try { users = JSON.parse(file); } catch(e) {}
    }
    let rows = users.map(u => {
      let ans = '';
      if (u.answers && typeof u.answers === 'object' && !Array.isArray(u.answers)) {
        ans = Object.entries(u.answers).map(([k,v]) => Array.isArray(v) ? `${k}:${v.join('、')}` : `${k}:${v}`).join('；');
      } else if (Array.isArray(u.answers)) {
        ans = u.answers.join('；');
      } else {
        ans = u.answers || '';
      }
      return `<tr><td>${u.name||''}</td><td>${u.email||''}</td><td>${u.wechat||''}</td><td>${u.phone||''}</td><td>${ans}</td></tr>`;
    }).join('\n');
    let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>管理员面板</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:20px;background:#f2f2f7;}
table{border-collapse:collapse;width:100%;background:#fff;}
th,td{border:1px solid #ddd;padding:8px;text-align:left;}
th{background:#fafafa;}
</style>
</head>
<body>
<h1>管理员面板</h1>
<table>
<tr><th>姓名</th><th>电子邮件</th><th>微信号</th><th>手机号</th><th>答案</th></tr>
${rows}
</table>
</body>
</html>`;
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    if (req.url === '/' || req.url === '/index.html') {
      serveStatic(res, path.join(__dirname, 'public', 'index.html'));
    } else if (req.url === '/thanks.html') {
      serveStatic(res, path.join(__dirname, 'public', 'thanks.html'));
    } else if (req.url === '/style.css') {
      serveStatic(res, path.join(__dirname, 'public', 'style.css'), 'text/css');
    } else if (req.url === '/admin') {
      serveAdmin(res);
    } else {
      res.writeHead(404);
      res.end('未找到');
    }
  } else if (req.method === 'POST' && req.url === '/submit') {
    handleForm(req, res);
  } else {
    res.writeHead(404);
    res.end('未找到');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
