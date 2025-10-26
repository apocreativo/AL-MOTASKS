/*
 * AL&MO TASKS
 *
 * This script powers a lightweight project management interface inspired by
 * tools like monday.com. It allows users to create boards (columns) and
 * populate them with tasks. Tasks can be moved between boards via a
 * drop‑down selector and removed if no longer needed. All data is persisted
 * in the browser's localStorage so that your work remains across sessions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Form elements for creating boards and tasks
    const boardForm = document.getElementById('create-board-form');
    const boardNameInput = document.getElementById('board-name');
    const taskForm = document.getElementById('create-task-form');
    const taskBoardSelect = document.getElementById('task-board');
    const boardsContainer = document.getElementById('boards-container');

    // Application state: boards and tasks
    let boards = [];
    let tasks = [];

    /**
     * Load boards and tasks from localStorage.
     */
    function load() {
        const storedBoards = localStorage.getItem('almo_boards');
        const storedTasks = localStorage.getItem('almo_tasks');
        boards = storedBoards ? JSON.parse(storedBoards) : [];
        tasks = storedTasks ? JSON.parse(storedTasks) : [];
    }

    /**
     * Persist the current boards and tasks arrays into localStorage.
     */
    function save() {
        localStorage.setItem('almo_boards', JSON.stringify(boards));
        localStorage.setItem('almo_tasks', JSON.stringify(tasks));
    }

    /**
     * Refresh the options in the new task form's board selector. This
     * ensures users can assign tasks to any existing board.
     */
    function updateBoardOptions() {
        taskBoardSelect.innerHTML = '';
        boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.name;
            taskBoardSelect.appendChild(option);
        });
    }

    /**
     * Render all boards and their associated tasks onto the page. Clears
     * existing DOM nodes and builds a fresh layout based on the current
     * state. Each task card includes a board selector for moving the
     * task between boards and a delete button for removing it entirely.
     */
    function renderBoards() {
        // Clear the container so we can rebuild it
        boardsContainer.innerHTML = '';
        boards.forEach(board => {
            // Create DOM elements for each board
            const boardDiv = document.createElement('div');
            boardDiv.className = 'board';
            const title = document.createElement('h3');
            title.textContent = board.name;
            boardDiv.appendChild(title);

            // Filter tasks assigned to this board
            const boardTasks = tasks.filter(task => task.boardId === board.id);
            boardTasks.forEach(task => {
                // Create card for each task
                const card = document.createElement('div');
                card.className = 'task-card';

                const taskTitle = document.createElement('h4');
                taskTitle.textContent = task.title;
                card.appendChild(taskTitle);

                // Show assigned person if provided
                if (task.assigned) {
                    const assign = document.createElement('p');
                    assign.textContent = 'Assigned: ' + task.assigned;
                    card.appendChild(assign);
                }

                // Show due date if provided
                if (task.dueDate) {
                    const due = document.createElement('p');
                    due.textContent = 'Due: ' + task.dueDate;
                    card.appendChild(due);
                }

                // Show description if provided
                if (task.description) {
                    const desc = document.createElement('p');
                    desc.textContent = task.description;
                    card.appendChild(desc);
                }

                // Container for interactive controls (move & delete)
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'task-actions';

                // Selector for moving the task to a different board
                const boardSelect = document.createElement('select');
                boards.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.name;
                    if (b.id === task.boardId) opt.selected = true;
                    boardSelect.appendChild(opt);
                });
                boardSelect.addEventListener('change', (e) => {
                    // Update the board assignment on change
                    task.boardId = e.target.value;
                    save();
                    renderBoards();
                });
                actionsDiv.appendChild(boardSelect);

                // Delete button to remove the task
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => {
                    // Remove task from the list
                    tasks = tasks.filter(t => t.id !== task.id);
                    save();
                    renderBoards();
                });
                actionsDiv.appendChild(deleteButton);

                card.appendChild(actionsDiv);
                boardDiv.appendChild(card);
            });

            boardsContainer.appendChild(boardDiv);
        });
    }

    /**
     * Handler for adding a new board. Generates a unique identifier and
     * updates state, localStorage and the UI. Prevents blank names.
     */
    boardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = boardNameInput.value.trim();
        if (name) {
            // Create unique board id
            const id = 'board-' + Date.now();
            boards.push({ id, name });
            // Clear input
            boardNameInput.value = '';
            // Persist and refresh selectors/UI
            save();
            updateBoardOptions();
            renderBoards();
        }
    });

    /**
     * Handler for adding a new task. Ensures the title and board are present
     * before adding to state. Clears the form and refreshes the UI.
     */
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const assigned = document.getElementById('task-assigned').value.trim();
        const dueDate = document.getElementById('task-due').value;
        const description = document.getElementById('task-desc').value.trim();
        const boardId = taskBoardSelect.value;
        if (title && boardId) {
            const id = 'task-' + Date.now();
            tasks.push({ id, title, assigned, dueDate, description, boardId });
            // Reset form fields
            document.getElementById('task-title').value = '';
            document.getElementById('task-assigned').value = '';
            document.getElementById('task-due').value = '';
            document.getElementById('task-desc').value = '';
            // Persist and refresh
            save();
            renderBoards();
        }
    });

    // Initialize the app by loading any stored data and drawing the UI
    load();
    updateBoardOptions();
    renderBoards();
});