/*
 * Front‑end controller for the multi‑user AL&MO TASKS dashboard.
 *
 * This script interacts with the backend API to load users, boards and
 * tasks for the logged‑in user. It reuses much of the single‑user UI
 * behaviour, including editing tasks and managing sub‑items, but
 * persists changes via HTTP calls. Boards can be shared via the
 * invitation feature. A logout button clears credentials.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const currentUserId = localStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userName');
    if (!currentUserId) {
        window.location.href = 'login.html';
        return;
    }

    // Element references
    const logoutBtn = document.getElementById('logout');
    const boardForm = document.getElementById('create-board-form');
    const boardNameInput = document.getElementById('board-name');
    const taskForm = document.getElementById('create-task-form');
    const taskUserSelect = document.getElementById('task-user');
    const taskBoardSelect = document.getElementById('task-board');
    const boardsContainer = document.getElementById('boards-container');

    // In‑memory state
    let users = [];
    let boards = [];
    let tasks = [];

    // Logout handler
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
    });

    // Fetch users from API
    async function fetchUsers() {
        const res = await fetch('/api/users');
        users = await res.json();
    }

    // Fetch boards accessible to the current user
    async function fetchBoards() {
        const res = await fetch('/api/boards?userId=' + encodeURIComponent(currentUserId));
        boards = await res.json();
    }

    // Fetch tasks for the current user
    async function fetchTasks() {
        const res = await fetch('/api/tasks?userId=' + encodeURIComponent(currentUserId));
        tasks = await res.json();
    }

    // Populate select options for users and boards
    function updateUserOptions() {
        const current = taskUserSelect.value;
        taskUserSelect.innerHTML = '';
        const blankOpt = document.createElement('option');
        blankOpt.value = '';
        blankOpt.textContent = 'Unassigned';
        taskUserSelect.appendChild(blankOpt);
        users.forEach(user => {
            const opt = document.createElement('option');
            opt.value = user.id;
            opt.textContent = user.name;
            if (current && current === user.id) opt.selected = true;
            taskUserSelect.appendChild(opt);
        });
    }
    function updateBoardOptions() {
        const current = taskBoardSelect.value;
        taskBoardSelect.innerHTML = '';
        boards.forEach(board => {
            const opt = document.createElement('option');
            opt.value = board.id;
            opt.textContent = board.name;
            if (current && current === board.id) opt.selected = true;
            taskBoardSelect.appendChild(opt);
        });
    }

    // Load initial data and render
    async function init() {
        await fetchUsers();
        await fetchBoards();
        await fetchTasks();
        render();
    }

    // Create a task card DOM element
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';

        // If editing, show form
        if (task.editing) {
            const editForm = document.createElement('div');
            editForm.className = 'edit-task-form';
            const titleInput = document.createElement('input');
            titleInput.value = task.title;
            editForm.appendChild(titleInput);
            const userSelect = document.createElement('select');
            const blankOpt = document.createElement('option');
            blankOpt.value = '';
            blankOpt.textContent = 'Unassigned';
            userSelect.appendChild(blankOpt);
            users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.name;
                if (task.userId === u.id) opt.selected = true;
                userSelect.appendChild(opt);
            });
            editForm.appendChild(userSelect);
            const dueInput = document.createElement('input');
            dueInput.type = 'date';
            dueInput.value = task.dueDate || '';
            editForm.appendChild(dueInput);
            const boardSelect = document.createElement('select');
            boards.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                if (task.boardId === b.id) opt.selected = true;
                boardSelect.appendChild(opt);
            });
            editForm.appendChild(boardSelect);
            const descArea = document.createElement('textarea');
            descArea.value = task.description || '';
            editForm.appendChild(descArea);
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'edit-buttons';
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-task';
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', async () => {
                const updates = {
                    title: titleInput.value.trim() || task.title,
                    userId: userSelect.value || '',
                    dueDate: dueInput.value,
                    boardId: boardSelect.value,
                    description: descArea.value.trim()
                };
                try {
                    const res = await fetch('/api/tasks/' + encodeURIComponent(task.id), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (res.ok) {
                        Object.assign(task, updates);
                        task.editing = false;
                        render();
                    } else {
                        const data = await res.json();
                        alert(data.message || 'Failed to save task');
                    }
                } catch (err) {
                    alert('Network error');
                }
            });
            buttonsDiv.appendChild(saveBtn);
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-edit';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                task.editing = false;
                render();
            });
            buttonsDiv.appendChild(cancelBtn);
            editForm.appendChild(buttonsDiv);
            card.appendChild(editForm);
            return card;
        }

        // Display mode
        const titleEl = document.createElement('h4');
        titleEl.textContent = task.title;
        card.appendChild(titleEl);
        // Assigned user display
        const user = users.find(u => u.id === task.userId);
        const assignText = document.createElement('p');
        assignText.textContent = user ? `Assigned: ${user.name}` : 'Assigned: —';
        card.appendChild(assignText);
        // Due date display
        if (task.dueDate) {
            const dueEl = document.createElement('p');
            dueEl.textContent = `Due: ${task.dueDate}`;
            card.appendChild(dueEl);
        }
        // Description
        if (task.description) {
            const descEl = document.createElement('p');
            descEl.textContent = task.description;
            card.appendChild(descEl);
        }
        // Sub-items section
        const sub = document.createElement('div');
        sub.className = 'sub-items';
        const subTitle = document.createElement('h5');
        subTitle.textContent = 'Items';
        sub.appendChild(subTitle);
        const ul = document.createElement('ul');
        (task.items || []).forEach(item => {
            const li = document.createElement('li');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.checked = !!item.completed;
            chk.addEventListener('change', async () => {
                item.completed = chk.checked;
                await updateTaskItems(task);
            });
            li.appendChild(chk);
            const span = document.createElement('span');
            span.textContent = item.content;
            if (item.completed) span.style.textDecoration = 'line-through';
            li.appendChild(span);
            const editItemBtn = document.createElement('button');
            editItemBtn.textContent = 'Edit';
            editItemBtn.addEventListener('click', async () => {
                const newContent = prompt('Edit item', item.content);
                if (newContent !== null) {
                    item.content = newContent.trim();
                    await updateTaskItems(task);
                }
            });
            li.appendChild(editItemBtn);
            const delItemBtn = document.createElement('button');
            delItemBtn.textContent = '×';
            delItemBtn.addEventListener('click', async () => {
                task.items = task.items.filter(it => it.id !== item.id);
                await updateTaskItems(task);
            });
            li.appendChild(delItemBtn);
            ul.appendChild(li);
        });
        sub.appendChild(ul);
        const addItemForm = document.createElement('form');
        addItemForm.className = 'add-item-form';
        const addInput = document.createElement('input');
        addInput.placeholder = 'Add item';
        addItemForm.appendChild(addInput);
        const addBtn = document.createElement('button');
        addBtn.type = 'submit';
        addBtn.textContent = 'Add';
        addItemForm.appendChild(addBtn);
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = addInput.value.trim();
            if (content) {
                const itemId = 'item-' + Date.now();
                if (!task.items) task.items = [];
                task.items.push({ id: itemId, content, completed: false });
                addInput.value = '';
                await updateTaskItems(task);
            }
        });
        sub.appendChild(addItemForm);
        card.appendChild(sub);
        // Task actions: board select, user select, edit, delete
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';
        // Board select for moving
        const boardSelect = document.createElement('select');
        boards.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            if (task.boardId === b.id) opt.selected = true;
            boardSelect.appendChild(opt);
        });
        boardSelect.addEventListener('change', async (e) => {
            task.boardId = e.target.value;
            await updateTask(task);
        });
        actionsDiv.appendChild(boardSelect);
        // User select for reassigning
        const userSelect = document.createElement('select');
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = 'Unassigned';
        userSelect.appendChild(blankOption);
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.name;
            if (task.userId === u.id) opt.selected = true;
            userSelect.appendChild(opt);
        });
        userSelect.addEventListener('change', async (e) => {
            task.userId = e.target.value;
            await updateTask(task);
        });
        actionsDiv.appendChild(userSelect);
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
            task.editing = true;
            render();
        });
        actionsDiv.appendChild(editBtn);
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
            if (confirm('Delete this task?')) {
                try {
                    const res = await fetch('/api/tasks/' + encodeURIComponent(task.id), {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        tasks = tasks.filter(t => t.id !== task.id);
                        render();
                    } else {
                        const data = await res.json();
                        alert(data.message || 'Failed to delete task');
                    }
                } catch (err) {
                    alert('Network error');
                }
            }
        });
        actionsDiv.appendChild(delBtn);
        card.appendChild(actionsDiv);
        return card;
    }

    // Update task properties (except items) via API
    async function updateTask(task) {
        try {
            const res = await fetch('/api/tasks/' + encodeURIComponent(task.id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    boardId: task.boardId,
                    userId: task.userId
                })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.message || 'Failed to update task');
            } else {
                render();
            }
        } catch (err) {
            alert('Network error');
        }
    }

    // Update items on a task via API
    async function updateTaskItems(task) {
        try {
            const res = await fetch('/api/tasks/' + encodeURIComponent(task.id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: task.items })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.message || 'Failed to update items');
            }
            render();
        } catch (err) {
            alert('Network error');
        }
    }

    // Render boards and tasks
    function render() {
        // Update selects
        updateUserOptions();
        updateBoardOptions();
        // Clear container
        boardsContainer.innerHTML = '';
        boards.forEach(board => {
            const boardDiv = document.createElement('div');
            boardDiv.className = 'board';
            if (board.color) {
                boardDiv.style.setProperty('--board-color', board.color);
            }
            // Board header with invite button
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.alignItems = 'center';
            const title = document.createElement('h3');
            title.textContent = board.name;
            title.style.flexGrow = '1';
            headerDiv.appendChild(title);
            const inviteBtn = document.createElement('button');
            inviteBtn.textContent = 'Invite';
            inviteBtn.style.padding = '4px 8px';
            inviteBtn.style.fontSize = '0.8rem';
            inviteBtn.addEventListener('click', () => {
                const email = prompt('Enter email to invite');
                if (email) {
                    invite(board.id, email);
                }
            });
            headerDiv.appendChild(inviteBtn);
            boardDiv.appendChild(headerDiv);
            // Tasks
            const boardTasks = tasks.filter(t => t.boardId === board.id);
            boardTasks.forEach(task => {
                const card = createTaskCard(task);
                boardDiv.appendChild(card);
            });
            boardsContainer.appendChild(boardDiv);
        });
    }

    // Invite API call
    async function invite(boardId, email) {
        try {
            const res = await fetch('/api/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardId, email, inviterId: currentUserId })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Invitation sent (if email configured)');
            } else {
                alert(data.message || 'Failed to send invitation');
            }
        } catch (err) {
            alert('Network error');
        }
    }

    // Form submit handlers
    boardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = boardNameInput.value.trim();
        if (!name) return;
        try {
            const res = await fetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, userId: currentUserId })
            });
            const board = await res.json();
            if (res.ok) {
                boards.push(board);
                boardNameInput.value = '';
                render();
            } else {
                alert(board.message || 'Failed to create board');
            }
        } catch (err) {
            alert('Network error');
        }
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const assignedUserId = taskUserSelect.value || '';
        const dueDate = document.getElementById('task-due').value;
        const description = document.getElementById('task-desc').value.trim();
        const boardId = taskBoardSelect.value;
        if (!title || !boardId) return;
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, dueDate, boardId, assignedUserId, creatorId: currentUserId })
            });
            const task = await res.json();
            if (res.ok) {
                tasks.push(task);
                // reset form
                document.getElementById('task-title').value = '';
                document.getElementById('task-desc').value = '';
                document.getElementById('task-due').value = '';
                taskUserSelect.value = '';
                render();
            } else {
                alert(task.message || 'Failed to create task');
            }
        } catch (err) {
            alert('Network error');
        }
    });

    // Start the app
    init();
});