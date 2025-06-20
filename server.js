const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

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
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const data = querystring.parse(body);
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
    let rows = users.map(u => `<tr><td>${u.name||''}</td><td>${u.email||''}</td><td>${u.answer||''}</td></tr>`).join('\n');
    let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>管理员面板</title>
<style>
body{font-family:Arial, sans-serif;margin:40px;}
table{border-collapse:collapse;width:100%;}
th,td{border:1px solid #ddd;padding:8px;}
</style>
</head>
<body>
<h1>管理员面板</h1>
<table>
<tr><th>姓名</th><th>电子邮件</th><th>答案</th></tr>
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
