import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

export const TASK_REPORT_VIEW_TYPE = "task-manager-report";
export const TASK_REPORT_DISPLAY_TEXT = "Task Report";

// Priority to Text mapping
function getPriorityText(priority: number): string {
    switch (priority) {
        case 1: return "High";
        case 2: return "Medium";
        case 3: return "Low";
        default: return "Unknown";
    }
}

/**
 * Custom ItemView for displaying tasks in a sortable and filterable table.
 * This view allows users to see all tasks from their vault, interact with them (edit priority/completion),
 * filter them by various criteria, and sort them.
 */
export class TaskReportView extends ItemView {
    plugin: MyTaskPlugin;
    tasks: TaskItem[] = []; // Master list of all tasks fetched from the vault.
    contentEl: HTMLElement; // The root HTML element for this view's content.

    // Filter state properties
    private filterKeyword: string = "";
    private filterPriority: string = "all"; // Valid values: "all", "1", "2", "3"
    private filterFilePath: string = "";
    private filterCompletion: string = "all"; // Valid values: "all", "completed", "inProgress", "notStarted"

    // Tasks to be displayed after filtering and sorting are applied.
    private displayedTasks: TaskItem[] = [];

    // Sorting state properties
    private sortColumn: keyof TaskItem | null = null; // Column key currently used for sorting.
    private sortDirection: 'asc' | 'desc' = 'asc'; // Current sort direction.

    /**
     * Constructs the TaskReportView.
     * @param leaf The WorkspaceLeaf this view is associated with.
     * @param plugin A reference to the main MyTaskPlugin instance.
     */
    constructor(leaf: WorkspaceLeaf, plugin: MyTaskPlugin) {
        super(leaf);
        this.plugin = plugin;
        // this.containerEl is the root element for any ItemView.
        // Children[0] is usually the title bar, children[1] is the content area.
        this.contentEl = this.containerEl.children[1] as HTMLElement;
    }

    /**
     * Returns the unique type identifier for this view.
     */
    getViewType(): string {
        return TASK_REPORT_VIEW_TYPE; // Identifies this view type
    }

    /**
     * Returns the text displayed in the view's tab header.
     */
    getDisplayText(): string {
        return TASK_REPORT_DISPLAY_TEXT; // Text shown in the view tab
    }

    /**
     * Returns the name of the icon to be displayed in the view's tab header.
     */
    getIcon(): string {
        return "list-checks"; // Obsidian icon name for the view tab
    }

    /**
     * Called when the view is first opened or is reopened.
     * Sets up the static UI elements like title, filter controls, and refresh button.
     * Then triggers the initial loading and rendering of tasks.
     */
    async onOpen() {
        this.contentEl.empty();
        this.contentEl.createEl("h2", { text: TASK_REPORT_DISPLAY_TEXT });

        // Filter Controls Container
        const filterControlsContainer = this.contentEl.createDiv({ cls: "task-manager-filter-controls" });
        filterControlsContainer.style.marginBottom = "10px";
        filterControlsContainer.style.display = "flex"; // Arrange filters inline
        filterControlsContainer.style.flexWrap = "wrap"; // Allow wrapping
        filterControlsContainer.style.gap = "10px"; // Space between filter elements

        // Keyword filter
        const keywordFilterGroup = filterControlsContainer.createDiv();
        keywordFilterGroup.createEl("label", { text: "Keyword: ", cls:"task-manager-filter-label" });
        const keywordInput = keywordFilterGroup.createEl("input", { type: "text", placeholder: "Description..." });
        keywordInput.oninput = () => {
            this.filterKeyword = keywordInput.value.toLowerCase();
            this.applyFiltersAndRender();
        };

        // Priority filter
        const priorityFilterGroup = filterControlsContainer.createDiv();
        priorityFilterGroup.createEl("label", { text: "Priority: ", cls:"task-manager-filter-label" });
        const prioritySelect = priorityFilterGroup.createEl("select");
        prioritySelect.addOption("all", "All");
        prioritySelect.addOption("1", "High");
        prioritySelect.addOption("2", "Medium");
        prioritySelect.addOption("3", "Low");
        prioritySelect.onchange = () => {
            this.filterPriority = prioritySelect.value;
            this.applyFiltersAndRender();
        };

        // File Path filter
        const filePathFilterGroup = filterControlsContainer.createDiv();
        filePathFilterGroup.createEl("label", { text: "File Path: ", cls:"task-manager-filter-label" });
        const filePathInput = filePathFilterGroup.createEl("input", { type: "text", placeholder: "path contains..." });
        filePathInput.oninput = () => {
            this.filterFilePath = filePathInput.value.toLowerCase();
            this.applyFiltersAndRender();
        };

        // Completion filter
        const completionFilterGroup = filterControlsContainer.createDiv();
        completionFilterGroup.createEl("label", { text: "Completion: ", cls:"task-manager-filter-label" });
        const completionSelect = completionFilterGroup.createEl("select");
        completionSelect.addOption("all", "All");
        completionSelect.addOption("notStarted", "Not Started (0%)");
        completionSelect.addOption("inProgress", "In Progress (1-99%)");
        completionSelect.addOption("completed", "Completed (100%)");
        completionSelect.onchange = () => {
            this.filterCompletion = completionSelect.value;
            this.applyFiltersAndRender();
        };


        const refreshButton = this.contentEl.createEl("button", { text: "Refresh All Tasks" });
        refreshButton.style.marginTop = "5px"; // Add some space if filters wrap
        refreshButton.onclick = async () => {
          await this.loadAndDisplayTasks(); // This will load all, then applyFiltersAndRender
        };

        const tableContainer = this.contentEl.createDiv({ cls: "task-manager-report-table-container" });
        tableContainer.style.marginTop = "10px";

        await this.loadAndDisplayTasks(); // Initial load of tasks
    }

