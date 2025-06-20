const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const PORT = process.env.PORT || 3000;

const questionOptions = {
  profile_experience: ['少于 1 年','1–3 年','3–5 年','5–10 年','10 年以上'],
  channel_mix: ['小红书','抖音 / TikTok','公众号','B 站 / YouTube','Podcast / 音频平台','其他'],
  audience_size: ['<1,000','1,000–10,000','1–5 万','5–20 万','20 万以上'],
  content_frequency: ['<4 条','4–8 条','9–15 条','16–30 条','30 条以上'],
  pain_points: ['时间管理','选题灵感枯竭','剪辑 / 技术难题','流量获取困难','变现方案不足'],
  industry_knowledge: ['完全小白','入门了解','基础熟悉','深度学习','行业专家'],
  ai_usage: ['从不','偶尔尝试','每月使用','每周使用','每日使用'],
  ai_tools: ['文案 / 脚本生成','图像生成','视频生成 / 剪辑','语音合成 / 配音','数据分析 / 选题洞察','自动化运营（RPA）'],
  income_goal: ['<$1,000','$1,000–5,000','$5,000–20,000','$20,000–50,000','>$50,000'],
  budget: ['<$1,000','$1,000–3,000','$3,000–10,000','$10,000–30,000','>$30,000'],
  competition_risk: ['毫无担忧','轻度担忧','中度担忧','较高担忧','极度担忧'],
  brand_clarity: ['完全不清晰','初步模糊','有基本方向','较为清晰','非常清晰']
};

const dimensionKeyMap = {
  profile_experience: 'profile_experience',
  channel_diversity: 'channel_mix',
  audience_size: 'audience_size',
  content_frequency: 'content_frequency',
  pain_point_intensity: 'pain_points',
  knowledge_score: 'industry_knowledge',
  ai_usage_freq: 'ai_usage',
  ai_tools_span: 'ai_tools',
  growth_ambition: 'income_goal',
  budget_capacity: 'budget',
  competition_risk: 'competition_risk',
  brand_clarity: 'brand_clarity'
};

const analysisModel = {
  scoring_policy: 'single: option_weights; multi: average; open: ignore',
  dimensions: [
    {
      name: 'profile_experience',
      label: '创作资历',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {novice:[0,2], intermediate:[3,3], expert:[4,5]},
      risk_mapping: {novice:'yellow', intermediate:'green', expert:'blue'}
    },
    {
      name: 'channel_diversity',
      label: '渠道多样性',
      option_weights: {A:1,B:1,C:1,D:1,E:1,F:1},
      aggregation: 'count',
      thresholds: {single:[0,1], few:[2,3], multi:[4,6]},
      risk_mapping: {single:'yellow', few:'green', multi:'green'}
    },
    {
      name: 'audience_size',
      label: '粉丝规模',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {small:[0,2], mid:[3,3], large:[4,5]},
      risk_mapping: {small:'yellow', mid:'green', large:'green'}
    },
    {
      name: 'content_frequency',
      label: '产出活跃度',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {low:[0,2], medium:[3,3], high:[4,5]},
      risk_mapping: {low:'yellow', medium:'green', high:'green'}
    },
    {
      name: 'pain_point_intensity',
      label: '痛点复杂度',
      option_weights: {A:1,B:1,C:1,D:1,E:1},
      aggregation: 'count',
      thresholds: {low:[0,1], medium:[2,3], high:[4,5]},
      risk_mapping: {high:'red', medium:'yellow', low:'green'}
    },
    {
      name: 'knowledge_score',
      label: '身心灵知识水平',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {low:[0,2], medium:[3,3], high:[4,5]},
      risk_mapping: {low:'yellow', medium:'green', high:'green'}
    },
    {
      name: 'ai_usage_freq',
      label: 'AI 使用频率',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {low:[0,2], medium:[3,3], high:[4,5]},
      risk_mapping: {low:'yellow', medium:'green', high:'green'}
    },
    {
      name: 'ai_tools_span',
      label: 'AI 工具广度',
      option_weights: {A:1,B:1,C:1,D:1,E:1,F:1},
      aggregation: 'count',
      thresholds: {narrow:[0,1], standard:[2,3], broad:[4,6]},
      risk_mapping: {narrow:'yellow', standard:'green', broad:'green'}
    },
    {
      name: 'growth_ambition',
      label: '增长目标',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {conservative:[0,2], balanced:[3,3], aggressive:[4,5]},
      risk_mapping: {aggressive:'orange', balanced:'green', conservative:'blue'}
    },
    {
      name: 'budget_capacity',
      label: '预算能力',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {low:[0,2], medium:[3,3], high:[4,5]},
      risk_mapping: {low:'red', medium:'yellow', high:'green'}
    },
    {
      name: 'competition_risk',
      label: '竞争焦虑度',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {low:[0,2], medium:[3,3], high:[4,5]},
      risk_mapping: {high:'red', medium:'yellow', low:'green'}
    },
    {
      name: 'brand_clarity',
      label: '品牌定位清晰度',
      option_weights: {A:1,B:2,C:3,D:4,E:5},
      thresholds: {unclear:[0,2], moderate:[3,3], clear:[4,5]},
      risk_mapping: {unclear:'yellow', moderate:'green', clear:'green'}
    }
  ],
  composite_rules: [
    {
      name: 'ambition_knowledge_gap',
      formula: 'growth_ambition - knowledge_score',
      risk_logic: [
        {condition: '>=2', risk: 'red', comment: '增长目标高但身心灵知识储备不足'},
        {condition: '<=-2', risk: 'blue', comment: '知识丰富但增长目标较低，可能存在加速空间'}
      ]
    },
    {
      name: 'budget_vs_ambition',
      formula: 'growth_ambition - budget_capacity',
      risk_logic: [
        {condition: '>=2', risk: 'orange', comment: '预算不足以支撑高增长目标'}
      ]
    }
  ]
};

