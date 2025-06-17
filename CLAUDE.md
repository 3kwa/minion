# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minion is a minimalistic HTML/CSS/JavaScript viewer built on Electron. It provides a "dominion" console interface that manages collections of windows ("minions") displaying web content. The application is designed for industries where browsers with tabs aren't suitable - instead providing collections of independent windows that can be grouped into workspaces.

## Core Architecture

- **main.js**: Main Electron process, handles CLI parsing, menu setup, window management, and workspace operations
- **minion.js**: New Minion class (BaseWindow + WebContentsView) with multi-tab support via Ctrl+Tab switching
- **renderer.js**: Dominion console interface using jQuery.terminal with commands for window/workspace management
- **renderer.html**: Simple HTML shell for the terminal interface
- **preload.js**: Bridge between main and renderer processes

## Key Concepts

### Windows vs Workspaces

- **Minions**: Individual browser windows displaying web content
- **Dominion**: The main console window for controlling minions
- **Workspaces**: Named collections of minions that can be saved/loaded/managed as groups

### Window Management

- Windows can be framed or frameless (frameless windows have draggable overlay for repositioning)
- Each window supports navigation history, location bar (Ctrl+L), and scroll position persistence
- New Minion class supports multiple tabs per window with Ctrl+Tab switching

## Development Commands

### Running the Application

```bash
npm start                    # Start in development mode
npm run watch               # Start with auto-restart on changes (nodemon)
```

### Building and Packaging

```bash
npm run package            # Package the app for current platform
npm run make               # Create distributables (DMG for macOS, exe for Windows)
```

## Console Commands (Dominion Interface)

### Window Management

- `open <url>` - Opens new minion window with specified URL
- `shut <workspace>|all` - Closes windows in workspace or all windows
- `info` - Lists all currently open windows

### Workspace Management

- `save <name>` - Saves current windows as a workspace
- `load <name>` - Opens all windows from saved workspace (framed)
- `less <name>` - Opens all windows from saved workspace (frameless)
- `desc <name>` - Lists URLs in a saved workspace
- `dele <name>` - Deletes a saved workspace
- `list` - Lists all saved workspaces

### CLI Usage

The app also supports CLI commands:

```bash
minion load <workspace>     # Load workspace on startup
minion less <workspace>     # Load workspace frameless on startup
```

## Key Files and Structure

- **Icons**: `icons/` - Contains .icns, .ico, and .png icons for different platforms
- **Forge Config**: `forge.config.js` - Electron Forge configuration for building distributables
- **Build Output**: `out/` - Contains built applications and distributables
- **Workspace Storage**: User data directory contains `workspaces/` folder with JSON files

## Technical Details

### IPC Communication

The app uses Electron's IPC for communication between main and renderer:

- `open`, `shut`, `save`, `load`, `less`, `dele` (events)
- `info`, `desc`, `list` (handles with return values)

### Workspace Storage Format

Workspaces are stored as JSON files containing:

- Window position, size, and zoom level
- Current URL and scroll positions
- Window frame state

### Keyboard Shortcuts

- **Ctrl+L**: Toggle location bar (URL input)
- **Ctrl+[**: Navigate back
- **Ctrl+]**: Navigate forward
- **Ctrl+Shift+M**: Toggle move mode for frameless windows
- **Ctrl+D**: Show dominion console
- **Ctrl+Tab**: Switch between tabs in Minion windows

## Dependencies

### Runtime Dependencies

- `commander`: CLI argument parsing
- `electron-log`: Logging functionality
- `electron-squirrel-startup`: Windows installer support
- `jquery.terminal`: Terminal interface in dominion console

### Build Dependencies

- `electron`: Framework
- `@electron-forge/*`: Build and packaging tools
- `nodemon`: Development auto-restart