    /**
     * Called when the view is closed.
     * Currently, no specific cleanup actions are required.
     */
    async onClose() {
        // Nothing to clean up for now
        // Could be used to unsubscribe from events or clear intervals if added later.
    }

    /**
     * Applies the current filter criteria to the master list of tasks (`this.tasks`),
     * stores the result in `this.displayedTasks`, and then triggers sorting and re-rendering.
     * The filter logic checks for matches in description (keyword), priority, file path, and completion status.
     */
    applyFiltersAndRender() {
        // Filter logic:
        // - Keyword: checks if task description includes the filter keyword (case-insensitive).
        // - Priority: checks if task priority matches the selected filter (or "all").
        // - FilePath: checks if task file path includes the filter string (case-insensitive).
        // - Completion: checks if task completion status matches the selected category.
        this.displayedTasks = this.tasks.filter(task => {
            const keywordMatch = !this.filterKeyword || task.description.toLowerCase().includes(this.filterKeyword);
            const priorityMatch = this.filterPriority === "all" || String(task.priority) === this.filterPriority;
            const filePathMatch = !this.filterFilePath || task.filePath.toLowerCase().includes(this.filterFilePath);

            let completionMatch = false;
            if (this.filterCompletion === "all") {
                completionMatch = true;
            } else if (this.filterCompletion === "notStarted" && task.completion === 0) {
                completionMatch = true;
            } else if (this.filterCompletion === "inProgress" && task.completion > 0 && task.completion < 100) {
                completionMatch = true;
            } else if (this.filterCompletion === "completed" && task.completion === 100) {
                completionMatch = true;
            }

            return keywordMatch && priorityMatch && filePathMatch && completionMatch;
        });
        // After filtering, sort the results before rendering.
        this.sortAndRenderTasks();
    }