function getOptionWeight(dimKey, answer) {
  const opts = questionOptions[dimKey] || [];
  const idx = opts.indexOf(answer);
  if (idx === -1) return 0;
  const letter = String.fromCharCode(65 + idx);
  return analysisModel.dimensions.find(d => dimensionKeyMap[d.name] === dimKey)?.option_weights[letter] || (idx+1);
}

function determineLevel(thresholds, score) {
  for (const [level, range] of Object.entries(thresholds)) {
    if (score >= range[0] && score <= range[1]) return level;
  }
  return '';
}

function computeAnalysis(answers) {
  const dimResults = {};
  analysisModel.dimensions.forEach(d => {
    const key = dimensionKeyMap[d.name];
    const ans = answers[key];
    let score = 0;
    if (Array.isArray(ans)) {
      if (d.aggregation === 'count') {
        score = ans.length;
      } else {
        const weights = ans.map(a => getOptionWeight(key, a));
        const sum = weights.reduce((acc,v)=>acc+v,0);
        score = weights.length ? sum/weights.length : 0;
      }
    } else if (typeof ans === 'string') {
      score = getOptionWeight(key, ans);
    }
    const level = determineLevel(d.thresholds, score);
    const risk_flag = d.risk_mapping[level] || '';
    dimResults[d.name] = {label:d.label, score, level, risk_flag};
  });

  const composite = analysisModel.composite_rules.map(r => {
    const formula = r.formula;
    const [left,right] = formula.split('-').map(s=>s.trim());
    const diff = (dimResults[left]?.score || 0) - (dimResults[right]?.score || 0);
    let result = {name:r.name, risk:'', comment:'', value:diff};
    for (const rl of r.risk_logic) {
      const condition = rl.condition;
      const num = parseFloat(condition.replace(/[<>!=]=?/,''));
      if (condition.startsWith('>=')) { if (diff >= num) {result.risk=rl.risk; result.comment=rl.comment; break;} }
      else if (condition.startsWith('<=')) { if (diff <= num) {result.risk=rl.risk; result.comment=rl.comment; break;} }
      else if (condition.startsWith('>')) { if (diff > num) {result.risk=rl.risk; result.comment=rl.comment; break;} }
      else if (condition.startsWith('<')) { if (diff < num) {result.risk=rl.risk; result.comment=rl.comment; break;} }
      else if (condition.startsWith('==')) { if (diff == num) {result.risk=rl.risk; result.comment=rl.comment; break;} }
    }
    return result;
  });

  return {dimensions: dimResults, composite_rules: composite};
}

