# CodeX-WorkSpace

This repository contains a simple Node.js project for collecting user
requirements. The interface is presented in Chinese and styled in an
iOS-inspired layout that adapts to mobile screens. The application
provides two main pages:

* **User survey** – 30 questions 针对身心灵内容创作者的现状与需求。
  问卷一次只显示一个问题并带有进度条，单选题点击选项后自动跳转
  下一题，多选题和开放题需要点击“下一题”。所有问题完成后，用户会
  填写联系信息（姓名、邮箱、微信号和手机号）。
* **Admin panel** – displays a table with all collected submissions. Each row
  offers a "查看详情" link that generates an analysis report based on the
  questionnaire answers. Answers are stored without the leading option
  letters (A/B/C...).

## Running the server

The project does not rely on external dependencies. Start the server with:

```bash
node server.js
```

The survey is available at `http://localhost:3000/` and the admin panel at
`http://localhost:3000/admin`. Append `?id=<编号>` to view a single user's
analysis report.

All submissions are stored in `data/users.json`.