    /**
     * Sorts the `this.displayedTasks` array based on the current `this.sortColumn`
     * and `this.sortDirection`, then calls `this.renderTasks()` to update the UI.
     * Handles various data types (date, number, string) for comparison.
     */
    sortAndRenderTasks() {
        if (this.sortColumn) {
            this.displayedTasks.sort((a, b) => {
                const valA = a[this.sortColumn as keyof TaskItem]; // Get value of sort column for task A
                const valB = b[this.sortColumn as keyof TaskItem]; // Get value of sort column for task B

                let comparison = 0;

                // Type-specific comparison logic:
                // - dueDate: Compare as dates; nulls/invalid dates go to the end.
                // - number (priority, completion): Numerical comparison.
                // - string (description, filePath): Case-insensitive locale comparison.
                // - Fallback: Treat as strings.
                if (this.sortColumn === 'dueDate') {
                    const dateA = a.dueDate ? new Date(a.dueDate) : null;
                    const dateB = b.dueDate ? new Date(b.dueDate) : null;
                    if (dateA === null && dateB === null) comparison = 0;
                    else if (dateA === null) comparison = 1; // Null dates go to the end
                    else if (dateB === null) comparison = -1;
                    else comparison = dateA.getTime() - dateB.getTime();
                } else if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                } else if (typeof valA === 'string' && typeof valB === 'string') {
                    comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
                } else {
                    // Fallback for mixed types or other types - treat as strings
                    const strA = String(valA).toLowerCase();
                    const strB = String(valB).toLowerCase();
                    comparison = strA.localeCompare(strB);
                }

                // Apply sort direction (ascending or descending)
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });
        }
        this.renderTasks(); // Re-render the table with sorted tasks.
    }

    /**
     * Handles a click on a table header to request sorting by that column.
     * If the column is already the sort column, it toggles the sort direction.
     * Otherwise, it sets the new sort column and defaults to ascending direction.
     * @param columnKey The key of the TaskItem property to sort by.
     */
    handleSortRequest(columnKey: keyof TaskItem) {
        if (this.sortColumn === columnKey) {
            // Toggle direction if same column is clicked
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Set new sort column and default to ascending
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }
        this.sortAndRenderTasks(); // Apply the new sort and re-render.
    }

    /**
     * Fetches all tasks from markdown files in the vault, stores them in `this.tasks` (the master list),
     * and then applies current filters and sorting before rendering the `displayedTasks`.
     * This is the primary method for initially loading or refreshing task data.
     */
    async loadAndDisplayTasks() {
        this.tasks = []; // Clear the master list before reloading
        const markdownFiles = this.app.vault.getMarkdownFiles();

        for (const file of markdownFiles) {
            const fileContent = await this.app.vault.cachedRead(file);
            const tasksInFile = findTasksInFileContent(fileContent, file.path);
            this.tasks.push(...tasksInFile);
        }

        // After loading all tasks, apply current filters and sort before the first render.
        this.applyFiltersAndRender();
    }

    /**
     * Renders the `this.displayedTasks` (which are already filtered and sorted) into the HTML table.
     * This method clears the existing table content and rebuilds it.
     * Table headers are made clickable for sorting.
     * Task cells for priority and completion are made editable via helper methods.
     */
    renderTasks() {
        let tableContainer = this.contentEl.querySelector(".task-manager-report-table-container");
        if (!tableContainer) { // Should exist from onOpen, but good to double check
            tableContainer = this.contentEl.createDiv({ cls: "task-manager-report-table-container" });
            tableContainer.style.marginTop = "10px";
        }
        tableContainer.empty(); // Clear previous table content

        if (this.displayedTasks.length === 0) {
            tableContainer.createEl("p", { text: "No tasks match the current filters, or no tasks found." });
            return;
        }

        const table = tableContainer.createEl("table");
        table.addClass("task-manager-report-view"); // Apply CSS class for styling

        const thead = table.createTHead();
        const headerRow = thead.insertRow();

        // Helper function to create sortable table headers.
        // Adds click listeners and visual indicators for sorting.
        const createSortableHeader = (text: string, key: keyof TaskItem) => {
            const th = headerRow.insertCell();
            th.setText(text);
            th.style.cursor = "pointer"; // Indicate clickable header
            if (this.sortColumn === key) {
                // Add class for styling sorted column and append sort direction indicator
                th.addClass(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
                th.setText(`${text} ${this.sortDirection === 'asc' ? '▲' : '▼'}`);
            }
            th.onclick = () => this.handleSortRequest(key); // Set click handler
        };

        // Create all table headers
        createSortableHeader("Description", "description");
        createSortableHeader("Due Date", "dueDate");
        createSortableHeader("Priority", "priority");
        createSortableHeader("Completion (%)", "completion");
        createSortableHeader("File", "filePath");

        // Table Body: Iterates over `this.displayedTasks` (which are already filtered and sorted).
        const tbody = table.createTBody();
        for (const task of this.displayedTasks) {
            // ... (row creation and cell population logic remains the same)
            // This part doesn't change as displayedTasks is already sorted.
            const row = tbody.insertRow();
            row.insertCell().setText(task.description);
            row.insertCell().setText(task.dueDate || "-");

            // Priority Cell - Make it editable
            const priorityCell = row.insertCell();
            this.createEditablePriorityCell(priorityCell, task);

            // Completion Cell - Make it editable
            const completionCell = row.insertCell();
            this.createEditableCompletionCell(completionCell, task);

            // Make file clickable
            const fileCell = row.insertCell();
            const fileLink = fileCell.createEl('a', {
                text: task.filePath,
                href: '#', // Prevent navigation
            });
            fileLink.onclick = (event) => {
                event.preventDefault();
                this.app.workspace.openLinkText(task.filePath, task.filePath, false, {
                    state: { line: task.lineNumber }
                });
            };
            // row.insertCell().setText(String(task.lineNumber));
        }
    }

    /**
     * Creates an editable priority cell for a task in the table.
     * Displays priority as text, converting to a dropdown on click for editing.
     * @param cell The HTMLTableCellElement to populate.
     * @param task The TaskItem associated with this row.
     */
    private createEditablePriorityCell(cell: HTMLElement, task: TaskItem) {
        cell.empty();
        const priorityText = getPriorityText(task.priority); // Helper to convert 1,2,3 to High,Medium,Low
        const displayEl = cell.createSpan({ text: priorityText });
        displayEl.style.cursor = "pointer";

        displayEl.onclick = () => {
            cell.empty(); // Clear the text display
            const selectEl = cell.createEl("select");
            selectEl.addOption("1", "High");
            selectEl.addOption("2", "Medium");
            selectEl.addOption("3", "Low");
            selectEl.value = String(task.priority); // Set current priority

            // Save on blur (losing focus) or change
            selectEl.onblur = async () => {
                await this.handleTaskUpdate(task.id, 'priority', parseInt(selectEl.value, 10));
            };
            selectEl.onchange = async () => {
                 await this.handleTaskUpdate(task.id, 'priority', parseInt(selectEl.value, 10));
            };
            selectEl.focus(); // Auto-focus the select element
        };
    }

    /**
     * Creates an editable completion cell for a task in the table.
     * Displays completion as text (e.g., "50%"), converting to a number input on click.
     * @param cell The HTMLTableCellElement to populate.
     * @param task The TaskItem associated with this row.
     */
    private createEditableCompletionCell(cell: HTMLElement, task: TaskItem) {
        cell.empty();
        const displayText = String(task.completion) + "%";
        const displayEl = cell.createSpan({ text: displayText });
        displayEl.style.cursor = "pointer";

        displayEl.onclick = () => {
            cell.empty(); // Clear the text display
            const inputEl = cell.createEl("input", { type: "number" });
            inputEl.value = String(task.completion);
            inputEl.min = "0";
            inputEl.max = "100";
            inputEl.style.width = "60px"; // Keep input field small

            const saveValue = async () => {
                let val = parseInt(inputEl.value, 10);
                // Validate and clamp the value
                if (isNaN(val)) val = task.completion; // Revert if not a number
                if (val < 0) val = 0;
                if (val > 100) val = 100;
                await this.handleTaskUpdate(task.id, 'completion', val);
            };

            inputEl.onblur = saveValue; // Save when input loses focus
            inputEl.onkeydown = (e) => { // Save on Enter, revert on Escape
                if (e.key === "Enter") {
                    e.preventDefault();
                    saveValue();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    this.createEditableCompletionCell(cell, task); // Re-render original text
                }
            };
            inputEl.focus(); // Auto-focus and select current value
            inputEl.select();
        };
    }

    /**
     * Handles the update of a task's field (priority or completion) from the UI.
     * It calls the plugin's method to update the task in the file and then refreshes the view.
     * @param taskId The ID of the task to update.
     * @param updatedField The field that was changed ('priority' or 'completion').
     * @param newValue The new value for the field.
     */
    async handleTaskUpdate(taskId: string, updatedField: 'priority' | 'completion', newValue: any) {
        const task = this.tasks.find(t => t.id === taskId); // Find task from master list
        if (!task) {
            new Notice("Error: Task not found for update.");
            return;
        }

        // Note: Optimistic UI updates (updating the UI immediately before confirming save)
        // could be implemented here for better perceived performance, but would require
        // careful state management to revert on error.

        try {
            // Call the plugin method to update the task data in its source file
            await this.plugin.updateTaskInFile(task, updatedField, newValue);
            new Notice(`Task ${updatedField} updated!`);
        } catch (error) {
            new Notice(`Error updating task: ${error.message}`);
            // If an optimistic update was made, it should be reverted here.
        }
        // Full refresh from source to ensure data integrity and reflect changes
        await this.loadAndDisplayTasks();
    }
}