function buildReport(submission) {
  const analysis = computeAnalysis(submission.answers || {});
  const dims = analysis.dimensions;
  const dimList = Object.values(dims);
  const rows = dimList.map(d=>`| ${d.label} | ${d.score} | ${d.level} | <span style="color:${d.risk_flag}">${d.risk_flag}</span> |`).join('\n');
  const comp = analysis.composite_rules.filter(c=>c.comment).map(c=>`- **${c.name}**：${c.comment}（风险：${c.risk}）`).join('\n');
  const suggestions = [];
  if (dims.knowledge_score && dims.knowledge_score.level === 'low') suggestions.push('- 增强身心灵知识培训流程');
  if (dims.ai_usage_freq && dims.ai_usage_freq.level === 'low') suggestions.push('- 推动 AI 工具基础培训与快速上手包');
  if (dims.budget_capacity && dims.budget_capacity.level === 'low') suggestions.push('- 设计低门槛分阶段合作模式');
  if (dims.brand_clarity && dims.brand_clarity.level === 'unclear') suggestions.push('- 提供品牌定位工作坊');
  
  // 生成结构化的答案预览
  let answersSection = '';
  if (submission.answers && typeof submission.answers === 'object') {
    const questionLabels = {
      profile_experience: '创作资历',
      channel_mix: '渠道组合',
      audience_size: '粉丝规模',
      content_frequency: '内容频率',
      pain_points: '痛点领域',
      industry_knowledge: '行业知识',
      ai_usage: 'AI使用频率',
      ai_tools: 'AI工具类型',
      income_goal: '收入目标',
      budget: '预算范围',
      competition_risk: '竞争焦虑',
      brand_clarity: '品牌清晰度',
      open_challenge: '开放性挑战'
    };
    
    answersSection = '## 6. 详细答案\n\n';
    Object.entries(submission.answers).forEach(([key, value]) => {
      const label = questionLabels[key] || key;
      let displayValue = '';
      
      if (Array.isArray(value)) {
        displayValue = value.join('、');
      } else {
        displayValue = value || '未填写';
      }
      
      answersSection += `**${label}**：${displayValue}\n\n`;
    });
  }
  
  const md = `# 内部洞察报告\n\n**用户姓名**：${submission.name || '未知用户'}  |  **提交时间**：${submission.submitted_at || ''}  |  **答卷 ID**：${submission.id}\n\n## 1. 概览\n- 创作资历：${dims.profile_experience?.level || ''}\n- 预算能力：${dims.budget_capacity?.level || ''}\n- AI 采纳频率：${dims.ai_usage_freq?.level || ''}\n- 增长目标：${dims.growth_ambition?.level || ''}\n\n## 2. 维度评分\n| 维度 | 分数 | 等级 | 风险 |\n|------|------|------|------|\n${rows}\n\n## 3. 关键洞察\n${comp}\n\n## 4. 建议关注点\n${suggestions.join('\n')}\n\n## 5. 开放性反馈\n> ${submission.answers?.open_challenge || ''}\n\n${answersSection}---\n*本报告仅供内部参考，不向答卷者公开。*`;
  return md;
}

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
      const submission = Object.assign({}, data, { id: users.length + 1, submitted_at: new Date().toISOString() });
      users.push(submission);
      fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), err => {
        if (err) console.error(err);
        res.writeHead(302, { 'Location': '/thanks.html' });
        res.end();
      });
    });
  });
}

function serveVisualReport(res, userId) {
  if (!userId) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('缺少用户ID参数');
    return;
  }
  serveStatic(res, path.join(__dirname, 'public', 'report.html'));
}

