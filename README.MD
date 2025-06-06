# Obsidian Task Manager Plugin

This plugin provides enhanced task management capabilities within Obsidian, allowing you to define tasks with metadata (due dates, priority, completion) directly in your notes and view them in an interactive report.

## Features

*   **Embeddable Tasks:** Define tasks anywhere in your markdown notes using a special syntax.
*   **Task Metadata:** Assign due dates, priority (High, Medium, Low), and completion percentage to your tasks.
*   **Task Insertion Command:** Easily insert new tasks using a command and a user-friendly modal.
*   **Interactive Task Report:**
    *   View all tasks from your vault in a single, sortable, and filterable table.
    *   **Columns:** Description, Due Date, Priority, Completion (%), File.
    *   **Clickable File Links:** Navigate directly to the task in its source file.
    *   **Inline Editing:** Modify task priority and completion directly from the report. Changes are saved back to the markdown file.
    *   **Filtering:** Filter tasks by keyword, priority, file path, and completion status.
    *   **Sorting:** Sort tasks by any column.
*   **Makefile for Development:** Includes `build`, `install`, and `dev` targets.

## How to Use

### 1. Defining Tasks Manually

You can define a task in any markdown note using the following format:

```markdown
- [ ] Your task description %%task-plugin:{"dueDate":"YYYY-MM-DD", "priority":N, "completion":P}%%
```

Where:
*   `- [ ]` is the standard markdown task syntax (can also be `- [x]` for pre-completed).
*   `Your task description` is the text of your task.
*   `%%task-plugin:{...}%%` is the special marker for this plugin's task data. The content within the curly braces `{}` should be valid JSON.
*   `"dueDate":"YYYY-MM-DD"` (JSON property, Optional): The due date for the task. E.g., `"dueDate":"2024-12-31"`.
*   `"priority":N` (JSON property, Optional, defaults to Medium when not specified): Priority of the task.
    *   `1`: High
    *   `2`: Medium
    *   `3`: Low
*   `"completion":P` (JSON property, Optional, defaults to 0 when not specified): Completion percentage (0-100). E.g., `"completion":50`.

**Example:**
\`\`\`markdown
- [ ] Finalize project proposal %%task-plugin:{"dueDate":"2024-08-15", "priority":1, "completion":25}%%
- [ ] Buy groceries %%task-plugin:{"priority":2, "completion":0}%%
- [x] Send initial email %%task-plugin:{"completion":100}%%
\`\`\`

### 2. Inserting Tasks via Command

1.  Open the command palette (usually `Ctrl+P` or `Cmd+P`).
2.  Search for "Task Manager: Insert New Task" and execute it.
3.  A modal will appear allowing you to input the task's description, due date (optional), priority, and completion percentage.
4.  Click "Save Task". The formatted task string will be inserted at your cursor's current position in the active note.

### 3. Using the Task Report

1.  Open the Task Report:
    *   Click the "Task Report" icon (looks like a checklist) in the left ribbon.
    *   Or, execute the "Task Manager: Open Task Report" command from the command palette.
2.  The report view will display all tasks found in your vault.
3.  **Interacting with the Report:**
    *   **Navigation:** Click on a file path in the "File" column to open the note containing that task, scrolled to the relevant line.
    *   **Editing Priority:** Click on a task's priority in the table. A dropdown will appear. Select the new priority. The change is saved automatically to the source file.
    *   **Editing Completion:** Click on a task's completion percentage. An input field will appear. Enter the new percentage (0-100) and press Enter or click away. The change is saved automatically.
    *   **Filtering:** Use the input fields and dropdowns above the table to filter tasks by:
        *   Keyword in description
        *   Priority
        *   Substring in file path
        *   Completion status (Not Started, In Progress, Completed)
    *   **Sorting:** Click on any column header (e.g., "Due Date", "Priority") to sort the tasks by that column. Click again to toggle between ascending and descending order.
    *   **Refresh:** Click the "Refresh All Tasks" button to re-scan your vault for tasks.

## Installation and Development (Using Makefile)

1.  **Clone the Repository:**
    \`\`\`bash
    git clone <repository-url>
    cd obsidian-task-manager
    \`\`\`
2.  **Install Dependencies:**
    \`\`\`bash
    npm install
    \`\`\`
3.  **Configure Vault Path:**
    *   Open the `Makefile` in a text editor.
    *   Locate the line `OBSIDIAN_VAULT_PATH :=`.
    *   **Crucial:** Set this variable to the **absolute path** of your Obsidian vault.
        *   Example (macOS/Linux): `OBSIDIAN_VAULT_PATH := /Users/yourname/Documents/MyVault`
        *   Example (Windows): `OBSIDIAN_VAULT_PATH := C:/Users/yourname/Documents/MyVault` (use forward slashes)
4.  **Build and Install:**
    *   To build the plugin:
        \`\`\`bash
        make build
        \`\`\`
    *   To build and install into your configured vault:
        \`\`\`bash
        make install
        \`\`\`
5.  **Enable in Obsidian:**
    *   Open Obsidian.
    *   Go to `Settings` -> `Community plugins`.
    *   If you have restricted mode on, turn it off.
    *   Find "Task Manager" in the list of installed plugins and enable it.

### Other Makefile Targets

*   **`make dev`**: Starts the TypeScript compiler in watch mode. It will automatically recompile `main.ts` when you save changes.
*   **`make clean`**: Removes compiled JavaScript files (`main.js`, `main.js.map`) from the project root.

## Future Enhancements (Potential)

*   More robust task IDs (e.g., UUIDs) to better handle manual file edits.
*   Direct editing of due dates and descriptions from the report.
*   Gantt chart view.
*   Task dependencies.

---

This README provides a good overview for users and developers.
