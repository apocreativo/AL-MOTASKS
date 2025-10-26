# AL&MO TASKS

AL&MO TASKS is a flexible project management tool inspired by platforms like
Monday.com. It comes in two flavours:

* A **single‑user front‑end only app** that runs entirely in your browser and
  saves data to `localStorage`. This version is ideal for quick personal
  organization without any backend setup.
* A **multi‑user full stack application** consisting of a front‑end and a
  Node.js/Express backend. This version supports user registration and login,
  invitation emails, shared boards and tasks stored on the server, and
  persistence across devices.

## Features

### Single‑user version

* **Board creation:** Add as many boards as you need to organize your work.
* **Task management:** Create tasks with a title, assignee, due date and
  description. Tasks are displayed as cards within their assigned boards.
* **Items and editing:** Each task can contain a list of sub‑items, which you
  can add, edit or mark complete. Tasks themselves can also be edited in
  place.
* **Colourful boards:** Boards are assigned colours from a palette, and each
  task card displays a matching coloured strip to aid visual grouping.
* **Responsive:** The layout adapts to small screens; boards scroll
  horizontally on mobile.
* **Persistence:** Data is saved in the browser via `localStorage` so your
  tasks remain across page reloads.

### Multi‑user version

* **User accounts:** Users can register and log in with a name, email and
  password. Passwords are hashed on the server for security.
* **Shared boards:** Boards belong to their creator but can be shared with
  other users via an invitation mechanism. Members of a board can see and
  modify its tasks.
* **Task assignment:** Tasks can be assigned to any registered user. Assignees
  see their tasks when they log in.
* **Email invitations:** If SMTP settings are provided via environment
  variables, the server will send invitation emails to collaborators. If not,
  invitations are logged to the console.
* **Server persistence:** All data (users, boards, tasks and invitations) is
  stored in a JSON file on the server. For production you can replace this
  with a database.

## Usage

This repository includes both the legacy single‑user version and the new
multi‑user version.

### Running the single‑user version

1. Download or clone this repository to your local machine.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).
3. Create boards and tasks using the forms on the page. Everything will be
   stored locally in your browser.

### Running the multi‑user version

1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Navigate to the `ALMO_TASKS` directory and install dependencies:

   ```bash
   npm install
   ```

   If the install fails due to network restrictions, download the packages
   manually or configure your npm registry.

3. Optionally set SMTP environment variables if you want to enable email
   invitations:

   - `SMTP_HOST`: your SMTP server hostname
   - `SMTP_PORT`: the port (465 for TLS)
   - `SMTP_USER`: username/login
   - `SMTP_PASS`: password
   - `SMTP_FROM` (optional): from email address

4. Start the server:

   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:3000/login.html` and register a
   user. After logging in you can create boards, tasks, assign users, and
   invite collaborators via email.

6. To log out, click the **Logout** button in the header.

## Deployment

### Single‑user version

The single‑user version is comprised of static files and can be deployed on any
static hosting provider such as GitHub Pages, Netlify, Vercel or your own web
server. Upload `index.html`, `style.css`, `script.js` and related assets.

### Multi‑user version

To deploy the full stack version you need to host the Node.js server on a
platform that supports long‑running processes (e.g. Heroku, Render, AWS EC2,
DigitalOcean). Once deployed, serve the `login.html`, `register.html` and
`dashboard.html` pages from the same server so that the API endpoints are
reachable relative to the client.

## License

This software is released under the [MIT License](LICENSE). You are free to
use, modify, and distribute it as long as you include the original license
terms.