/*
 * AL&MO TASKS – Enhanced Edition
 *
 * This script provides a richer project management experience inspired by
 * monday.com. In addition to boards and tasks, it allows you to manage a list
 * of users, assign tasks to users, edit existing tasks, and add nested
 * sub‑items to each task. The interface is mobile‑friendly and data is
 * persisted in the browser's localStorage.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Element references
    const userForm = document.getElementById('create-user-form');
    const userNameInput = document.getElementById('user-name');
    const userList = document.getElementById('user-list');
    const boardForm = document.getElementById('create-board-form');
    const boardNameInput = document.getElementById('board-name');
    const taskForm = document.getElementById('create-task-form');
    const taskUserSelect = document.getElementById('task-user');
    const taskBoardSelect = document.getElementById('task-board');
    const boardsContainer = document.getElementById('boards-container');

    // Application state
    let users = [];
    let boards = [];
    let tasks = [];

    /**
     * Colour palette for boards. When a new board is created the next
     * colour from this array will be applied. Colours recycle if
     * there are more boards than colours. These shades were chosen
     * to evoke the playful yet professional look of modern task apps.
     */
    const boardColors = [
        '#4A90E2', // blue
        '#50E3C2', // teal
        '#F5A623', // orange
        '#BD10E0', // purple
        '#B8E986', // green
        '#F8E71C', // yellow
        '#D0021B'  // red
    ];

    /**
     * Load stored data from localStorage. If no data exists, initialise
     * empty arrays. For backward compatibility, tasks without an `items`
     * property will have it initialised to an empty array. Tasks lacking
     * a `userId` field retain their old `assigned` string if present.
     */
    function load() {
        users = JSON.parse(localStorage.getItem('almo_users')) || [];
        boards = JSON.parse(localStorage.getItem('almo_boards')) || [];
        tasks = JSON.parse(localStorage.getItem('almo_tasks')) || [];
        tasks.forEach(task => {
            if (!task.items) task.items = [];
            if (!('editing' in task)) task.editing = false;
            // Migrate legacy 'assigned' field to 'userId'
            if (task.assigned && !task.userId) {
                // Attempt to find an existing user with the same name
                const match = users.find(u => u.name === task.assigned);
                let id;
                if (match) {
                    id = match.id;
                } else {
                    // Create a new user record for the legacy assignment
                    id = 'user-' + Date.now();
                    users.push({ id, name: task.assigned });
                }
                task.userId = id;
                delete task.assigned;
            }
        });

        // Ensure all boards have a colour assigned. If colour is missing,
        // choose one based on index to maintain deterministic colours on
        // reload. If there are more boards than colours, colours cycle.
        boards.forEach((board, idx) => {
            if (!board.color) {
                board.color = boardColors[idx % boardColors.length];
            }
        });
        save();
    }

    /**
     * Persist current state arrays into localStorage. This helper ensures
     * synchronous writes to storage for users, boards and tasks.
     */
    function save() {
        localStorage.setItem('almo_users', JSON.stringify(users));
        localStorage.setItem('almo_boards', JSON.stringify(boards));
        localStorage.setItem('almo_tasks', JSON.stringify(tasks));
    }

    /**
     * Update the user selector in the task creation form. Always includes
     * a blank option for unassigned tasks, followed by all existing users.
     */
    function updateUserOptions() {
        // Preserve currently selected value if possible
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

    /**
     * Render the list of users below the add user form. This is purely
     * informational and does not include edit/delete for simplicity.
     */
    function renderUsers() {
        userList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.name;
            userList.appendChild(li);
        });
    }

    /**
     * Populate the board selector in the task creation form with existing
     * boards. Called whenever boards are added or removed.
     */
    function updateBoardOptions() {
        const current = taskBoardSelect.value;
        taskBoardSelect.innerHTML = '';
        boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.name;
            if (current && current === board.id) option.selected = true;
            taskBoardSelect.appendChild(option);
        });
    }

    /**
     * Create DOM elements for a single task card. Depending on the task's
     * `editing` flag, either shows an edit form or the display view. This
     * function encapsulates all event listeners related to tasks, including
     * editing, moving, assigning, deleting, and sub‑item management.
     *
     * @param {Object} task The task object to render.
     * @returns {HTMLElement} The root element representing the task card.
     */
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';

        // Editing mode
        if (task.editing) {
            const editForm = document.createElement('div');
            editForm.className = 'edit-task-form';

            // Title field
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.value = task.title;
            editForm.appendChild(titleInput);

            // User selector
            const userSelect = document.createElement('select');
            // unassigned option
            const blankOpt = document.createElement('option');
            blankOpt.value = '';
            blankOpt.textContent = 'Unassigned';
            userSelect.appendChild(blankOpt);
            users.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user.id;
                opt.textContent = user.name;
                if (task.userId === user.id) opt.selected = true;
                userSelect.appendChild(opt);
            });
            editForm.appendChild(userSelect);

            // Due date
            const dueInput = document.createElement('input');
            dueInput.type = 'date';
            dueInput.value = task.dueDate || '';
            editForm.appendChild(dueInput);

            // Board selector
            const boardSelect = document.createElement('select');
            boards.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                if (task.boardId === b.id) opt.selected = true;
                boardSelect.appendChild(opt);
            });
            editForm.appendChild(boardSelect);

            // Description
            const descArea = document.createElement('textarea');
            descArea.value = task.description || '';
            editForm.appendChild(descArea);

            // Buttons
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'edit-buttons';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-task';
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', () => {
                // Update properties from inputs
                task.title = titleInput.value.trim() || task.title;
                const selectedUser = userSelect.value;
                task.userId = selectedUser || '';
                task.dueDate = dueInput.value;
                task.boardId = boardSelect.value;
                task.description = descArea.value.trim();
                task.editing = false;
                save();
                render();
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

        // Description display
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
        task.items.forEach(item => {
            const li = document.createElement('li');
            // Checkbox for completion
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.checked = !!item.completed;
            chk.addEventListener('change', () => {
                // Update completion state and re-render to reflect line-through
                item.completed = chk.checked;
                save();
                render();
            });
            li.appendChild(chk);
            // Text
            const span = document.createElement('span');
            span.textContent = item.content;
            if (item.completed) span.style.textDecoration = 'line-through';
            li.appendChild(span);
            // Edit item button
            const editItemBtn = document.createElement('button');
            editItemBtn.textContent = 'Edit';
            editItemBtn.addEventListener('click', () => {
                const newContent = prompt('Edit item', item.content);
                if (newContent !== null) {
                    item.content = newContent.trim();
                    save();
                    render();
                }
            });
            li.appendChild(editItemBtn);
            // Delete item button
            const delItemBtn = document.createElement('button');
            delItemBtn.textContent = '×';
            delItemBtn.addEventListener('click', () => {
                task.items = task.items.filter(it => it.id !== item.id);
                save();
                render();
            });
            li.appendChild(delItemBtn);
            ul.appendChild(li);
        });
        sub.appendChild(ul);
        // Form to add new sub-item
        const addItemForm = document.createElement('form');
        addItemForm.className = 'add-item-form';
        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = 'Add item';
        addItemForm.appendChild(addInput);
        const addBtn = document.createElement('button');
        addBtn.type = 'submit';
        addBtn.textContent = 'Add';
        addItemForm.appendChild(addBtn);
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = addInput.value.trim();
            if (content) {
                const itemId = 'item-' + Date.now();
                task.items.push({ id: itemId, content, completed: false });
                addInput.value = '';
                save();
                render();
            }
        });
        sub.appendChild(addItemForm);
        card.appendChild(sub);

        // Action controls: board select, user select, edit, delete
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
        boardSelect.addEventListener('change', (e) => {
            task.boardId = e.target.value;
            save();
            render();
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
        userSelect.addEventListener('change', (e) => {
            task.userId = e.target.value;
            save();
            render();
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
        delBtn.addEventListener('click', () => {
            tasks = tasks.filter(t => t.id !== task.id);
            save();
            render();
        });
        actionsDiv.appendChild(delBtn);

        card.appendChild(actionsDiv);
        return card;
    }

    /**
     * Render boards and their tasks. Called whenever state changes. Also
     * triggers user list and option refreshes to keep the UI in sync.
     */
    function render() {
        // Render user list and update selectors
        renderUsers();
        updateUserOptions();
        updateBoardOptions();

        // Render boards and tasks
        boardsContainer.innerHTML = '';
        boards.forEach(board => {
            const boardDiv = document.createElement('div');
            boardDiv.className = 'board';
            // Set CSS variable for board colour so the board and tasks can share it
            if (board.color) {
                boardDiv.style.setProperty('--board-color', board.color);
            }
            const title = document.createElement('h3');
            title.textContent = board.name;
            boardDiv.appendChild(title);
            // tasks for board
            const boardTasks = tasks.filter(t => t.boardId === board.id);
            boardTasks.forEach(task => {
                const card = createTaskCard(task);
                boardDiv.appendChild(card);
            });
            boardsContainer.appendChild(boardDiv);
        });
    }

    // Event handlers

    // Add new user
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = userNameInput.value.trim();
        if (name) {
            const id = 'user-' + Date.now();
            users.push({ id, name });
            userNameInput.value = '';
            save();
            render();
        }
    });

    // Add new board
    boardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = boardNameInput.value.trim();
        if (name) {
            const id = 'board-' + Date.now();
            // assign a colour from the palette based on number of existing boards
            const color = boardColors[boards.length % boardColors.length];
            boards.push({ id, name, color });
            boardNameInput.value = '';
            save();
            render();
        }
    });

    // Add new task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const userId = taskUserSelect.value;
        const dueDate = document.getElementById('task-due').value;
        const description = document.getElementById('task-desc').value.trim();
        const boardId = taskBoardSelect.value;
        if (title && boardId) {
            const id = 'task-' + Date.now();
            tasks.push({
                id,
                title,
                userId: userId || '',
                dueDate,
                description,
                boardId,
                items: [],
                editing: false
            });
            // Reset form fields
            document.getElementById('task-title').value = '';
            taskUserSelect.value = '';
            document.getElementById('task-due').value = '';
            document.getElementById('task-desc').value = '';
            save();
            render();
        }
    });

    // Initialise application
    load();
    render();
});