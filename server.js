/*
 * Simple Express backend for AL&MO TASKS
 *
 * This server implements a minimal multi‑user API using a JSON file for
 * persistence. It supports user registration and login, board and task
 * management, and sending basic invitation emails. Boards and tasks are
 * scoped by the user who creates them; boards can be shared with other
 * users via the invite endpoint. For production use you would want to
 * replace the file‑based storage with a database and add proper
 * authentication (e.g. JWT) and access control. The email sending code
 * requires SMTP configuration via environment variables.
 */

const express = require('express');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const DATA_FILE = __dirname + '/data.json';
const PORT = process.env.PORT || 3000;

// Colour palette for boards, matching the client
const boardColors = [
  '#4A90E2', // blue
  '#50E3C2', // teal
  '#F5A623', // orange
  '#BD10E0', // purple
  '#B8E986', // green
  '#F8E71C', // yellow
  '#D0021B'  // red
];

// Helper functions to load and save the JSON database
async function loadData() {
  try {
    const json = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(json);
  } catch (err) {
    return { users: [], boards: [], tasks: [], invites: [] };
  }
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Create a reusable mail transporter if SMTP variables are defined
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465, // use TLS for 465
      auth: { user, pass }
    });
  }
  return null;
}

const transporter = createTransporter();

/*
 * POST /api/register
 * Body: { name, email, password }
 * Registers a new user. Returns userId and name on success.
 */
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  const data = await loadData();
  const existing = data.users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ message: 'Email is already registered.' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const id = 'user-' + Date.now();
  const newUser = { id, name, email, passwordHash: hashed };
  data.users.push(newUser);
  await saveData(data);
  res.json({ userId: id, name });
});

/*
 * POST /api/login
 * Body: { email, password }
 * Authenticates a user. Returns userId and name if credentials are correct.
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const data = await loadData();
  const user = data.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  res.json({ userId: user.id, name: user.name });
});

/*
 * GET /api/users
 * Returns a list of all users (without password hashes). Useful for assignment selectors.
 */
app.get('/api/users', async (req, res) => {
  const data = await loadData();
  const users = data.users.map(({ id, name, email }) => ({ id, name, email }));
  res.json(users);
});

/*
 * GET /api/boards?userId=...
 * Returns boards where the user is a member (owner or invited).
 */
app.get('/api/boards', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: 'userId is required.' });
  const data = await loadData();
  const boards = data.boards.filter(b => (b.members && b.members.includes(userId)) || b.ownerId === userId);
  res.json(boards);
});

/*
 * POST /api/boards
 * Body: { name, userId }
 * Creates a new board and assigns the creator as owner and member. Returns the new board.
 */
app.post('/api/boards', async (req, res) => {
  const { name, userId } = req.body || {};
  if (!name || !userId) {
    return res.status(400).json({ message: 'Name and userId are required.' });
  }
  const data = await loadData();
  const id = 'board-' + Date.now();
  const color = boardColors[data.boards.length % boardColors.length];
  const board = { id, name, color, ownerId: userId, members: [userId] };
  data.boards.push(board);
  await saveData(data);
  res.json(board);
});

/*
 * POST /api/invite
 * Body: { boardId, email, inviterId }
 * Sends an invitation email for a board. Adds the invitee to the board members if they exist.
 */