/**
 * Represents a single task item managed by the plugin.
 */
export interface TaskItem {
    /**
     * Unique identifier for the task.
     * Currently implemented as `filePath-lineNumber`.
     * Consider using UUIDs if tasks need to be uniquely identifiable across file moves/renames
     * or for features like cross-task dependencies in the future.
     */
    id: string;
    description: string;    // The main description of the task.
    dueDate?: string;       // Optional due date in YYYY-MM-DD format.
    priority: number;       // Task priority: 1 (High), 2 (Medium), 3 (Low).
    completion: number;     // Task completion percentage (0-100).
    filePath: string;       // Absolute path to the markdown file containing the task.
    lineNumber: number;     // Line number within the file where the task is defined.
    rawLine: string;        // The original, unmodified markdown line for this task. Used for reconstruction.
}

const TASK_MARKER = "%%task-plugin:";
const TASK_MARKER_END = "%%";

/**
 * Parses a single line of markdown to extract task information.
 * Tasks are expected in the format: "- [ ] Task description %%task-plugin:{\"key\":\"value\"}%%"
 * @param line The markdown line to parse.
 * @param filePath The path of the file containing the line.
 * @param lineNumber The line number in the file.
 * @returns A TaskItem object if a valid task is found, otherwise null.
 */
export function parseTask(line: string, filePath: string, lineNumber: number): TaskItem | null {
    const markerIndex = line.indexOf(TASK_MARKER);
    if (markerIndex === -1) {
        return null; // Not a task line
    }

    const endIndex = line.indexOf(TASK_MARKER_END, markerIndex + TASK_MARKER.length);
    if (endIndex === -1) {
        return null; // Malformed task
    }

    const jsonDataString = line.substring(markerIndex + TASK_MARKER.length, endIndex);
    let taskData;
    try {
        taskData = JSON.parse(jsonDataString);
    } catch (e) {
        console.error("Failed to parse task JSON: ", jsonDataString, e);
        return null; // Invalid JSON
    }

    // Extract description (text before the marker)
    // This handles standard markdown task formats like "- [ ] " or "- [x] "
    let description = line.substring(0, markerIndex).trim();
    const taskCheckboxRegex = /^\s*-\s*\[([x ])\]\s*/; // Matches "- [ ] " or "- [x] "
    const checkboxMatch = description.match(taskCheckboxRegex);
    if (checkboxMatch) {
        description = description.substring(checkboxMatch[0].length).trim();
    }


    // Basic validation
    if (typeof description !== 'string' || description.trim() === "") {
        // If we couldn't get a description from before the marker, maybe it's inside the JSON
         if (typeof taskData.description !== 'string' || taskData.description.trim() === "") {
            console.warn("Task description is missing or invalid:", line);
            return null;
        }
        description = taskData.description; // Use description from JSON if available
    }


    return {
        id: `${filePath}-${lineNumber}`, // Simple ID for now
        description: description,
        dueDate: taskData.dueDate,
        priority: typeof taskData.priority === 'number' ? taskData.priority : 3, // Default to low priority
        completion: typeof taskData.completion === 'number' ? taskData.completion : 0, // Default to 0%
        filePath,
        lineNumber,
        rawLine: line,
    };
}

