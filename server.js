const http = require('http');
const fs = require('fs');
const path = require('path');

// ----------------------- Analysis Model -----------------------
const ANALYSIS_MODEL = {
  dimensions: [
    {
      name: 'profile_experience',
      label: '创作资历',
      question_ids: [1],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { novice: [0, 2], intermediate: [3, 3], expert: [4, 5] },
      risk_mapping: { novice: 'yellow', intermediate: 'green', expert: 'blue' }
    },
    {
      name: 'channel_diversity',
      label: '渠道多样性',
      question_ids: [2],
      option_weights: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 },
      aggregation: 'count',
      thresholds: { single: [0, 1], few: [2, 3], multi: [4, 6] },
      risk_mapping: { single: 'yellow', few: 'green', multi: 'green' }
    },
    {
      name: 'audience_size',
      label: '粉丝规模',
      question_ids: [3],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { small: [0, 2], mid: [3, 3], large: [4, 5] },
      risk_mapping: { small: 'yellow', mid: 'green', large: 'green' }
    },
    {
      name: 'content_frequency',
      label: '产出活跃度',
      question_ids: [4],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { low: [0, 2], medium: [3, 3], high: [4, 5] },
      risk_mapping: { low: 'yellow', medium: 'green', high: 'green' }
    },
    {
      name: 'pain_point_intensity',
      label: '痛点复杂度',
      question_ids: [5],
      option_weights: { A: 1, B: 1, C: 1, D: 1, E: 1 },
      aggregation: 'count',
      thresholds: { low: [0, 1], medium: [2, 3], high: [4, 5] },
      risk_mapping: { high: 'red', medium: 'yellow', low: 'green' }
    },
    {
      name: 'knowledge_score',
      label: '身心灵知识水平',
      question_ids: [6],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { low: [0, 2], medium: [3, 3], high: [4, 5] },
      risk_mapping: { low: 'yellow', medium: 'green', high: 'green' }
    },
    {
      name: 'ai_usage_freq',
      label: 'AI 使用频率',
      question_ids: [8],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { low: [0, 2], medium: [3, 3], high: [4, 5] },
      risk_mapping: { low: 'yellow', medium: 'green', high: 'green' }
    },
    {
      name: 'ai_tools_span',
      label: 'AI 工具广度',
      question_ids: [9],
      option_weights: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 },
      aggregation: 'count',
      thresholds: { narrow: [0, 1], standard: [2, 3], broad: [4, 6] },
      risk_mapping: { narrow: 'yellow', standard: 'green', broad: 'green' }
    },
    {
      name: 'growth_ambition',
      label: '增长目标',
      question_ids: [15],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { conservative: [0, 2], balanced: [3, 3], aggressive: [4, 5] },
      risk_mapping: { aggressive: 'orange', balanced: 'green', conservative: 'blue' }
    },
    {
      name: 'budget_capacity',
      label: '预算能力',
      question_ids: [12],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { low: [0, 2], medium: [3, 3], high: [4, 5] },
      risk_mapping: { low: 'red', medium: 'yellow', high: 'green' }
    },
    {
      name: 'competition_risk',
      label: '竞争焦虑度',
      question_ids: [21],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { low: [0, 2], medium: [3, 3], high: [4, 5] },
      risk_mapping: { high: 'red', medium: 'yellow', low: 'green' }
    },
    {
      name: 'brand_clarity',
      label: '品牌定位清晰度',
      question_ids: [22],
      option_weights: { A: 1, B: 2, C: 3, D: 4, E: 5 },
      thresholds: { unclear: [0, 2], moderate: [3, 3], clear: [4, 5] },
      risk_mapping: { unclear: 'yellow', moderate: 'green', clear: 'green' }
    }
  ],
  composite_rules: [
    {
      name: 'ambition_knowledge_gap',
      formula: 'growth_ambition - knowledge_score',
      risk_logic: [
        { condition: '>=2', risk: 'red', comment: '增长目标高但身心灵知识储备不足' },
        { condition: '<=-2', risk: 'blue', comment: '知识丰富但增长目标较低，可能存在加速空间' }
      ]
    },
    {
      name: 'budget_vs_ambition',
      formula: 'growth_ambition - budget_capacity',
      risk_logic: [
        { condition: '>=2', risk: 'orange', comment: '预算不足以支撑高增长目标' }
      ]
    }
  ]
};

// Mapping of question id to dimension name and options
const QUESTION_MAP = {
  1: { key: 'profile_experience', type: 'single', options: ['少于 1 年','1–3 年','3–5 年','5–10 年','10 年以上'] },
  2: { key: 'channel_mix', type: 'multi', options: ['小红书','抖音 / TikTok','公众号','B 站 / YouTube','Podcast / 音频平台','其他'] },
  3: { key: 'audience_size', type: 'single', options: ['<1,000','1,000–10,000','1–5 万','5–20 万','20 万以上'] },
  4: { key: 'content_frequency', type: 'single', options: ['<4 条','4–8 条','9–15 条','16–30 条','30 条以上'] },
  5: { key: 'pain_points', type: 'multi', options: ['时间管理','选题灵感枯竭','剪辑 / 技术难题','流量获取困难','变现方案不足'] },
  6: { key: 'industry_knowledge', type: 'single', options: ['完全小白','入门了解','基础熟悉','深度学习','行业专家'] },
  8: { key: 'ai_usage', type: 'single', options: ['从不','偶尔尝试','每月使用','每周使用','每日使用'] },
  9: { key: 'ai_tools', type: 'multi', options: ['文案 / 脚本生成','图像生成','视频生成 / 剪辑','语音合成 / 配音','数据分析 / 选题洞察','自动化运营（RPA）'] },
  12:{ key: 'budget', type: 'single', options: ['<$1,000','$1,000–3,000','$3,000–10,000','$10,000–30,000','>$30,000'] },
  15:{ key: 'income_goal', type: 'single', options: ['<$1,000','$1,000–5,000','$5,000–20,000','$20,000–50,000','>$50,000'] },
  21:{ key: 'competition_risk', type: 'single', options: ['毫无担忧','轻度担忧','中度担忧','较高担忧','极度担忧'] },
  22:{ key: 'brand_clarity', type: 'single', options: ['完全不清晰','初步模糊','有基本方向','较为清晰','非常清晰'] },
  30:{ key: 'open_challenge', type: 'open' }
};

