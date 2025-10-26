# AL&MO TASKS

AL&MO TASKS is a lightweight, self‑contained project management tool inspired by
commercial platforms like Monday.com. It enables you to create columns (called
boards) and populate them with tasks. Each task can include a title, assignee,
optional due date, and description. Tasks can be moved between boards via a
simple drop‑down selector and removed when no longer needed. All data is stored
locally in your browser using `localStorage`, so you can close or refresh the
page without losing your progress.

## Features

* **Board creation:** Add as many boards as you need to organize your work.
* **Task management:** Create tasks with a title, assignee, due date and
  description. Tasks are displayed as cards within their assigned boards.
* **Drag‑free movement:** Move tasks between boards by selecting a new board
  from the drop‑down inside each card.
* **Persistence:** Your boards and tasks are saved to the browser's
  `localStorage`, ensuring they remain available across page reloads.
* **Deletion:** Remove tasks with a single click once they're complete or
  obsolete.

## Usage

1. Download or clone this repository to your local machine.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).
3. Use the "Create New Board" form to add one or more boards.
4. Use the "Create New Task" form to add tasks to a board. Choose the board
   from the drop‑down, fill in the details and click **Add Task**.
5. To move a task between boards, select a different board name from the
   drop‑down inside the task card.
6. To delete a task, click the **Delete** button on the task card.

This project is entirely front‑end based; there is no server or database.

## Deployment

Because the app consists of static files (HTML, CSS and JavaScript), it can be
deployed on any static hosting provider such as GitHub Pages, Netlify,
Vercel, or your own web server. Simply upload the contents of the `ALMO_TASKS`
folder to your hosting environment.

## License

This software is released under the [MIT License](LICENSE). You are free to
use, modify, and distribute it as long as you include the original license
terms.