/**
 * Finds all tasks within the content of a given file.
 * @param fileContent The full string content of the markdown file.
 * @param filePath The path of the file being processed.
 * @returns An array of TaskItem objects found in the file.
 */
export function findTasksInFileContent(fileContent: string, filePath: string): TaskItem[] {
    const tasks: TaskItem[] = [];
    const lines = fileContent.split('\n');
    lines.forEach((line, index) => {
        const task = parseTask(line, filePath, index);
        if (task) {
            tasks.push(task);
        }
    });
    return tasks;
}

/**
 * Modal dialog for users to input details for a new task.
 * It collects description, due date, priority, and completion status,
 * then calls a submit callback to insert the task into the editor.
 */
class TaskInsertionModal extends Modal {
    plugin: MyTaskPlugin;
    onSubmit: (description: string, dueDate: string, priority: number, completion: number) => void;

    // Properties to store input values
    description: string = "";
    dueDate: string = "";
    priority: number = 2; // Default Medium
    completion: number = 0; // Default 0%

    /**
     * @param app The Obsidian App instance.
     * @param plugin Reference to the main plugin class.
     * @param onSubmit Callback function to execute when the task is saved.
     *                 It receives the description, due date, priority, and completion.
     */
    constructor(app: App, plugin: MyTaskPlugin, onSubmit: (description: string, dueDate: string, priority: number, completion: number) => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    /**
     * Called when the modal is opened. Sets up the UI elements for task input.
     */
    onOpen() {
        const { contentEl } = this;
        contentEl.empty(); // Clear previous content if the modal was opened before

        contentEl.createEl("h2", { text: "Add New Task" });

        // Description
        new Setting(contentEl)
            .setName("Description")
            .setDesc("What needs to be done?")
            .addText(text => {
                text.setPlaceholder("Enter task description")
                    .setValue(this.description)
                    .onChange(value => this.description = value);
                text.inputEl.style.width = "100%"; // Make input wider
            });

        // Due Date
        new Setting(contentEl)
            .setName("Due Date (Optional)")
            .setDesc("When should it be done by? (YYYY-MM-DD)")
            .addText(text => {
                text.setPlaceholder("YYYY-MM-DD")
                    .setValue(this.dueDate)
                    .onChange(value => this.dueDate = value);
            });

        // Priority
        new Setting(contentEl)
            .setName("Priority")
            .addDropdown(dropdown => {
                dropdown.addOption("1", "High")
                        .addOption("2", "Medium")
                        .addOption("3", "Low")
                        .setValue(String(this.priority))
                        .onChange(value => this.priority = parseInt(value, 10));
            });

        // Completion
        new Setting(contentEl)
            .setName("Completion (%)")
            .addText(text => { // Using text for now, can be enhanced to number type with validation
                text.setPlaceholder("0-100")
                    .setValue(String(this.completion))
                    .onChange(value => {
                        let num = parseInt(value, 10);
                        if (isNaN(num)) num = 0;
                        if (num < 0) num = 0;
                        if (num > 100) num = 100;
                        this.completion = num;
                    });
                text.inputEl.type = "number"; // Set input type to number
                text.inputEl.min = "0";
                text.inputEl.max = "100";
            });

        // Submit Button
        new Setting(contentEl)
            .addButton(button => {
                button.setButtonText("Save Task")
                    .setCta() // Makes it more prominent
                    .onClick(() => {
                        if (!this.description.trim()) {
                            new Notice("Task description cannot be empty.");
                            return;
                        }
                        this.onSubmit(this.description, this.dueDate, this.priority, this.completion);
                        this.close();
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

export default class MyTaskPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // Register the view
        this.registerView(TASK_REPORT_VIEW_TYPE, (leaf) => new TaskReportView(leaf, this));

        // Add ribbon icon to open the view
        this.addRibbonIcon('list-checks', TASK_REPORT_DISPLAY_TEXT, () => {
            this.activateView();
        });

        // Add command to open the view
        this.addCommand({
            id: 'open-task-report',
            name: 'Open Task Report',
            callback: () => {
                this.activateView();
            }
        });

        // Command to insert tasks (from previous step)
        this.addCommand({
            id: 'insert-new-task',
            name: 'Insert New Task',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                new TaskInsertionModal(this.app, this, (description, dueDate, priority, completion) => {
                    const taskData = {
                        dueDate: dueDate || undefined,
                        priority,
                        completion
                    };
                    const taskString = `- [ ] ${description.trim()} ${TASK_MARKER}${JSON.stringify(taskData)}${TASK_MARKER_END}`;
                    editor.replaceSelection(taskString + '\n');
                }).open();
            }
        });

        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });

        // This adds a complex command that can check availability of command dynamically
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            console.log('click', evt);
        });

        // When registering intervals, this function setInterval ensures intervals are cleared when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.addSettingTab(new SampleSettingTab(this.app, this)); // Assuming this is still wanted
    }