function serveReportData(res, userId) {
  if (!userId) {
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: '缺少用户ID参数'}));
    return;
  }

  fs.readFile(DATA_FILE, (err, file) => {
    let users = [];
    if (!err) {
      try { users = JSON.parse(file); } catch(e) {}
    }
    
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
      res.writeHead(404, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: '未找到用户'}));
      return;
    }

    const analysis = computeAnalysis(user.answers || {});
    const dims = analysis.dimensions;
    
         // 转换数据格式为前端需要的格式
     const reportData = {
       user_id: user.id,
       submit_time: user.submitted_at || '',
       user_name: user.name || '',
       overview: {
         experience: dims.profile_experience?.level || '',
         budget: dims.budget_capacity?.level || '',
         ai_usage: dims.ai_usage_freq?.level || '',
         growth: dims.growth_ambition?.level || ''
       },
       dimensions: Object.entries(dims).map(([key, data]) => {
         const dimension = analysisModel.dimensions.find(d => d.name === key);
         let maxScore = 5; // 默认最大值
         
         if (dimension) {
           if (dimension.aggregation === 'count') {
             // 对于计数类型的维度，使用选项数量作为最大值
             if (key === 'channel_diversity') maxScore = 6;
             else if (key === 'pain_point_intensity') maxScore = 5;
             else if (key === 'ai_tools_span') maxScore = 6;
           } else if (dimension.option_weights) {
             // 对于权重类型的维度，使用最大权重值
             maxScore = Math.max(...Object.values(dimension.option_weights));
           }
         }
         
         return {
           name: data.label,
           score: Math.round(data.score * 10) / 10, // 保留一位小数
           level: data.level,
           risk: data.risk_flag,
           max: maxScore
         };
       }),
       insights: analysis.composite_rules.filter(c => c.comment).map(c => ({
         type: c.risk === 'red' ? 'alert' : 'warning',
         text: c.comment
       })),
       suggestions: [],
       feedback: user.answers?.open_challenge || ''
     };

    // 生成建议
    if (dims.knowledge_score && dims.knowledge_score.level === 'low') 
      reportData.suggestions.push('增强身心灵知识培训流程');
    if (dims.ai_usage_freq && dims.ai_usage_freq.level === 'low') 
      reportData.suggestions.push('推动 AI 工具基础培训与快速上手包');
    if (dims.budget_capacity && dims.budget_capacity.level === 'low') 
      reportData.suggestions.push('设计低门槛分阶段合作模式');
    if (dims.brand_clarity && dims.brand_clarity.level === 'unclear') 
      reportData.suggestions.push('提供品牌定位工作坊');

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(reportData));
  });
}

