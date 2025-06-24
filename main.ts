import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

export const TASK_REPORT_VIEW_TYPE = "task-manager-report";
export const TASK_REPORT_DISPLAY_TEXT = "Task Report";

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
    // private filterCompletion: string = "all"; // REMOVED

    // Tasks to be displayed after filtering and sorting are applied.
    private displayedTasks: TaskItem[] = [];

    // Sorting state properties
    private sortColumn: keyof TaskItem | null = null; // Column key currently used for sorting.
    private sortDirection: 'asc' | 'desc' = 'asc'; // Current sort direction.
    private showHiddenTasks: boolean = false;
    // private overdueReferenceDateEl: HTMLElement; // REMOVED property

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
        const keywordFilterGroup = filterControlsContainer.createDiv({ cls: "task-manager-filter-group" });
        keywordFilterGroup.createEl("label", { text: "Keyword: ", cls: "task-manager-filter-label" });
        const keywordInput = keywordFilterGroup.createEl("input", { type: "text", placeholder: "Summary..." });
        keywordInput.oninput = () => {
            this.filterKeyword = keywordInput.value.toLowerCase();
            this.applyFiltersAndRender();
        };

        // Priority filter
        const priorityFilterGroup = filterControlsContainer.createDiv({ cls: "task-manager-filter-group" });
        priorityFilterGroup.createEl("label", { text: "Priority: ", cls: "task-manager-filter-label" });
        const prioritySelect = priorityFilterGroup.createEl("select");
        prioritySelect.options.add(new Option("All", "all"));
        prioritySelect.options.add(new Option("High", "1"));
        prioritySelect.options.add(new Option("Medium", "2"));
        prioritySelect.options.add(new Option("Low", "3"));
        prioritySelect.onchange = () => {
            this.filterPriority = prioritySelect.value;
            this.applyFiltersAndRender();
        };

        // File Path filter
        const filePathFilterGroup = filterControlsContainer.createDiv({ cls: "task-manager-filter-group" });
        filePathFilterGroup.createEl("label", { text: "File Path: ", cls: "task-manager-filter-label" });
        const filePathInput = filePathFilterGroup.createEl("input", { type: "text", placeholder: "path contains..." });
        filePathInput.oninput = () => {
            this.filterFilePath = filePathInput.value.toLowerCase();
            this.applyFiltersAndRender();
        };

        // NEW: Toggle for showing hidden tasks
        const showHiddenFilterGroup = filterControlsContainer.createDiv({ cls: "task-manager-filter-group" }); // Ensure this group also has the class if desired for spacing/alignment
        new Setting(showHiddenFilterGroup) // Using Setting for consistent look and feel
            .setName("Show Hidden")
            .setDesc("Display tasks marked as hidden.") // Keep desc concise
            .addToggle(toggle => {
                toggle.setValue(this.showHiddenTasks)
                    .onChange(value => {
                        this.showHiddenTasks = value;
                        this.applyFiltersAndRender();
                    });
            });
        showHiddenFilterGroup.style.alignItems = "center"; // Align toggle nicely with a potential label if Setting didn't have one


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

            // REMOVED: completionStatusMatch logic
            // let completionStatusMatch = false;
            // if (this.filterCompletion === "all") {
            //     completionStatusMatch = true;
            // } else if (this.filterCompletion === "notStarted" && !task.isCompleted) { // Adjusted for isCompleted
            //     completionStatusMatch = true;
            // } else if (this.filterCompletion === "inProgress") {
            //     // "In Progress" is mapped to "not completed"
            //     completionStatusMatch = !task.isCompleted;
            // } else if (this.filterCompletion === "completed" && task.isCompleted) { // Adjusted for isCompleted
            //     completionStatusMatch = true;
            // }

            // NEW: Filter for hidden tasks
            const hiddenMatch = this.showHiddenTasks || !task.hidden; // If showHidden is true, always match. Otherwise, only match if task is not hidden.

            return keywordMatch && priorityMatch && filePathMatch && hiddenMatch; // Removed completionStatusMatch
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
        let tableContainer = this.contentEl.querySelector(".task-manager-report-table-container") as HTMLDivElement | null;
        if (!tableContainer) { // Should exist from onOpen, but good to double check
            // If it truly doesn't exist, create it. This path implies onOpen might not have run or was cleared.
            // For safety, ensuring it's created here if missing.
            tableContainer = this.contentEl.createDiv({ cls: "task-manager-report-table-container" });
            tableContainer.style.marginTop = "10px"; // Styles applied if created here.
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
        const createSortableHeader = (text: string, key: keyof TaskItem | 'status') => { // Allow 'status' for sorting later
            const th = headerRow.insertCell();
            th.setText(text);
            th.style.cursor = "pointer"; // Indicate clickable header
            // Casting key for TaskItem access, handle 'status' separately if it's not a direct key
            const sortKey = key === 'status' ? 'isCompleted' : key;
            if (this.sortColumn === sortKey) {
                // Add class for styling sorted column and append sort direction indicator
                th.addClass(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
                th.setText(`${text} ${this.sortDirection === 'asc' ? '▲' : '▼'}`);
            }
            th.onclick = () => this.handleSortRequest(sortKey as keyof TaskItem); // Cast needed
        };

        // Create all table headers
        headerRow.empty(); // Clear existing headers to redefine order

        createSortableHeader("Status", "isCompleted");
        createSortableHeader("File", "filePath");
        createSortableHeader("Summary", "description");
        createSortableHeader("Detailed Desc.", "detailedDescription");
        createSortableHeader("Due Date", "dueDate");
        createSortableHeader("Priority", "priority");
        createSortableHeader("Hidden", "hidden");
        // "Overdue" TH IS REMOVED

        // Table Body: Iterates over `this.displayedTasks` (which are already filtered and sorted).
        const tbody = table.createTBody();
        for (const task of this.displayedTasks) {
            const row = tbody.insertRow();

            // --- MODIFIED Row Styling Logic ---
            row.removeClass('task-overdue');
            row.removeClass('task-pending-not-overdue');

            let isOverdue = false; // Calculate once for use in "Overdue" cell text and row styling
            if (!task.isCompleted && task.dueDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDateObj = new Date(task.dueDate + "T00:00:00");
                if (dueDateObj < today) {
                    isOverdue = true;
                }
            }

            // Apply styling based on isCompleted and isOverdue
            if (task.isCompleted) {
                // No special background for completed tasks
            } else if (isOverdue) {
                row.addClass('task-overdue'); // Apply light red
            } else { // Not completed and not overdue
                row.addClass('task-pending-not-overdue'); // Apply light green
            }
            // --- End of MODIFIED Row Styling Logic ---

            // 1. Status Cell (checkbox)
            const statusCell = row.insertCell();
            statusCell.empty();
            const statusCheckbox = statusCell.createEl('input', { type: 'checkbox' });
            statusCheckbox.checked = task.isCompleted;
            statusCheckbox.onchange = async () => {
                await this.handleTaskUpdate(task.id, 'isCompleted', statusCheckbox.checked);
            };

            // 2. File Cell (link)
            const fileCell = row.insertCell();
            const fileLink = fileCell.createEl('a', {
                text: task.filePath,
                href: '#',
            });
            fileLink.onclick = (event) => {
                event.preventDefault();
                this.app.workspace.openLinkText(task.filePath, task.filePath, false, {
                    state: { line: task.lineNumber }
                });
            };
            // "Overdue" Y/N Cell is REMOVED (was here in previous logic)

            // 3. Summary Cell (editable text)
            const summaryCell = row.insertCell();
            this.createEditableDescriptionCell(summaryCell, task);

            // Detailed Description Cell - Make it interactive
            const detailedDescCell = row.insertCell();
            detailedDescCell.empty(); // Clear previous content

            const displayFullDescription = () => {
                detailedDescCell.empty();
                const DDescLength = 50; // Max length for preview
                const previewText = task.detailedDescription.substring(0, DDescLength) +
                                    (task.detailedDescription.length > DDescLength ? "..." : "");

                const textSpan = detailedDescCell.createSpan({ text: previewText || "-" }); // Show "-" if empty
                textSpan.title = task.detailedDescription || "Click to add detailed description";
                textSpan.style.cursor = "pointer";

                textSpan.onclick = () => {
                    detailedDescCell.empty();
                    const textArea = detailedDescCell.createEl('textarea');
                    textArea.value = task.detailedDescription;
                    textArea.style.width = "95%"; // Adjust as needed
                    textArea.style.minHeight = "60px";
                    textArea.rows = 3; // Initial rows

                    const saveValue = async () => {
                        const newDesc = textArea.value; // No trim, allow leading/trailing spaces if user wants
                        if (newDesc !== task.detailedDescription) {
                             await this.handleTaskUpdate(task.id, 'detailedDescription', newDesc);
                        } else {
                            // If no change, revert to display mode without saving or full refresh
                            displayFullDescription();
                        }
                        // Note: handleTaskUpdate will trigger a full refresh, which re-calls displayFullDescription
                    };

                    textArea.onblur = () => {
                        // A short delay to allow click on a potential save button if added later
                        // For now, direct save on blur.
                        saveValue();
                    };

                    textArea.onkeydown = (e) => {
                        if (e.key === "Escape") {
                            e.preventDefault();
                            displayFullDescription(); // Revert to display
                        }
                        // Enter key (with or without Shift) now defaults to inserting a newline.
                        // No explicit save on Enter.
                    };
                    textArea.focus();
                };
            };

            displayFullDescription(); // Initial render of the cell

            // DueDate Cell - Editable
            const dueDateCell = row.insertCell();
            this.createEditableDueDateCell(dueDateCell, task);

            // Priority Cell - Editable
            const priorityCell = row.insertCell();
            this.createEditablePriorityCell(priorityCell, task);

            // Hidden Cell - Make it interactive
            const hiddenCell = row.insertCell();
            hiddenCell.empty();
            const hiddenText = task.hidden ? "Yes" : "No";
            const hiddenDisplay = hiddenCell.createSpan({ text: hiddenText });
            hiddenDisplay.style.cursor = "pointer"; // Will be handled by CSS class now
            hiddenDisplay.title = "Click to toggle hidden status";
            hiddenDisplay.addClass("editable-text-span");

            hiddenDisplay.onclick = async () => {
                await this.handleTaskUpdate(task.id, 'hidden', !task.hidden);
            };

            // Make file clickable is now part of cell 2. No separate fileCell at the end.
        }
    }

    /**
     * Creates an editable priority cell for a task in the table.
     * Displays priority as text, converting to a dropdown on click for editing.
     * @param cell The HTMLTableCellElement to populate.
     * @param task The TaskItem associated with this row.
     */
    private createEditablePriorityCell(cell: HTMLElement, task: TaskItem) {
        const displayPriority = () => { // Helper to render display mode
            cell.empty();
            const priorityText = String(task.priority);
            const displayEl = cell.createSpan({ text: priorityText, cls: "editable-text-span" });
            displayEl.title = "Click to edit priority";

            displayEl.onclick = () => { // Switch to edit mode
                cell.empty();
                const inputEl = cell.createEl("input", { type: "number" });
                inputEl.value = String(task.priority);
                inputEl.style.width = "70px"; // Adjust width as needed
                // inputEl.style.textAlign = "right"; // Optional: right-align numbers

                const saveValue = async () => {
                    const newPriorityInt = parseInt(inputEl.value, 10);
                    if (isNaN(newPriorityInt)) {
                        new Notice("Priority must be a number.");
                        displayPriority(); // Revert if not a number
                        return;
                    }
                    if (newPriorityInt === task.priority) {
                        displayPriority(); // Revert if no change
                        return;
                    }
                    // Validation for range can be added here if desired (e.g. non-negative)
                    // For now, any integer is allowed as per user request.
                    await this.handleTaskUpdate(task.id, 'priority', newPriorityInt);
                    // handleTaskUpdate will cause a refresh, which will re-render this cell in display mode.
                };

                inputEl.onblur = saveValue;
                inputEl.onkeydown = (e) => {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        displayPriority(); // Revert
                    }
                    // Enter key does nothing here, save is on blur
                };
                inputEl.focus();
                inputEl.select();
            };
        };

        displayPriority(); // Initial render
    }

    /**
     * Handles the update of a task's field (priority or completion) from the UI.
     * It calls the plugin's method to update the task in the file and then refreshes the view.
     * @param taskId The ID of the task to update.
     * @param updatedField The field that was changed ('priority' or 'completion').
     * @param newValue The new value for the field.
     */
    async handleTaskUpdate(taskId: string, updatedField: 'priority' | 'dueDate' | 'description' | 'isCompleted' | 'hidden' | 'detailedDescription', newValue: any) {
        // Note: 'completion' (numeric) is removed as 'isCompleted' (boolean) is used.
        // Ensure 'hidden' and 'detailedDescription' are handled if they become editable via this method.
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

    /**
     * Creates an editable description cell for a task in the table.
     * Displays description as text, converting to a text input on click for editing.
     * @param cell The HTMLTableCellElement to populate.
     * @param task The TaskItem associated with this row.
     */
    private createEditableDescriptionCell(cell: HTMLElement, task: TaskItem) {
        cell.empty();
        const displayEl = cell.createSpan({ text: task.description, cls: "editable-text-span" });
        // displayEl.style.cursor = "pointer"; // Handled by CSS
        displayEl.title = "Click to edit summary";

        displayEl.onclick = () => {
            cell.empty();
            const inputEl = cell.createEl("input", { type: "text" });
            inputEl.value = task.description;
            inputEl.style.width = "90%"; // Allow space for other elements if any, or make it 100% of cell

            const saveValue = async () => {
                const newDescription = inputEl.value.trim();
                if (newDescription === "") {
                    new Notice("Description cannot be empty.");
                    this.createEditableDescriptionCell(cell, task); // Revert
                    return;
                }
                if (newDescription === task.description) { // No change
                    this.createEditableDescriptionCell(cell, task); // Revert to display mode
                    return;
                }
                await this.handleTaskUpdate(task.id, 'description', newDescription);
            };

            inputEl.onblur = saveValue;
            inputEl.onkeydown = (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    this.createEditableDescriptionCell(cell, task); // Revert
                }
                // Enter key no longer saves here
            };
            inputEl.focus();
            inputEl.select();
        };
    }

    /**
     * Creates an editable due date cell for a task in the table.
     * Displays due date as text, converting to a text input on click for editing.
     * @param cell The HTMLTableCellElement to populate.
     * @param task The TaskItem associated with this row.
     */
    private createEditableDueDateCell(cell: HTMLElement, task: TaskItem) {
        cell.empty();
        const currentDueDate = task.dueDate || "-";
        const displayEl = cell.createSpan({ text: currentDueDate, cls: "editable-text-span" });
        // displayEl.style.cursor = "pointer"; // Handled by CSS
        displayEl.title = "Click to edit due date";

        displayEl.onclick = () => {
            cell.empty();
            const inputEl = cell.createEl("input", { type: "text" });
            inputEl.placeholder = "YYYY-MM-DD";
            inputEl.value = task.dueDate || ""; // Use empty string if undefined for the input field
            inputEl.style.width = "100px";

            const saveValue = async () => {
                let newDueDate = inputEl.value.trim();
                // Basic validation: allow empty or a pattern that looks like a date.
                // More robust validation could be added (e.g. using a library or regex)
                if (newDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
                    new Notice("Invalid date format. Please use YYYY-MM-DD or leave empty.");
                    // Re-render the original text without saving if format is wrong and not empty
                    this.createEditableDueDateCell(cell, task);
                    return;
                }
                await this.handleTaskUpdate(task.id, 'dueDate', newDueDate === "" ? null : newDueDate); // Pass null to signify removal
            };

            inputEl.onblur = saveValue;
            inputEl.onkeydown = (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    this.createEditableDueDateCell(cell, task); // Revert
                }
                // Enter key no longer saves here
            };
            inputEl.focus();
            inputEl.select();
        };
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
    description: string;    // The main summary line of the task.
    isCompleted: boolean;   // True if task checkbox is marked [x]
    dueDate?: string;       // Optional due date in YYYY-MM-DD format.
    priority: number;       // Task priority: 1 (High), 2 (Medium), 3 (Low).
    hidden: boolean;        // True if task should be hidden by default in reports
    detailedDescription: string; // Longer, multi-line description for the task
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

    // Determine isCompleted from checkbox
    const checkboxRegex = /^\s*-\s*\[([xX ])\]\s*/; // Regex to find checkbox and its state
    const checkboxMatch = line.match(checkboxRegex); // Match against the full line
    let isCompleted = false;
    let description = ""; // This is the summary line

    if (checkboxMatch) {
        isCompleted = checkboxMatch[1].toLowerCase() === 'x';
        // The description is what comes AFTER the checkbox part, before the %%task-plugin marker
        const textAfterCheckbox = line.substring(checkboxMatch[0].length);
        const markerPositionInRemainder = textAfterCheckbox.indexOf(TASK_MARKER);
        if (markerPositionInRemainder !== -1) {
            description = textAfterCheckbox.substring(0, markerPositionInRemainder).trim();
        } else {
            // This case should be rare if marker is always present as per design
            description = textAfterCheckbox.trim();
        }
    } else {
        // Line doesn't even have a checkbox, so it's not a valid task for this plugin.
        return null; // Not a valid task format if no checkbox
    }

    // If description is empty after this, it might be in JSON (legacy or alternative format)
    // For now, the description is ONLY from the line itself.
    // No warning for empty description, allow it.

    return {
        id: `${filePath}-${lineNumber}`,
        description: description, // This is the summary line
        isCompleted: isCompleted,
        dueDate: taskData.dueDate, // Keep existing optional handling
        priority: typeof taskData.priority === 'number' ? taskData.priority : 2, // Default to medium (2)
        hidden: taskData.hidden === true, // Default to false if undefined or not strictly true
        detailedDescription: typeof taskData.detailedDescription === 'string' ? taskData.detailedDescription : "", // Default to empty string
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
    // Update onSubmit signature
    onSubmit: (description: string, dueDate: string, priority: number, detailedDescription: string, hidden: boolean) => void;

    // Properties to store input values
    description: string = "";
    dueDate: string = "";
    priority: number = 2; // Default Medium
    // Add new properties
    detailedDescription: string = "";
    hidden: boolean = false;

    /**
     * @param app The Obsidian App instance.
     * @param plugin Reference to the main plugin class.
     * @param onSubmit Callback function to execute when the task is saved.
     *                 It receives the description, due date, priority, and completion.
     */
    constructor(app: App, plugin: MyTaskPlugin,
                onSubmit: (description: string, dueDate: string, priority: number, detailedDescription: string, hidden: boolean) => void) {
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

        // Description (summary)
        new Setting(contentEl)
            .setName("Task Summary")
            .setDesc("Briefly, what needs to be done?")
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

        // NEW: Detailed Description
        new Setting(contentEl)
            .setName("Detailed Description (Optional)")
            .setDesc("Add more details, notes, or sub-tasks here.")
            .addTextArea(textarea => {
                textarea.setPlaceholder("Enter detailed notes...")
                    .setValue(this.detailedDescription)
                    .onChange(value => this.detailedDescription = value);
                textarea.inputEl.rows = 4; // Adjust height as needed
                textarea.inputEl.style.width = "100%";
            });

        // NEW: Hidden toggle
        new Setting(contentEl)
            .setName("Hidden Task")
            .setDesc("If checked, this task might be hidden by default in some views.")
            .addToggle(toggle => {
                toggle.setValue(this.hidden)
                    .onChange(value => this.hidden = value);
            });

        // Submit Button
        new Setting(contentEl)
            .addButton(button => {
                button.setButtonText("Save Task")
                    .setCta() // Makes it more prominent
                    .onClick(() => {
                        if (!this.description.trim()) {
                            new Notice("Task summary cannot be empty.");
                            return;
                        }
                        // Update onSubmit call
                        this.onSubmit(this.description, this.dueDate, this.priority, this.detailedDescription, this.hidden);
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
                // Update the callback signature for TaskInsertionModal
                new TaskInsertionModal(this.app, this,
                    (description, dueDate, priority, detailedDescription, hidden) => {

                    const taskData: any = { // Use 'any' temporarily for flexibility or define a specific interface
                        priority: priority
                    };
                    if (dueDate) taskData.dueDate = dueDate;
                    if (detailedDescription) taskData.detailedDescription = detailedDescription; // Only add if not empty
                    if (hidden) taskData.hidden = true; // Only add if true

                    // Task always starts as incomplete: - [ ]
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
    async updateTaskInFile(taskToUpdate: TaskItem, updatedField: 'priority' | 'dueDate' | 'description' | 'isCompleted' | 'hidden' | 'detailedDescription', newValue: any) {
        // Note: 'completion' (numeric) is removed from updatedField type
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

        // Update the specific field
        if (updatedField === 'dueDate') {
            if (newValue === null || newValue === "") { // If new value is null or empty string, remove the key
                delete taskData.dueDate;
            } else {
                taskData.dueDate = newValue; // newValue should be YYYY-MM-DD string
            }
        } else if (updatedField === 'priority') {
             taskData[updatedField] = newValue;
        }
        // else: handle description in the next plan step / subtask

        // Ensure fields that might be undefined are handled correctly (e.g., not stringified as "undefined")
        // This is particularly important if other optional fields are added later.
        // Example: if (taskData.someOtherOptionalField === undefined) { delete taskData.someOtherOptionalField; }

        let newLine = "";

        if (updatedField === 'isCompleted') {
            const newCompletedState = newValue as boolean;
            const checkboxRegex = /^(\s*-\s*\[)([xX ])(\]\s*)/; // Regex to capture parts of the checkbox
            const match = originalLine.match(checkboxRegex);

            if (match) {
                const prefix = match[1]; // e.g., "- ["
                const suffix = match[3]; // e.g., "] "
                const restOfLine = originalLine.substring(match[0].length); // Content after the checkbox

                newLine = `${prefix}${newCompletedState ? 'x' : ' '}${suffix}${restOfLine}`;
            } else {
                console.error("Could not find checkbox in task line to update status:", originalLine);
                throw new Error("Task checkbox not found for status update.");
            }
        } else if (updatedField === 'description') {
            const newDescription = String(newValue).trim();
            if (!newDescription) {
                throw new Error("Description cannot be empty.");
            }

            const checkboxRegex = /^(\s*-\s*\[[x ]\]\s*)/;
            const checkboxMatch = originalLine.match(checkboxRegex);
            const checkboxPart = checkboxMatch ? checkboxMatch[1] : "- [ ] ";

            const markerIdx = originalLine.indexOf(TASK_MARKER);
            if (markerIdx === -1) {
                throw new Error("Task marker not found in the line. Cannot update description.");
            }
            const markerPart = originalLine.substring(markerIdx);

            newLine = `${checkboxPart}${newDescription} ${markerPart}`;

        } else { // Handles JSON fields: 'priority', 'dueDate', 'hidden', 'detailedDescription'
            const markerIndex = originalLine.indexOf(TASK_MARKER);
            const endIndex = originalLine.indexOf(TASK_MARKER_END, markerIndex + TASK_MARKER.length);
            if (markerIndex === -1 || endIndex === -1) {
                 console.error("Task marker not found for JSON update in line:", originalLine);
                 throw new Error("Task data format error in file (marker not found for JSON update).");
            }
            const descAndCheckboxPart = originalLine.substring(0, markerIndex); // This part includes checkbox and description
            const jsonDataString = originalLine.substring(markerIndex + TASK_MARKER.length, endIndex);
            let taskDataLocal = JSON.parse(jsonDataString); // Use a different variable name to avoid confusion with taskData from outer scope if any

            if (updatedField === 'dueDate') {
                if (newValue === null || newValue === "") { delete taskDataLocal.dueDate; }
                else { taskDataLocal.dueDate = newValue; }
            } else if (updatedField === 'priority') {
                taskDataLocal.priority = newValue as number;
            } else if (updatedField === 'hidden') {
                if (newValue === false && taskDataLocal.hasOwnProperty('hidden')) {
                    delete taskDataLocal.hidden;
                } else if (newValue === true) {
                    taskDataLocal.hidden = true;
                }
            } else if (updatedField === 'detailedDescription') {
                 if ((newValue === "" || newValue === null) && taskDataLocal.hasOwnProperty('detailedDescription')) {
                    delete taskDataLocal.detailedDescription;
                } else if (newValue && typeof newValue === 'string' && newValue !== "") {
                    taskDataLocal.detailedDescription = newValue;
                }
            }
        // Note: The old 'completion' (numeric) field handling is removed.

            const newJsonDataString = JSON.stringify(taskDataLocal);
            newLine = `${descAndCheckboxPart.trimEnd()} ${TASK_MARKER}${newJsonDataString}${TASK_MARKER_END}`;
        }

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