    async activateView() {
        const existingLeaves = this.app.workspace.getLeavesOfType(TASK_REPORT_VIEW_TYPE);
        if (existingLeaves.length > 0) {
            this.app.workspace.revealLeaf(existingLeaves[0]);
            return;
        }

        const newLeaf = this.app.workspace.getLeaf(true); // 'true' for new leaf, or 'split' for splitting
        await newLeaf.setViewState({
            type: TASK_REPORT_VIEW_TYPE,
            active: true,
        });
        this.app.workspace.revealLeaf(newLeaf);
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(TASK_REPORT_VIEW_TYPE);
    }

    /**
     * Updates a task directly in its source markdown file.
     * This method reads the file, modifies the specific line corresponding to the task,
     * and then writes the changes back to the file.
     * It carefully reconstructs the task line to preserve the description part and other
     * JSON fields within the task marker, only updating the specified field.
     *
     * @param taskToUpdate The TaskItem object of the task to be updated.
     *                     This object contains the original rawLine and lineNumber.
     * @param updatedField The specific field of the task to update ('priority' or 'completion').
     * @param newValue The new value for the field.
     * @throws Error if the file is not found, the line number is out of bounds,
     *               the task marker is not found, or JSON parsing/stringifying fails.
     */
    async updateTaskInFile(taskToUpdate: TaskItem, updatedField: 'priority' | 'completion', newValue: any) {
        const file = this.app.vault.getAbstractFileByPath(taskToUpdate.filePath);
        if (!(file instanceof TFile)) { // Ensure it's a file and not a folder
            console.error("File not found or is not a TFile:", taskToUpdate.filePath);
            throw new Error("Source file not found.");
        }

        const fileContent = await this.app.vault.read(file);
        const lines = fileContent.split('\n');

        if (taskToUpdate.lineNumber >= lines.length) {
            console.error("Line number out of bounds:", taskToUpdate);
            throw new Error("Task line not found (file may have changed).");
        }

        const originalLine = lines[taskToUpdate.lineNumber];

        // Locate the task metadata block (e.g., %%task-plugin:{...}%%)
        const markerIndex = originalLine.indexOf(TASK_MARKER);
        const endIndex = originalLine.indexOf(TASK_MARKER_END, markerIndex + TASK_MARKER.length);

        if (markerIndex === -1 || endIndex === -1) {
            console.error("Task marker not found in line:", originalLine, "at", taskToUpdate.filePath, taskToUpdate.lineNumber);
            throw new Error("Task data format error in file. Marker not found.");
        }

        // Extract the part of the line before the marker (description, checkbox)
        const descriptionPart = originalLine.substring(0, markerIndex);
        // Extract the JSON string from the metadata block
        const jsonDataString = originalLine.substring(markerIndex + TASK_MARKER.length, endIndex);
        let taskData;
        try {
            taskData = JSON.parse(jsonDataString); // Parse existing JSON data
        } catch (e) {
            console.error("Failed to parse existing task JSON:", jsonDataString, "Error:", e);
            throw new Error("Could not parse existing task data from file.");
        }

        // Update only the specified field in the parsed data
        taskData[updatedField] = newValue;

        // Ensure fields that might be undefined are handled correctly (e.g., not stringified as "undefined")
        // This is particularly important if other optional fields are added later.
        if (taskData.dueDate === undefined) {
            delete taskData.dueDate; // Remove from object if undefined to keep JSON clean
        }
        // Add similar checks for other optional fields if they exist.

        // Reconstruct the new JSON string and the new full task line
        const newJsonDataString = JSON.stringify(taskData);
        // Ensure there's a space before the task marker if the description part is not empty.
        const newMarkerPart = `${TASK_MARKER}${newJsonDataString}${TASK_MARKER_END}`;
        const newLine = descriptionPart.trimRight().length > 0
            ? `${descriptionPart.trimRight()} ${newMarkerPart}`
            : newMarkerPart; // Handles cases where task might start with marker (though current parsing assumes it doesn't)


        lines[taskToUpdate.lineNumber] = newLine; // Replace the old line with the new one
        await this.app.vault.modify(file, lines.join('\n')); // Write the modified content back to the file
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyTaskPlugin;

    constructor(app: App, plugin: MyTaskPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    console.log('Secret: ' + value);
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
