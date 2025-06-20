# CodeX-WorkSpace

This repository contains a simple Node.js project for collecting user
requirements. The interface is presented in Chinese. The application
provides two main pages:

* **User survey** – a 30‑question form presented one question at a time with a
  progress bar. After answering all questions, users provide their contact
  information (name, e‑mail, WeChat and phone).
* **Admin panel** – displays a table with all collected submissions.

## Running the server

The project does not rely on external dependencies. Start the server with:

```bash
node server.js
```

The survey is available at `http://localhost:3000/` and the admin panel at
`http://localhost:3000/admin`.

All submissions are stored in `data/users.json`.