function serveAdmin(res, detailId) {
  fs.readFile(DATA_FILE, (err, file) => {
    let users = [];
    if (!err) {
      try { users = JSON.parse(file); } catch(e) {}
    }
    if (detailId) {
      const user = users.find(u => String(u.id) === String(detailId));
      if (!user) {
        res.writeHead(404, {'Content-Type':'text/plain'});
        res.end('未找到用户');
        return;
      }
      const report = buildReport(user);
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>分析报告 - ${user.name || '未知用户'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .meta {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .content {
      padding: 40px;
    }
    
    .report-content {
      white-space: pre-wrap;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.8;
      background: #f8f9fa;
      padding: 30px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    
    .actions {
      padding: 30px;
      text-align: center;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    
    .btn {
      display: inline-block;
      padding: 12px 24px;
      margin: 0 10px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    
    @media (max-width: 768px) {
      .container {
        margin: 10px;
        border-radius: 12px;
      }
      
      .content {
        padding: 20px;
      }
      
      .report-content {
        padding: 20px;
        font-size: 12px;
      }
      
      .btn {
        display: block;
        margin: 10px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>用户洞察报告</h1>
      <div class="meta">
        用户：${user.name || '未知用户'} | ID：${user.id} | 
        ${user.submitted_at ? new Date(user.submitted_at).toLocaleString('zh-CN') : '未知时间'}
      </div>
    </div>
    
    <div class="content">
      <div class="report-content">${report}</div>
    </div>
    
    <div class="actions">
      <a href="/admin" class="btn btn-primary">返回管理面板</a>
      <a href="/report?id=${user.id}" class="btn btn-secondary">查看可视化报告</a>
    </div>
  </div>
</body>
</html>`;
      res.writeHead(200, {'Content-Type':'text/html'});
      res.end(html);
      return;
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
      const submitTime = u.submitted_at ? new Date(u.submitted_at).toLocaleString('zh-CN') : '未知';
      return `<tr>
        <td>
          <div class="user-info">
            <div class="user-name">${u.name || '未知用户'}</div>
            <div class="user-contact">ID: ${u.id}</div>
          </div>
        </td>
        <td>
          <div class="user-contact">📧 ${u.email || '未填写'}</div>
          <div class="user-contact">💬 ${u.wechat || '未填写'}</div>
          <div class="user-contact">📱 ${u.phone || '未填写'}</div>
        </td>
        <td>
          <div class="answers-preview" title="${ans}">${ans}</div>
        </td>
        <td>
          <div class="user-contact">${submitTime}</div>
        </td>
        <td>
          <div class="action-buttons">
            <a href="/admin?id=${u.id}" class="btn btn-primary">文本报告</a>
            <a href="/report?id=${u.id}" class="btn btn-secondary">可视化报告</a>
          </div>
        </td>
      </tr>`;
    }).join('\n');
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>管理员面板 - CodeX WorkSpace</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.header .subtitle {
  color: #666;
  font-size: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stats-card {
  background: linear-gradient(135deg, #f8f9ff, #e8f0ff);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: transform 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-3px);
}

.stats-card .number {
  font-size: 32px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 5px;
}

.stats-card .label {
  color: #666;
  font-size: 14px;
}

.table-container {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 15px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
}

td {
  padding: 15px 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}

tr:hover {
  background: #f8f9ff;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  color: #333;
}

.user-contact {
  font-size: 12px;
  color: #666;
}

.answers-preview {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .container {
    padding: 20px;
    margin: 10px;
  }
  
  table {
    font-size: 12px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>管理员面板</h1>
    <div class="subtitle">用户调查数据管理系统</div>
  </div>
  
  <div class="stats-cards">
    <div class="stats-card">
      <div class="number">${users.length}</div>
      <div class="label">总用户数</div>
    </div>
    <div class="stats-card">
      <div class="number">${users.filter(u => u.submitted_at && new Date(u.submitted_at) > new Date(Date.now() - 24*60*60*1000)).length}</div>
      <div class="label">今日新增</div>
    </div>
    <div class="stats-card">
      <div class="number">${users.filter(u => u.answers && Object.keys(u.answers).length > 20).length}</div>
      <div class="label">完整答卷</div>
    </div>
  </div>
  
  <div class="table-container">
    <table>
      <tr>
        <th>用户信息</th>
        <th>联系方式</th>
        <th>答案预览</th>
        <th>提交时间</th>
        <th>操作</th>
      </tr>
      ${rows}
    </table>
  </div>
</div>
</body>
</html>`;
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    const parsed = new URL(req.url, `http://${req.headers.host}`);
    if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
      serveStatic(res, path.join(__dirname, 'public', 'index.html'));
    } else if (parsed.pathname === '/thanks.html') {
      serveStatic(res, path.join(__dirname, 'public', 'thanks.html'));
    } else if (parsed.pathname === '/style.css') {
      serveStatic(res, path.join(__dirname, 'public', 'style.css'), 'text/css');
    } else if (parsed.pathname === '/debug.html') {
      serveStatic(res, path.join(__dirname, 'public', 'debug.html'));
    } else if (parsed.pathname === '/admin') {
      const id = parsed.searchParams.get('id');
      serveAdmin(res, id);
    } else if (parsed.pathname === '/report') {
      const id = parsed.searchParams.get('id');
      serveVisualReport(res, id);
    } else if (parsed.pathname === '/api/report-data') {
      const id = parsed.searchParams.get('id');
      serveReportData(res, id);
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
