# Task Master Configuration

This directory contains the Task Master configuration for the rr-product-service monorepo.

## What is Task Master?

Task Master is a task management tool that helps AI agents and developers work together on structured projects. It parses PRDs (Product Requirement Documents) into actionable tasks, analyzes complexity, and tracks progress.

Learn more at [task-master.dev](https://www.task-master.dev/)

## Quick Start

### 1. Setup Environment

Task Master uses API keys from your environment. Add your API keys to `.env`:

```bash
# Anthropic (for Claude models)
ANTHROPIC_API_KEY=your_key_here

# Perplexity (for research)
PERPLEXITY_API_KEY=your_key_here
```

### 2. Create a PRD

Write your project requirements in `.taskmaster/docs/prd.txt`. You can use the templates in `.taskmaster/templates/` as examples:

- `example_prd.txt` - Simple project template
- `example_prd_rpg.txt` - Complex system template

### 3. Generate Tasks

Parse your PRD to generate initial tasks:

```bash
pnpm tm:parse
# or
pnpm exec task-master parse-prd --input .taskmaster/docs/prd.txt
```

### 4. Analyze & Expand

Analyze task complexity and expand into subtasks:

```bash
pnpm tm:analyze
pnpm tm:expand
```

### 5. Start Working

Get the next task to work on:

```bash
pnpm tm:next
```

View all tasks:

```bash
pnpm tm:list
```

Check project status:

```bash
pnpm tm:status
```

## Available Scripts

These scripts are defined in the root `package.json`:

- `pnpm tm` - Run any task-master command
- `pnpm tm:parse` - Parse PRD into tasks
- `pnpm tm:analyze` - Analyze task complexity
- `pnpm tm:expand` - Expand tasks into subtasks
- `pnpm tm:next` - Get next task to work on
- `pnpm tm:status` - View project status
- `pnpm tm:list` - List all tasks

## Directory Structure

```
.taskmaster/
├── config.json       # Task Master configuration (COMMITTED)
├── templates/        # PRD templates (COMMITTED)
├── state.json        # Runtime state (IGNORED)
├── tasks/            # Generated tasks (IGNORED)
├── reports/          # Analysis reports (IGNORED)
└── docs/             # PRD documents (IGNORED)
```

## Configuration

The configuration is in `config.json`:

- **Models**: AI models used for task generation and research
  - `main`: Claude Sonnet 4 (task generation)
  - `research`: Perplexity Sonar (research operations)
  - `fallback`: Claude 3.7 Sonnet (fallback)
- **Global Settings**: Project name, log level, defaults, etc.

You can modify models using:

```bash
pnpm exec task-master models --setup
pnpm exec task-master models --set-main <model_id>
pnpm exec task-master models --set-research <model_id>
```

## IDE Integration

Task Master can integrate with AI IDEs like Claude Code, Cursor, and Codex. Configure AI rules:

```bash
pnpm exec task-master rules --setup
```

## Full Command Reference

Run `pnpm exec task-master --help` to see all available commands.

## Tips

- **Keep PRDs focused**: Start with clear objectives and acceptance criteria
- **Use research mode**: Enable `--research` flag for complex tasks to get better context
- **Tag tasks**: Use tags to organize related tasks (default: "master")
- **Iterative expansion**: Expand tasks gradually as you understand requirements better
- **Version control**: The config and templates are committed, but runtime state is local

## Upgrading to Hamster (Team Mode)

Task Master is for solo development. For team collaboration, consider upgrading to [Hamster](https://tryhamster.com) which provides:

- Team brief writing and refinement
- Shared planning and alignment
- Centralized task management
- Multi-agent coordination

Visit [tryhamster.com](https://tryhamster.com) to learn more.