function letterForAnswer(qid, answer) {
  const info = QUESTION_MAP[qid];
  if (!info || !info.options) return null;
  const idx = info.options.indexOf(answer);
  if (idx === -1) return null;
  return String.fromCharCode(65 + idx); // A,B,C...
}

function computeDimension(userAnswers, model) {
  const vals = [];
  for (const qid of model.question_ids) {
    const q = QUESTION_MAP[qid];
    const ans = userAnswers[q.key];
    if (ans === undefined) continue;
    if (model.aggregation === 'count') {
      if (Array.isArray(ans)) vals.push(ans.length);
      else if (ans) vals.push(1);
    } else {
      if (Array.isArray(ans)) {
        let sum = 0;
        ans.forEach(a => {
          const letter = letterForAnswer(qid, a);
          if (letter && model.option_weights[letter] !== undefined) sum += model.option_weights[letter];
        });
        if (ans.length) vals.push(sum / ans.length);
      } else {
        const letter = letterForAnswer(qid, ans);
        if (letter && model.option_weights[letter] !== undefined) vals.push(model.option_weights[letter]);
      }
    }
  }
  if (!vals.length) return null;
  let score;
  if (model.aggregation === 'count') {
    score = vals.reduce((a,b)=>a+b,0);
  } else {
    score = vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  let level = '';
  for (const [lvl,range] of Object.entries(model.thresholds||{})) {
    if (score >= range[0] && score <= range[1]) level = lvl;
  }
  const risk_flag = model.risk_mapping ? model.risk_mapping[level] : '';
  return { label:model.label, name:model.name, score:score.toFixed(2), level, risk_flag };
}

function evaluateCondition(val, cond) {
  try { return Function('v', `return v ${cond}`)(val); } catch(e) { return false; }
}

function computeAnalysis(user) {
  const dims = [];
  ANALYSIS_MODEL.dimensions.forEach(m => {
    const d = computeDimension(user.answers||{}, m);
    if (d) dims.push(d);
  });
  const dimMap = Object.fromEntries(dims.map(d => [d.name, parseFloat(d.score)]));
  const composites = [];
  ANALYSIS_MODEL.composite_rules.forEach(r => {
    const formula = r.formula.replace(/([a-z_]+)/g, k => dimMap[k] !== undefined ? dimMap[k] : 0);
    let value = 0;
    try { value = eval(formula); } catch(e) {}
    let risk = '', comment = '';
    for (const rl of r.risk_logic) {
      if (evaluateCondition(value, rl.condition)) { risk = rl.risk; comment = rl.comment; break; }
    }
    composites.push({name:r.name,value,risk,comment});
  });
  const openAnswer = (user.answers||{}).open_challenge || '';
  return { dims, composites, openAnswer };
}
// ---------------------------------------------------------------

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
    let rows = users.map((u,idx) => {
      let ans = '';
      if (u.answers && typeof u.answers === 'object' && !Array.isArray(u.answers)) {
        ans = Object.entries(u.answers).map(([k,v]) => Array.isArray(v) ? `${k}:${v.join('、')}` : `${k}:${v}`).join('；');
      } else if (Array.isArray(u.answers)) {
        ans = u.answers.join('；');
      } else {
        ans = u.answers || '';
      }
      return `<tr><td>${u.name||''}</td><td>${u.email||''}</td><td>${u.wechat||''}</td><td>${u.phone||''}</td><td>${ans}</td><td><a href="/analysis?id=${idx}">查看详情</a></td></tr>`;
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
<tr><th>姓名</th><th>电子邮件</th><th>微信号</th><th>手机号</th><th>答案</th><th></th></tr>
${rows}
</table>
</body>
</html>`;
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
  });
}

function serveAnalysis(res, id) {
  fs.readFile(DATA_FILE, (err, file) => {
    let users = [];
    if (!err) {
      try { users = JSON.parse(file); } catch(e) {}
    }
    const user = users[id];
    if (!user) {
      res.writeHead(404, {'Content-Type':'text/plain'});
      res.end('未找到用户');
      return;
    }
    const result = computeAnalysis(user);
    const rows = result.dims.map(d=>`<tr><td>${d.label}</td><td>${d.score}</td><td>${d.level}</td><td>${d.risk_flag}</td></tr>`).join('\n');
    const comps = result.composites.map(c=>`<li>${c.name} - ${c.comment||''} 风险:${c.risk}</li>`).join('\n');
    let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>分析报告</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:20px;background:#f2f2f7;}table{border-collapse:collapse;width:100%;background:#fff;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#fafafa;}</style>
</head><body>
<h1>分析报告</h1>
<h2>${user.name||''}</h2>
<table>
<tr><th>维度</th><th>分数</th><th>等级</th><th>风险</th></tr>
${rows}
</table>
<h3>综合洞察</h3>
<ul>${comps}</ul>
<h3>开放反馈</h3>
<pre>${result.openAnswer}</pre>
</body></html>`;
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
    } else if (req.url.startsWith('/analysis')) {
      const url = new URL(req.url, 'http://localhost');
      const id = parseInt(url.searchParams.get('id'), 10);
      serveAnalysis(res, isNaN(id)?-1:id);
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
