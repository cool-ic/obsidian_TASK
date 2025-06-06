# Obsidian Task Manager Plugin

This plugin provides enhanced task management capabilities within Obsidian, allowing you to define tasks with metadata (due dates, priority, completion) directly in your notes and view them in an interactive report.

## Features

*   **Embeddable Tasks:** Define tasks anywhere in your markdown notes using a special syntax.
*   **Task Metadata:** Assign due dates, priority (High, Medium, Low), hidden status, and a detailed multi-line description to your tasks.
*   **Completion Status:** Task completion is managed directly via the markdown checkbox (`- [ ]` or `- [x]`).
*   **Task Insertion Command:** Easily insert new tasks (including summary, due date, priority, detailed description, and hidden status) using a command and a user-friendly modal.
*   **Interactive Task Report:**
    *   View all tasks from your vault in a single, sortable, and filterable table.
    *   **Columns:** Status (checkbox), Summary, Detailed Description, Due Date, Priority, Hidden, File.
    *   **Clickable File Links:** Navigate directly to the task in its source file.
    *   **Inline Editing:**
        *   Toggle task completion status using the checkbox in the "Status" column.
        *   Edit task summary (description), due date, and priority directly from the report.
        *   Toggle the "Hidden" status.
        *   Edit the "Detailed Description" in a multi-line text area.
        *   Changes are saved back to the source markdown file.
    *   **Filtering:** Filter tasks by keyword (in summary), priority, file path, completion status (Done/Pending), and visibility of hidden tasks.
    *   **Sorting:** Sort tasks by any column.
*   **Makefile for Development:** Includes `build`, `install`, and `dev` targets.

## How to Use

### 1. Defining Tasks Manually

You can define a task in any markdown note using the following format:

\`\`\`markdown
- [ ] Your task summary %%task-plugin:{"dueDate":"YYYY-MM-DD", "priority":N, "hidden":false, "detailedDescription":"More details..."}%%
\`\`\`

Where:
*   `- [ ]` or `- [x]` is the standard markdown task syntax, directly indicating if the task is pending or completed.
*   `Your task summary` is the main, concise description of the task.
*   `%%task-plugin:{...}%%` is the special marker for this plugin's task data. The content within the curly braces `{}` should be valid JSON.
*   `"dueDate":"YYYY-MM-DD"` (JSON property, Optional): The due date for the task. E.g., `"dueDate":"2024-12-31"`.
*   `"priority":N` (JSON property, Optional, defaults to Medium [2] when not specified): Priority of the task.
    *   `1`: High
    *   `2`: Medium
    *   `3`: Low
*   `"hidden":boolean` (JSON property, Optional, defaults to `false` when not specified): Set to `true` to mark the task as hidden (e.g., `"hidden":true`). It can be omitted for non-hidden tasks.
*   `"detailedDescription":"text"` (JSON property, Optional, defaults to empty when not specified): For longer, multi-line notes about the task (e.g., `"detailedDescription":"Further notes and context."`).

**Example:**
\`\`\`markdown
- [x] Project Alpha setup %%task-plugin:{"dueDate":"2024-07-01", "priority":1, "detailedDescription":"Initial server configuration and repo creation."}%%
- [ ] Weekly review %%task-plugin:{"priority":2, "hidden":true}%%
- [ ] Follow up with Jane %%task-plugin:{"dueDate":"2024-07-05", "detailedDescription":"Discuss Q3 budget."}%%
- [ ] Simple task with no extra metadata
\`\`\`
(Note: `hidden:false` and empty `detailedDescription` can be omitted from the JSON for brevity as they are defaults.)

### 2. Inserting Tasks via Command

1.  Open the command palette (usually `Ctrl+P` or `Cmd+P`).
2.  Search for "Task Manager: Insert New Task" and execute it.
3.  A modal will appear allowing you to input the task's description, due date (optional), priority, and completion percentage.
4.  Click "Save Task". The formatted task string will be inserted at your cursor's current position in the active note.

### 3. Using the Task Report

1.  Open the Task Report:
    *   Click the "Task Report" icon (looks like a checklist) in the left ribbon.
    *   Or, execute the "Task Manager: Open Task Report" command from the command palette.
2.  The report view will display all tasks found in your vault. The columns are: "Status", "Overdue", "Summary", "Detailed Desc.", "Due Date", "Priority", "Hidden", and "File".
3.  **Interacting with the Report:**
    *   **Navigation:** Click on a file path in the "File" column to open the note containing that task, scrolled to the relevant line.
    *   **Overdue Indicator:** The "Overdue" column displays 'Y' if an incomplete task's due date has passed. Such rows are highlighted with a light red background for easy identification.
    *   **Toggle Status:** Click the checkbox in the "Status" column to mark a task as done (`- [x]`) or pending (`- [ ]`). The change is saved automatically to the source file.
    *   **Editing Summary:** Click on the text in the "Summary" column. An input field will appear. Edit the summary and press Enter or click away to save.
    *   **Editing Detailed Description:** Click on the text in the "Detailed Desc." column. A multi-line textarea will appear. Edit the details and press Enter (without Shift) or click away to save. Use Shift+Enter for newlines within the description.
    *   **Editing Due Date:** Click on the date in the "Due Date" column. An input field will appear. Enter the new date (YYYY-MM-DD) or clear it, then press Enter or click away.
    *   **Editing Priority:** Click on a task's priority in the "Priority" column. A dropdown will appear. Select the new priority. The change is saved automatically.
    *   **Toggle Hidden:** Click on "Yes" or "No" in the "Hidden" column to toggle the task's hidden status. The change is saved automatically.
    *   **Filtering:** Use the input fields and dropdowns above the table to filter tasks by:
        *   Keyword in summary
        *   Priority
        *   Substring in file path
        *   Completion status (Done/Pending - based on the checkbox)
    *   **Show Hidden Tasks Toggle:** Use the "Show Hidden" toggle above the table to include or exclude tasks marked as "hidden" from the current view.
    *   **Sorting:** Click on any column header (e.g., "Due Date", "Priority", "Status") to sort the tasks by that column. Click again to toggle between ascending and descending order.
    *   **Refresh:** Click the "Refresh All Tasks" button to re-scan your vault for tasks and update the report.

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