app.post('/api/invite', async (req, res) => {
  const { boardId, email, inviterId } = req.body || {};
  if (!boardId || !email || !inviterId) {
    return res.status(400).json({ message: 'boardId, email and inviterId are required.' });
  }
  const data = await loadData();
  const board = data.boards.find(b => b.id === boardId);
  if (!board) return res.status(404).json({ message: 'Board not found.' });
  // Only members can invite others
  if (!(board.members && board.members.includes(inviterId))) {
    return res.status(403).json({ message: 'You are not a member of this board.' });
  }
  // Check if user exists by email
  let user = data.users.find(u => u.email === email);
  if (user) {
    // Add to board members if not already
    if (!board.members.includes(user.id)) board.members.push(user.id);
  }
  // Save invite record
  const invite = { id: 'invite-' + Date.now(), boardId, email, inviterId, created: new Date().toISOString() };
  data.invites.push(invite);
  await saveData(data);
  // Send email if transporter is configured
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `You're invited to a board on AL&MO TASKS`,
        text: `You have been invited to collaborate on the board "${board.name}". If you already have an account, please log in at the app. Otherwise, register with this email.`
      });
      console.log('Invitation sent: %s', info.messageId);
    } catch (err) {
      console.error('Error sending invitation email:', err.message);
    }
  } else {
    console.log(`Invitation to ${email} for board ${board.name}`);
  }
  res.json({ message: 'Invitation processed.' });
});

/*
 * GET /api/tasks?userId=...
 * Returns tasks belonging to boards where the user is a member.
 */
app.get('/api/tasks', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: 'userId is required.' });
  const data = await loadData();
  const accessibleBoardIds = data.boards
    .filter(b => (b.members && b.members.includes(userId)) || b.ownerId === userId)
    .map(b => b.id);
  const tasks = data.tasks.filter(t => accessibleBoardIds.includes(t.boardId));
  res.json(tasks);
});

/*
 * POST /api/tasks
 * Body: { title, description, dueDate, boardId, assignedUserId, creatorId }
 * Creates a new task. The creator must be a member of the board.
 */
app.post('/api/tasks', async (req, res) => {
  const { title, description, dueDate, boardId, assignedUserId, creatorId } = req.body || {};
  if (!title || !boardId || !creatorId) {
    return res.status(400).json({ message: 'title, boardId and creatorId are required.' });
  }
  const data = await loadData();
  const board = data.boards.find(b => b.id === boardId);
  if (!board) return res.status(404).json({ message: 'Board not found.' });
  if (!(board.members && board.members.includes(creatorId))) {
    return res.status(403).json({ message: 'You are not a member of this board.' });
  }
  const id = 'task-' + Date.now();
  const task = {
    id,
    title,
    description: description || '',
    dueDate: dueDate || '',
    boardId,
    userId: assignedUserId || '',
    items: []
  };
  data.tasks.push(task);
  await saveData(data);
  res.json(task);
});

/*
 * PATCH /api/tasks/:id
 * Updates a task. Body can include title, description, dueDate, boardId, userId, items.
 */
app.patch('/api/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const updates = req.body || {};
  const data = await loadData();
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  // Merge updates
  const allowed = ['title', 'description', 'dueDate', 'boardId', 'userId', 'items'];
  allowed.forEach(key => {
    if (key in updates) task[key] = updates[key];
  });
  await saveData(data);
  res.json(task);
});

/*
 * DELETE /api/tasks/:id
 * Deletes a task.
 */
app.delete('/api/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const data = await loadData();
  data.tasks = data.tasks.filter(t => t.id !== taskId);
  await saveData(data);
  res.json({ message: 'Task deleted.' });
});

/*
 * DELETE /api/boards/:id
 * Deletes a board and all associated tasks. Only owner can delete.
 */
app.delete('/api/boards/:id', async (req, res) => {
  const boardId = req.params.id;
  const { userId } = req.body || {};
  const data = await loadData();
  const board = data.boards.find(b => b.id === boardId);
  if (!board) return res.status(404).json({ message: 'Board not found.' });
  if (board.ownerId !== userId) return res.status(403).json({ message: 'Only the owner can delete this board.' });
  data.boards = data.boards.filter(b => b.id !== boardId);
  data.tasks = data.tasks.filter(t => t.boardId !== boardId);
  await saveData(data);
  res.json({ message: 'Board deleted.' });
});

// Start the server
// Serve static files from this directory. This allows the client HTML/JS to be
// loaded from the same origin as the API, avoiding CORS issues when the
// user navigates to http://localhost:PORT/login.html or dashboard.html.
const path = require('path');
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`AL&MO TASKS backend listening on port ${PORT}`);
});