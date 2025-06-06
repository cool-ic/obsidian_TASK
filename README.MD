[中文版](#中文版) | [English Version](#english-version)

---
## 中文版

# Obsidian 任务管理插件

本插件为 Obsidian 提供了增强的任务管理功能，允许您直接在笔记中定义包含元数据（如截止日期、优先级、隐藏状态和详细描述）的任务，并在一个交互式的报告中查看和管理它们。

## 功能特性

*   **可嵌入任务:** 使用特定语法在您的 Markdown 笔记中的任何位置定义任务。
*   **任务元数据:** 为您的任务分配截止日期、优先级（高、中、低）、隐藏状态以及详细的多行描述。
*   **完成状态:** 任务的完成状态直接通过 Markdown 复选框（`- [ ]` 或 `- [x]`）管理。
*   **任务插入命令:** 通过命令和用户友好的模态框，轻松插入新任务（包括摘要、截止日期、优先级、详细描述和隐藏状态）。
*   **交互式任务报告:**
    *   在单一、可排序、可筛选的表格中查看您库中的所有任务。
    *   **列:** 状态（复选框）、摘要、详细描述、截止日期、优先级、隐藏、文件。
    *   **可点击的文件链接:** 直接导航到任务在其源文件中的位置。
    *   **行内编辑:**
        *   使用“状态”列中的复选框切换任务的完成状态。
        *   直接从报告中编辑任务摘要、截止日期和优先级。
        *   切换“隐藏”状态。
        *   在多行文本区域中编辑“详细描述”。
        *   更改会自动保存回源 Markdown 文件。
    *   **筛选:** 按关键字（在摘要中）、优先级、文件路径、完成状态（已完成/待处理）以及隐藏任务的可见性来筛选任务。
    *   **排序:** 按任意列对任务进行排序。
    *   **“显示隐藏任务”切换:** 控制报告中是否显示标记为隐藏的任务。
    *   **“逾期”指示器:** “逾期”列显示 'Y' 表示未完成且已过期的任务。这些行会以浅红色背景高亮显示。
    *   **行颜色编码:**
        *   已完成任务：标准背景色。
        *   待处理（未逾期）任务：浅绿色背景。
        *   逾期任务（待处理且已过期）：浅红色背景。
*   **用于开发的 Makefile:** 包含 `build`、`install` 和 `dev` 等目标。

## 如何使用

### 1. 手动定义任务

您可以使用以下格式在任何 Markdown 笔记中定义任务：

```markdown
- [ ] 您的任务摘要 %%task-plugin:{"dueDate":"YYYY-MM-DD", "priority":N, "hidden":false, "detailedDescription":"更多详情..."}%%
```

说明：
*   `- [ ]` 或 `- [x]` 是标准的 Markdown 任务语法，直接表明任务是待处理还是已完成。
*   `您的任务摘要` 是任务的主要简洁描述。
*   `%%task-plugin:{...}%%` 是本插件任务数据的特殊标记。花括号 `{}` 中的内容应为有效的 JSON。
*   `"dueDate":"YYYY-MM-DD"` (JSON 属性, 可选): 任务的截止日期。例如：`"dueDate":"2024-12-31"`。
*   `"priority":N` (JSON 属性, 可选, 未指定时默认为中 [2]): 任务的优先级。
    *   `1`: 高
    *   `2`: 中
    *   `3`: 低
*   `"hidden":boolean` (JSON 属性, 可选, 未指定时默认为 `false`): 设置为 `true` 以将任务标记为隐藏。例如：`"hidden":true`。对于非隐藏任务可省略此属性。
*   `"detailedDescription":"text"` (JSON 属性, 可选, 未指定时默认为空): 用于记录关于任务的更长、可能多行的笔记。例如：`"detailedDescription":"更进一步的笔记和上下文。"`。

**示例:**
```markdown
- [x] 完成项目 Alpha 设置 %%task-plugin:{"dueDate":"2024-07-01", "priority":1, "detailedDescription":"初始服务器配置和仓库创建。"}%%
- [ ] 每周回顾 %%task-plugin:{"priority":2, "hidden":true}%%
- [ ] 跟进 Jane %%task-plugin:{"dueDate":"2024-07-05", "detailedDescription":"讨论第三季度预算。"}%%
- [ ] 没有额外元数据的简单任务
```
(注意: `hidden:false` 和空的 `detailedDescription` 可以从 JSON 中省略以保持简洁，因为它们是默认值。)

### 2. 通过命令插入任务

1.  打开命令面板 (通常是 `Ctrl+P` 或 `Cmd+P`)。
2.  搜索 "Task Manager: Insert New Task" 并执行它。
3.  一个模态框将会出现，允许您输入任务的摘要、截止日期 (可选)、优先级、详细描述 (可选) 和隐藏状态。
4.  点击 "Save Task"。格式化后的任务字符串将插入到当前笔记中光标所在位置。

### 3. 使用任务报告

1.  打开任务报告:
    *   点击左侧栏中的“任务报告”图标 (看起来像一个清单)。
    *   或者，从命令面板执行 "Task Manager: Open Task Report" 命令。
2.  报告视图将显示在您的库中找到的所有任务。列包括："状态"、"逾期"、"摘要"、"详细描述"、"截止日期"、"优先级"、"隐藏" 和 "文件"。
3.  **与报告交互:**
    *   **导航:** 点击“文件”列中的文件路径，以打开包含该任务的笔记，并滚动到相关行。
    *   **逾期指示器:** “逾期”列将为任何未完成且截止日期已过的任务显示 'Y'。
    *   **行颜色编码:** 为了快速识别状态：
        *   已完成的任务具有标准背景色。
        *   未完成且未逾期的任务具有浅绿色背景。
        *   未完成且已逾期的任务 (如“逾期”列中 'Y' 所示) 具有浅红色背景。
    *   **切换状态:** 点击“状态”列中的复选框，将任务标记为已完成 (`- [x]`) 或待处理 (`- [ ]`)。更改会自动保存到源文件。
    *   **编辑摘要:** 点击“摘要”列中的文本。一个输入框将会出现。编辑摘要后按 Enter 或点击别处以保存。
    *   **编辑详细描述:** 点击“详细描述”列中的文本。一个多行文本区域将会出现。编辑详情后按 Enter (不带 Shift) 或点击别处以保存。在描述中使用 Shift+Enter 进行换行。
    *   **编辑截止日期:** 点击“截止日期”列中的日期。一个输入框将会出现。输入新日期 (YYYY-MM-DD) 或清空它，然后按 Enter 或点击别处。
    *   **编辑优先级:** 点击“优先级”列中的任务优先级。一个下拉菜单将会出现。选择新的优先级。更改会自动保存。
    *   **切换隐藏状态:** 点击“隐藏”列中的 "Yes" 或 "No" 来切换任务的隐藏状态。更改会自动保存。
    *   **筛选:** 使用表格上方的输入框和下拉菜单来筛选任务：
        *   摘要中的关键字
        *   优先级
        *   文件路径中的子字符串
        *   完成状态 (已完成/待处理 - 基于复选框)
    *   **“显示隐藏任务”切换:** 使用表格上方的“显示隐藏”切换按钮来在当前视图中包含或排除标记为“隐藏”的任务。
    *   **排序:** 点击任何列标题 (例如，“截止日期”、“优先级”、“状态”) 以按该列对任务进行排序。再次点击以在升序和降序之间切换。
    *   **刷新:** 点击“刷新所有任务”按钮以重新扫描您的库中的任务并更新报告。
    *   **用于计算逾期的参考日期:** 报告头部会显示用于确定任务是否逾期的当前日期。

## 安装和开发 (使用 Makefile)

1.  **克隆仓库:**
    ```bash
    git clone <repository-url>
    cd obsidian_TASK
    ```
2.  **安装依赖:**
    ```bash
    npm install
    ```
3.  **配置 Vault 路径:**
    *   在文本编辑器中打开 `Makefile`。
    *   找到 `OBSIDIAN_VAULT_PATH :=` 这一行。
    *   **重要:** 将此变量设置为您的 Obsidian 库的**绝对路径**。
        *   示例 (macOS/Linux): `OBSIDIAN_VAULT_PATH := /Users/yourname/Documents/MyVault`
        *   示例 (Windows): `OBSIDIAN_VAULT_PATH := C:/Users/yourname/Documents/MyVault` (使用正斜杠)
4.  **构建和安装:**
    *   构建插件:
        ```bash
        make build
        ```
    *   构建并安装到您配置的库中:
        ```bash
        make install
        ```
5.  **在 Obsidian 中启用:**
    *   打开 Obsidian。
    *   进入 `设置` -> `社区插件`。
    *   如果处于限制模式，请关闭它。
    *   在已安装插件列表中找到 "Task Manager" 并启用它。

### 其他 Makefile 目标

*   **`make dev`**: 以观察模式启动 TypeScript 编译器。当您保存更改时，它将自动重新编译 `main.ts`。
*   **`make clean`**: 从项目根目录中删除已编译的 JavaScript 文件 (`main.js`, `main.js.map`)。

## 未来增强 (潜在)

*   更健壮的任务 ID (例如 UUID)，以更好地处理手动文件编辑。
*   甘特图视图。
*   任务依赖关系。

---
## English Version

# Obsidian Task Manager Plugin

This plugin provides enhanced task management capabilities within Obsidian, allowing you to define tasks with metadata (due dates, priority, hidden status, and detailed descriptions) directly in your notes and view/manage them in an interactive report.

## Features

*   **Embeddable Tasks:** Define tasks anywhere in your Markdown notes using a special syntax.
*   **Task Metadata:** Assign due dates, priority (High, Medium, Low), hidden status, and a detailed multi-line description to your tasks.
*   **Completion Status:** Task completion is managed directly via the Markdown checkbox (`- [ ]` or `- [x]`).
*   **Task Insertion Command:** Easily insert new tasks (including summary, due date, priority, detailed description, and hidden status) using a command and a user-friendly modal.
*   **Interactive Task Report:**
    *   View all tasks from your vault in a single, sortable, and filterable table.
    *   **Columns:** Status (checkbox), Summary, Detailed Description, Due Date, Priority, Hidden, File.
    *   **Clickable File Links:** Navigate directly to the task in its source file.
    *   **Inline Editing:**
        *   Toggle task completion status using the checkbox in the "Status" column.
        *   Edit task summary, due date, and priority directly from the report.
        *   Toggle the "Hidden" status.
        *   Edit the "Detailed Description" in a multi-line text area.
        *   Changes are saved back to the source Markdown file.
    *   **Filtering:** Filter tasks by keyword (in summary), priority, file path, completion status (Done/Pending), and visibility of hidden tasks.
    *   **Sorting:** Sort tasks by any column.
    *   **"Show Hidden Tasks" Toggle:** Controls whether tasks marked as hidden are displayed in the report.
    *   **"Overdue" Indicator:** The "Overdue" column displays 'Y' for incomplete tasks that are past their due date. These rows are highlighted with a light red background.
    *   **Row Color-Coding:**
        *   Completed tasks: Standard background color.
        *   Pending (not overdue) tasks: Light green background.
        *   Overdue tasks (pending and past due): Light red background.
*   **Makefile for Development:** Includes `build`, `install`, and `dev` targets.

## How to Use

### 1. Defining Tasks Manually

You can define a task in any Markdown note using the following format:

```markdown
- [ ] Your task summary %%task-plugin:{"dueDate":"YYYY-MM-DD", "priority":N, "hidden":false, "detailedDescription":"More details..."}%%
```

Where:
*   `- [ ]` or `- [x]` is the standard Markdown task syntax, directly indicating if the task is pending or completed.
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
```markdown
- [x] Project Alpha setup %%task-plugin:{"dueDate":"2024-07-01", "priority":1, "detailedDescription":"Initial server configuration and repo creation."}%%
- [ ] Weekly review %%task-plugin:{"priority":2, "hidden":true}%%
- [ ] Follow up with Jane %%task-plugin:{"dueDate":"2024-07-05", "detailedDescription":"Discuss Q3 budget."}%%
- [ ] Simple task with no extra metadata
```
(Note: `hidden:false` and empty `detailedDescription` can be omitted from the JSON for brevity as they are defaults.)

### 2. Inserting Tasks via Command

1.  Open the command palette (usually `Ctrl+P` or `Cmd+P`).
2.  Search for "Task Manager: Insert New Task" and execute it.
3.  A modal will appear allowing you to input the task's summary, due date (optional), priority, detailed description (optional), and hidden status.
4.  Click "Save Task". The formatted task string will be inserted at your cursor's current position in the active note.

### 3. Using the Task Report

1.  Open the Task Report:
    *   Click the "Task Report" icon (looks like a checklist) in the left ribbon.
    *   Or, execute the "Task Manager: Open Task Report" command from the command palette.
2.  The report view will display all tasks found in your vault. The columns are: "Status", "Overdue", "Summary", "Detailed Desc.", "Due Date", "Priority", "Hidden", and "File".
3.  **Interacting with the Report:**
    *   **Navigation:** Click on a file path in the "File" column to open the note containing that task, scrolled to the relevant line.
    *   **Overdue Indicator:** The "Overdue" column displays 'Y' for any task that is not completed and whose due date is in the past.
    *   **Row Color-Coding:** For at-a-glance status:
        *   Completed tasks have the standard background color.
        *   Incomplete tasks that are not overdue have a light green background.
        *   Incomplete tasks that are overdue (as indicated by 'Y' in the "Overdue" column) have a light red background.
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
    *   **Reference Date for Overdue Calc:** The report header displays the current date used for determining if tasks are overdue.

## Installation and Development (Using Makefile)

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd obsidian_TASK
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Vault Path:**
    *   Open the `Makefile` in a text editor.
    *   Locate the line `OBSIDIAN_VAULT_PATH :=`.
    *   **Crucial:** Set this variable to the **absolute path** of your Obsidian vault.
        *   Example (macOS/Linux): `OBSIDIAN_VAULT_PATH := /Users/yourname/Documents/MyVault`
        *   Example (Windows): `OBSIDIAN_VAULT_PATH := C:/Users/yourname/Documents/MyVault` (use forward slashes)
4.  **Build and Install:**
    *   To build the plugin:
        ```bash
        make build
        ```
    *   To build and install into your configured vault:
        ```bash
        make install
        ```
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
*   Gantt chart view.
*   Task dependencies.

---
This README provides a good overview for users and developers.
