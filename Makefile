# Makefile for Obsidian Task Manager Plugin

# Plugin ID (from manifest.json)
PLUGIN_ID := obsidian-task-manager

# TypeScript Compiler
TSC := npx tsc

# Output directory for compiled JavaScript (optional, if not inlining)
# BUILD_DIR := dist

# Files to be copied to the plugin directory
PLUGIN_MAIN_JS := main.js
PLUGIN_MANIFEST := manifest.json
PLUGIN_STYLES := styles.css
PLUGIN_FILES := $(PLUGIN_MAIN_JS) $(PLUGIN_MANIFEST) $(PLUGIN_STYLES)

# Path to your Obsidian vault.
# !!! IMPORTANT !!!
# You MUST set this variable to the root path of your Obsidian vault.
# For example: OBSIDIAN_VAULT_PATH := /Users/yourname/Documents/MyObsidianVault
# Or on Windows: OBSIDIAN_VAULT_PATH := C:/Users/yourname/Documents/MyObsidianVault
OBSIDIAN_VAULT_PATH :=

# Check if OBSIDIAN_VAULT_PATH is set
ifndef OBSIDIAN_VAULT_PATH
    $(error OBSIDIAN_VAULT_PATH is not set. Please edit the Makefile and set it to your Obsidian vault path.)
endif

# Target plugin directory in the vault
PLUGIN_INSTALL_DIR := $(OBSIDIAN_VAULT_PATH)/.obsidian/plugins/$(PLUGIN_ID)

# Default target
all: build

# Build the plugin (compile TypeScript)
build: $(PLUGIN_MAIN_JS)

$(PLUGIN_MAIN_JS): main.ts tsconfig.json package.json
	@echo "Building TypeScript..."
	$(TSC)
	@echo "Build complete: $(PLUGIN_MAIN_JS)"

# Install the plugin to your Obsidian vault
install: build
	@echo "Installing plugin to $(PLUGIN_INSTALL_DIR)..."
	@if [ ! -d "$(OBSIDIAN_VAULT_PATH)/.obsidian" ]; then 		echo "Error: $(OBSIDIAN_VAULT_PATH)/.obsidian directory not found."; 		echo "Please ensure OBSIDIAN_VAULT_PATH is set correctly to your vault's root."; 		exit 1; 	fi
	@mkdir -p "$(PLUGIN_INSTALL_DIR)"
	@cp $(PLUGIN_FILES) "$(PLUGIN_INSTALL_DIR)/"
	@echo "Plugin installed successfully to $(PLUGIN_INSTALL_DIR)."
	@echo "Please ensure you have enabled the plugin in Obsidian's settings."

# Watch for changes and rebuild automatically
dev:
	@echo "Starting TypeScript compiler in watch mode..."
	$(TSC) --watch

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -f $(PLUGIN_MAIN_JS) $(PLUGIN_MAIN_JS).map
	@echo "Clean complete."

.PHONY: all build install dev clean
