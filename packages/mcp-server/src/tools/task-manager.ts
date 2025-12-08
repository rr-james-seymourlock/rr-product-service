import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

// Task status following TaskMaster conventions
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked' | 'deferred';

// Priority levels
export type TaskPriority = 'high' | 'medium' | 'low';

// Complexity score 1-10
export type ComplexityScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Individual task structure following TaskMaster schema
export interface Task {
  id: string; // Format: "1", "1.1", "1.1.1" for nested tasks
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[]; // Array of task IDs this task depends on
  details?: string | undefined; // Implementation notes
  testStrategy?: string | undefined; // Verification approach
  subtasks: Task[];
  // Complexity analysis fields
  complexity?: ComplexityScore | undefined;
  recommendedSubtasks?: number | undefined;
  // Metadata
  userStoryId?: string | undefined; // Link back to user story
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
  blockedReason?: string | undefined;
}

// Task file structure stored alongside PRD
export interface TaskFile {
  prdFilename: string;
  tasks: Task[];
  metadata: {
    version: string;
    created: string;
    lastUpdated: string;
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
  };
}

// Complexity report structure
export interface ComplexityReport {
  generatedAt: string;
  summary: {
    total: number;
    low: number; // 1-3
    medium: number; // 4-6
    high: number; // 7-10
    averageComplexity: number;
  };
  taskAnalysis: Array<{
    taskId: string;
    title: string;
    complexity: ComplexityScore;
    recommendedSubtasks: number;
    factors: string[];
  }>;
  recommendations: string[];
}

export class TaskManager {
  private static ROOT_PATH = process.cwd();

  private static get PRDS_DIR() {
    return join(this.ROOT_PATH, '.prds');
  }

  static setRootPath(path: string) {
    this.ROOT_PATH = path;
  }

  // Get PRD folder name from filename (handles both old and new formats)
  private static getPRDFolderName(prdFilename: string): string {
    // Handle both old format (name.json) and new format (name/prd.json or just name)
    if (prdFilename.endsWith('.json')) {
      return prdFilename.replace('.json', '');
    }
    return prdFilename;
  }

  // Get full path to PRD folder
  private static getPRDFolderPath(prdFilename: string): string {
    return join(this.PRDS_DIR, this.getPRDFolderName(prdFilename));
  }

  // Get task file path within PRD folder
  private static getTaskFilePath(prdFilename: string): string {
    return join(this.getPRDFolderPath(prdFilename), 'tasks.json');
  }

  // Load or create task file for a PRD
  static async loadTaskFile(prdFilename: string): Promise<TaskFile> {
    const filePath = this.getTaskFilePath(prdFilename);
    const folderName = this.getPRDFolderName(prdFilename);

    try {
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      // Create new task file if doesn't exist
      const now = new Date().toISOString();
      const taskFile: TaskFile = {
        prdFilename: folderName,
        tasks: [],
        metadata: {
          version: '1.0',
          created: now,
          lastUpdated: now,
          totalTasks: 0,
          completedTasks: 0,
          blockedTasks: 0,
        },
      };
      return taskFile;
    }
  }

  // Save task file
  private static async saveTaskFile(prdFilename: string, taskFile: TaskFile): Promise<void> {
    const filePath = this.getTaskFilePath(prdFilename);

    // Update metadata
    taskFile.metadata.lastUpdated = new Date().toISOString();
    this.updateTaskCounts(taskFile);

    await writeFile(filePath, JSON.stringify(taskFile, null, 2), 'utf8');
  }

  // Update task counts in metadata
  private static updateTaskCounts(taskFile: TaskFile): void {
    const allTasks = this.getAllTasksFlat(taskFile.tasks);
    taskFile.metadata.totalTasks = allTasks.length;
    taskFile.metadata.completedTasks = allTasks.filter((t) => t.status === 'done').length;
    taskFile.metadata.blockedTasks = allTasks.filter((t) => t.status === 'blocked').length;
  }

  // Get all tasks flattened (including subtasks)
  private static getAllTasksFlat(tasks: Task[]): Task[] {
    const result: Task[] = [];
    for (const task of tasks) {
      result.push(task);
      if (task.subtasks.length > 0) {
        result.push(...this.getAllTasksFlat(task.subtasks));
      }
    }
    return result;
  }

  // Find task by ID (supports nested IDs like "1.1.2")
  private static findTaskById(tasks: Task[], id: string): Task | null {
    for (const task of tasks) {
      if (task.id === id) {
        return task;
      }
      if (task.subtasks.length > 0) {
        const found = this.findTaskById(task.subtasks, id);
        if (found) return found;
      }
    }
    return null;
  }

  // Find parent task for a given task ID
  private static findParentTask(tasks: Task[], childId: string): Task | null {
    const parts = childId.split('.');
    if (parts.length <= 1) return null;

    const parentId = parts.slice(0, -1).join('.');
    return this.findTaskById(tasks, parentId);
  }

  // Generate next task ID at a given level
  private static generateNextId(tasks: Task[], parentId?: string | undefined): string {
    if (!parentId) {
      // Top-level task
      const maxId = tasks.reduce((max, t) => {
        const idPart = t.id.split('.')[0];
        const num = parseInt(idPart ?? '0', 10);
        return num > max ? num : max;
      }, 0);
      return String(maxId + 1);
    }

    // Subtask - find parent and get next subtask number
    const parent = this.findTaskById(tasks, parentId);
    if (!parent) {
      throw new Error(`Parent task ${parentId} not found`);
    }

    const maxSubId = parent.subtasks.reduce((max, t) => {
      const parts = t.id.split('.');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart ?? '0', 10);
      return num > max ? num : max;
    }, 0);

    return `${parentId}.${maxSubId + 1}`;
  }

  // Add a new task
  static async addTask(
    prdFilename: string,
    title: string,
    description: string,
    options: {
      priority?: TaskPriority | undefined;
      dependencies?: string[] | undefined;
      details?: string | undefined;
      testStrategy?: string | undefined;
      userStoryId?: string | undefined;
      parentId?: string | undefined;
    } = {},
  ): Promise<Task> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const now = new Date().toISOString();

    const newTask: Task = {
      id: this.generateNextId(taskFile.tasks, options.parentId),
      title,
      description,
      status: 'pending',
      priority: options.priority || 'medium',
      dependencies: options.dependencies || [],
      details: options.details,
      testStrategy: options.testStrategy,
      subtasks: [],
      userStoryId: options.userStoryId,
      createdAt: now,
      updatedAt: now,
    };

    if (options.parentId) {
      const parent = this.findTaskById(taskFile.tasks, options.parentId);
      if (!parent) {
        throw new Error(`Parent task ${options.parentId} not found`);
      }
      parent.subtasks.push(newTask);
    } else {
      taskFile.tasks.push(newTask);
    }

    await this.saveTaskFile(prdFilename, taskFile);
    return newTask;
  }

  // Add subtask to existing task
  static async addSubtask(
    prdFilename: string,
    parentId: string,
    title: string,
    description: string,
    options: {
      priority?: TaskPriority | undefined;
      dependencies?: string[] | undefined;
      details?: string | undefined;
      testStrategy?: string | undefined;
    } = {},
  ): Promise<Task> {
    return this.addTask(prdFilename, title, description, {
      ...options,
      parentId,
    });
  }

  // Get a specific task
  static async getTask(prdFilename: string, taskId: string): Promise<Task | null> {
    const taskFile = await this.loadTaskFile(prdFilename);
    return this.findTaskById(taskFile.tasks, taskId);
  }

  // Get all tasks
  static async getTasks(
    prdFilename: string,
    options: {
      status?: TaskStatus | undefined;
      includeSubtasks?: boolean | undefined;
      userStoryId?: string | undefined;
    } = {},
  ): Promise<Task[]> {
    const taskFile = await this.loadTaskFile(prdFilename);

    let tasks = options.includeSubtasks ? this.getAllTasksFlat(taskFile.tasks) : taskFile.tasks;

    if (options.status) {
      tasks = tasks.filter((t) => t.status === options.status);
    }

    if (options.userStoryId) {
      tasks = tasks.filter((t) => t.userStoryId === options.userStoryId);
    }

    return tasks;
  }

  // Update task status
  static async setTaskStatus(
    prdFilename: string,
    taskId: string,
    status: TaskStatus,
    options: {
      blockedReason?: string | undefined;
      cascadeToSubtasks?: boolean | undefined;
    } = {},
  ): Promise<Task> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const task = this.findTaskById(taskFile.tasks, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Validate blocked status requires reason
    if (status === 'blocked' && !options.blockedReason && !task.blockedReason) {
      throw new Error('Blocked status requires a blockedReason');
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (status === 'blocked' && options.blockedReason) {
      task.blockedReason = options.blockedReason;
    }

    if (status === 'done') {
      task.completedAt = new Date().toISOString();
      delete task.blockedReason;
    }

    // Cascade status to subtasks if requested
    if (options.cascadeToSubtasks && task.subtasks.length > 0) {
      const cascadeStatus = (subtasks: Task[]) => {
        for (const subtask of subtasks) {
          subtask.status = status;
          subtask.updatedAt = new Date().toISOString();
          if (status === 'done') {
            subtask.completedAt = new Date().toISOString();
          }
          if (subtask.subtasks.length > 0) {
            cascadeStatus(subtask.subtasks);
          }
        }
      };
      cascadeStatus(task.subtasks);
    }

    // Update parent task status based on subtasks
    this.updateParentStatus(taskFile.tasks, taskId);

    await this.saveTaskFile(prdFilename, taskFile);
    return task;
  }

  // Update parent task status based on subtask completion
  private static updateParentStatus(tasks: Task[], childId: string): void {
    const parent = this.findParentTask(tasks, childId);
    if (!parent || parent.subtasks.length === 0) return;

    const allDone = parent.subtasks.every((s) => s.status === 'done');
    const anyBlocked = parent.subtasks.some((s) => s.status === 'blocked');
    const anyInProgress = parent.subtasks.some(
      (s) => s.status === 'in_progress' || s.status === 'done',
    );

    if (allDone) {
      parent.status = 'done';
      parent.completedAt = new Date().toISOString();
    } else if (anyBlocked) {
      parent.status = 'blocked';
    } else if (anyInProgress) {
      parent.status = 'in_progress';
    }

    parent.updatedAt = new Date().toISOString();
  }

  // Update task details
  static async updateTask(
    prdFilename: string,
    taskId: string,
    updates: {
      title?: string | undefined;
      description?: string | undefined;
      priority?: TaskPriority | undefined;
      details?: string | undefined;
      testStrategy?: string | undefined;
    },
  ): Promise<Task> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const task = this.findTaskById(taskFile.tasks, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    Object.assign(task, updates);
    task.updatedAt = new Date().toISOString();

    await this.saveTaskFile(prdFilename, taskFile);
    return task;
  }

  // Remove a task
  static async removeTask(prdFilename: string, taskId: string): Promise<boolean> {
    const taskFile = await this.loadTaskFile(prdFilename);

    const removeFromArray = (tasks: Task[]): boolean => {
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        tasks.splice(index, 1);
        return true;
      }

      for (const task of tasks) {
        if (removeFromArray(task.subtasks)) {
          return true;
        }
      }

      return false;
    };

    const removed = removeFromArray(taskFile.tasks);

    if (removed) {
      // Remove this task from other tasks' dependencies
      const allTasks = this.getAllTasksFlat(taskFile.tasks);
      for (const task of allTasks) {
        task.dependencies = task.dependencies.filter((d) => d !== taskId);
      }

      await this.saveTaskFile(prdFilename, taskFile);
    }

    return removed;
  }

  // Clear all subtasks from a task
  static async clearSubtasks(prdFilename: string, taskId: string): Promise<number> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const task = this.findTaskById(taskFile.tasks, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const count = this.getAllTasksFlat(task.subtasks).length;
    task.subtasks = [];
    task.updatedAt = new Date().toISOString();

    await this.saveTaskFile(prdFilename, taskFile);
    return count;
  }

  // Add dependency
  static async addDependency(
    prdFilename: string,
    taskId: string,
    dependsOnId: string,
  ): Promise<Task> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const task = this.findTaskById(taskFile.tasks, taskId);
    const dependsOn = this.findTaskById(taskFile.tasks, dependsOnId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!dependsOn) {
      throw new Error(`Dependency task ${dependsOnId} not found`);
    }

    // Check for circular dependency
    if (this.wouldCreateCycle(taskFile.tasks, taskId, dependsOnId)) {
      throw new Error(`Adding dependency would create circular dependency`);
    }

    if (!task.dependencies.includes(dependsOnId)) {
      task.dependencies.push(dependsOnId);
      task.updatedAt = new Date().toISOString();
      await this.saveTaskFile(prdFilename, taskFile);
    }

    return task;
  }

  // Remove dependency
  static async removeDependency(
    prdFilename: string,
    taskId: string,
    dependsOnId: string,
  ): Promise<Task> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const task = this.findTaskById(taskFile.tasks, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.dependencies = task.dependencies.filter((d) => d !== dependsOnId);
    task.updatedAt = new Date().toISOString();

    await this.saveTaskFile(prdFilename, taskFile);
    return task;
  }

  // Check if adding a dependency would create a cycle
  private static wouldCreateCycle(tasks: Task[], taskId: string, newDepId: string): boolean {
    const visited = new Set<string>();

    const hasCycle = (currentId: string): boolean => {
      if (currentId === taskId) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);
      const current = this.findTaskById(tasks, currentId);

      if (!current) return false;

      for (const depId of current.dependencies) {
        if (hasCycle(depId)) return true;
      }

      return false;
    };

    return hasCycle(newDepId);
  }

  // Validate all dependencies
  static async validateDependencies(prdFilename: string): Promise<{
    valid: boolean;
    issues: Array<{ taskId: string; issue: string }>;
  }> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const allTasks = this.getAllTasksFlat(taskFile.tasks);
    const taskIds = new Set(allTasks.map((t) => t.id));
    const issues: Array<{ taskId: string; issue: string }> = [];

    for (const task of allTasks) {
      // Check for missing dependencies
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          issues.push({
            taskId: task.id,
            issue: `Depends on non-existent task ${depId}`,
          });
        }
      }

      // Check for self-dependency
      if (task.dependencies.includes(task.id)) {
        issues.push({
          taskId: task.id,
          issue: 'Task depends on itself',
        });
      }

      // Check for circular dependencies
      if (this.hasCircularDependency(allTasks, task.id, new Set())) {
        issues.push({
          taskId: task.id,
          issue: 'Part of a circular dependency chain',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  // Check for circular dependency starting from a task
  private static hasCircularDependency(
    tasks: Task[],
    startId: string,
    visited: Set<string>,
  ): boolean {
    if (visited.has(startId)) return true;
    visited.add(startId);

    const task = tasks.find((t) => t.id === startId);
    if (!task) return false;

    for (const depId of task.dependencies) {
      if (this.hasCircularDependency(tasks, depId, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  // Fix simple dependency issues
  static async fixDependencies(prdFilename: string): Promise<{
    fixed: number;
    issues: string[];
  }> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const allTasks = this.getAllTasksFlat(taskFile.tasks);
    const taskIds = new Set(allTasks.map((t) => t.id));
    let fixed = 0;
    const issues: string[] = [];

    for (const task of allTasks) {
      const originalLength = task.dependencies.length;

      // Remove non-existent dependencies
      task.dependencies = task.dependencies.filter((depId) => {
        if (!taskIds.has(depId)) {
          issues.push(`Removed non-existent dependency ${depId} from task ${task.id}`);
          return false;
        }
        return true;
      });

      // Remove self-dependency
      task.dependencies = task.dependencies.filter((depId) => {
        if (depId === task.id) {
          issues.push(`Removed self-dependency from task ${task.id}`);
          return false;
        }
        return true;
      });

      if (task.dependencies.length !== originalLength) {
        fixed++;
        task.updatedAt = new Date().toISOString();
      }
    }

    await this.saveTaskFile(prdFilename, taskFile);

    return { fixed, issues };
  }

  // Get the next actionable task
  static async getNextTask(
    prdFilename: string,
    options: {
      userStoryId?: string | undefined;
    } = {},
  ): Promise<{ task: Task | null; reason: string }> {
    const taskFile = await this.loadTaskFile(prdFilename);
    let allTasks = this.getAllTasksFlat(taskFile.tasks);

    // Filter by user story if specified
    if (options.userStoryId) {
      allTasks = allTasks.filter((t) => t.userStoryId === options.userStoryId);
    }

    // Get pending tasks only
    const pendingTasks = allTasks.filter((t) => t.status === 'pending');

    if (pendingTasks.length === 0) {
      const inProgress = allTasks.filter((t) => t.status === 'in_progress');
      if (inProgress.length > 0) {
        return {
          task: null,
          reason: `No pending tasks. ${inProgress.length} task(s) in progress.`,
        };
      }

      const blocked = allTasks.filter((t) => t.status === 'blocked');
      if (blocked.length > 0) {
        return {
          task: null,
          reason: `No pending tasks. ${blocked.length} task(s) blocked.`,
        };
      }

      return {
        task: null,
        reason: 'All tasks completed!',
      };
    }

    // Find tasks with all dependencies satisfied
    const actionableTasks = pendingTasks.filter((task) => {
      for (const depId of task.dependencies) {
        const dep = this.findTaskById(taskFile.tasks, depId);
        if (!dep || dep.status !== 'done') {
          return false;
        }
      }
      return true;
    });

    if (actionableTasks.length === 0) {
      return {
        task: null,
        reason: `${pendingTasks.length} pending task(s) but all have unsatisfied dependencies.`,
      };
    }

    // Sort by priority (high > medium > low) then by ID
    const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
    actionableTasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    const nextTask = actionableTasks[0];
    return {
      task: nextTask ?? null,
      reason: `Found ${actionableTasks.length} actionable task(s). Returning highest priority.`,
    };
  }

  // Analyze complexity of all tasks
  static async analyzeComplexity(
    prdFilename: string,
    options: {
      threshold?: ComplexityScore | undefined;
    } = {},
  ): Promise<ComplexityReport> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const allTasks = this.getAllTasksFlat(taskFile.tasks);
    const threshold = options.threshold || 5;

    const taskAnalysis: ComplexityReport['taskAnalysis'] = [];
    let totalComplexity = 0;

    for (const task of allTasks) {
      const analysis = this.calculateComplexity(task);
      task.complexity = analysis.complexity;
      task.recommendedSubtasks = analysis.recommendedSubtasks;
      task.updatedAt = new Date().toISOString();

      taskAnalysis.push({
        taskId: task.id,
        title: task.title,
        complexity: analysis.complexity,
        recommendedSubtasks: analysis.recommendedSubtasks,
        factors: analysis.factors,
      });

      totalComplexity += analysis.complexity;
    }

    await this.saveTaskFile(prdFilename, taskFile);

    const low = taskAnalysis.filter((t) => t.complexity <= 3).length;
    const medium = taskAnalysis.filter((t) => t.complexity >= 4 && t.complexity <= 6).length;
    const high = taskAnalysis.filter((t) => t.complexity >= 7).length;

    const recommendations: string[] = [];
    const highComplexityTasks = taskAnalysis.filter((t) => t.complexity >= threshold);

    if (highComplexityTasks.length > 0) {
      recommendations.push(
        `${highComplexityTasks.length} task(s) exceed complexity threshold of ${threshold}:`,
      );
      for (const task of highComplexityTasks) {
        recommendations.push(
          `  - Task ${task.taskId}: "${task.title}" (complexity: ${task.complexity}, recommend ${task.recommendedSubtasks} subtasks)`,
        );
      }
    }

    if (allTasks.length > 0 && totalComplexity / allTasks.length > 6) {
      recommendations.push('Average complexity is high. Consider breaking down more tasks.');
    }

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: allTasks.length,
        low,
        medium,
        high,
        averageComplexity:
          allTasks.length > 0 ? Math.round((totalComplexity / allTasks.length) * 10) / 10 : 0,
      },
      taskAnalysis,
      recommendations,
    };
  }

  // Calculate complexity for a single task
  private static calculateComplexity(task: Task): {
    complexity: ComplexityScore;
    recommendedSubtasks: number;
    factors: string[];
  } {
    let score = 1;
    const factors: string[] = [];

    // Factor: Description length
    const descLength = task.description.length;
    if (descLength > 500) {
      score += 3;
      factors.push('Long description (>500 chars)');
    } else if (descLength > 200) {
      score += 2;
      factors.push('Medium description (>200 chars)');
    } else if (descLength > 100) {
      score += 1;
      factors.push('Short description (>100 chars)');
    }

    // Factor: Number of dependencies
    const depCount = task.dependencies.length;
    if (depCount >= 5) {
      score += 3;
      factors.push(`Many dependencies (${depCount})`);
    } else if (depCount >= 3) {
      score += 2;
      factors.push(`Some dependencies (${depCount})`);
    } else if (depCount >= 1) {
      score += 1;
      factors.push(`Few dependencies (${depCount})`);
    }

    // Factor: Has implementation details
    if (task.details && task.details.length > 200) {
      score += 1;
      factors.push('Has detailed implementation notes');
    }

    // Factor: Has test strategy
    if (task.testStrategy && task.testStrategy.length > 100) {
      score += 1;
      factors.push('Has test strategy defined');
    }

    // Factor: Priority
    if (task.priority === 'high') {
      score += 1;
      factors.push('High priority');
    }

    // Cap at 10
    const complexity = Math.min(10, score) as ComplexityScore;

    // Recommend subtasks based on complexity
    let recommendedSubtasks = 0;
    if (complexity >= 8) {
      recommendedSubtasks = 5;
    } else if (complexity >= 6) {
      recommendedSubtasks = 4;
    } else if (complexity >= 4) {
      recommendedSubtasks = 3;
    } else if (complexity >= 2) {
      recommendedSubtasks = 2;
    }

    return { complexity, recommendedSubtasks, factors };
  }

  // Expand a task into subtasks (generates placeholder subtasks based on complexity)
  static async expandTask(
    prdFilename: string,
    taskId: string,
    options: {
      numSubtasks?: number | undefined;
      force?: boolean | undefined;
    } = {},
  ): Promise<{ task: Task; subtasksCreated: number }> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const task = this.findTaskById(taskFile.tasks, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if already has subtasks
    if (task.subtasks.length > 0 && !options.force) {
      throw new Error(
        `Task ${taskId} already has ${task.subtasks.length} subtask(s). Use force=true to re-expand.`,
      );
    }

    // Clear existing subtasks if force
    if (options.force && task.subtasks.length > 0) {
      task.subtasks = [];
    }

    // Calculate complexity if not already done
    if (!task.complexity) {
      const analysis = this.calculateComplexity(task);
      task.complexity = analysis.complexity;
      task.recommendedSubtasks = analysis.recommendedSubtasks;
    }

    const numSubtasks = options.numSubtasks || task.recommendedSubtasks || 3;
    const now = new Date().toISOString();

    // Generate subtask titles based on task description
    const subtaskTitles = this.generateSubtaskTitles(task, numSubtasks);

    for (let i = 0; i < numSubtasks; i++) {
      const subtask: Task = {
        id: `${taskId}.${i + 1}`,
        title: subtaskTitles[i] || `Subtask ${i + 1}`,
        description: `Implementation step ${i + 1} for: ${task.title}`,
        status: 'pending',
        priority: task.priority,
        dependencies: i > 0 ? [`${taskId}.${i}`] : [], // Each subtask depends on previous
        subtasks: [],
        userStoryId: task.userStoryId,
        createdAt: now,
        updatedAt: now,
      };

      task.subtasks.push(subtask);
    }

    task.updatedAt = now;
    await this.saveTaskFile(prdFilename, taskFile);

    return { task, subtasksCreated: numSubtasks };
  }

  // Generate meaningful subtask titles based on parent task
  private static generateSubtaskTitles(task: Task, count: number): string[] {
    const titles: string[] = [];
    const baseTitle = task.title.toLowerCase();

    // Common implementation patterns
    const patterns = [
      'Research and design',
      'Set up foundation',
      'Implement core logic',
      'Add error handling',
      'Write tests',
      'Integrate with existing code',
      'Add documentation',
      'Review and refine',
    ];

    for (let i = 0; i < count; i++) {
      if (i < patterns.length) {
        titles.push(`${patterns[i]} for ${baseTitle}`);
      } else {
        titles.push(`Step ${i + 1} for ${baseTitle}`);
      }
    }

    return titles;
  }

  // Expand all tasks that meet complexity threshold
  static async expandAll(
    prdFilename: string,
    options: {
      threshold?: ComplexityScore | undefined;
      force?: boolean | undefined;
    } = {},
  ): Promise<{ expanded: number; tasks: string[] }> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const threshold = options.threshold || 5;
    const expandedTasks: string[] = [];

    // Get all tasks and sort by complexity (highest first)
    const allTasks = this.getAllTasksFlat(taskFile.tasks);

    // Calculate complexity for tasks that don't have it
    for (const task of allTasks) {
      if (!task.complexity) {
        const analysis = this.calculateComplexity(task);
        task.complexity = analysis.complexity;
        task.recommendedSubtasks = analysis.recommendedSubtasks;
      }
    }

    // Sort by complexity descending
    const tasksToExpand = allTasks
      .filter((t) => t.complexity! >= threshold)
      .filter((t) => t.subtasks.length === 0 || options.force)
      .sort((a, b) => (b.complexity || 0) - (a.complexity || 0));

    for (const task of tasksToExpand) {
      try {
        // Clear subtasks if forcing
        if (options.force) {
          task.subtasks = [];
        }

        const numSubtasks = task.recommendedSubtasks || 3;
        const now = new Date().toISOString();
        const subtaskTitles = this.generateSubtaskTitles(task, numSubtasks);

        for (let i = 0; i < numSubtasks; i++) {
          const subtask: Task = {
            id: `${task.id}.${i + 1}`,
            title: subtaskTitles[i] || `Subtask ${i + 1}`,
            description: `Implementation step ${i + 1} for: ${task.title}`,
            status: 'pending',
            priority: task.priority,
            dependencies: i > 0 ? [`${task.id}.${i}`] : [],
            subtasks: [],
            userStoryId: task.userStoryId,
            createdAt: now,
            updatedAt: now,
          };

          task.subtasks.push(subtask);
        }

        task.updatedAt = now;
        expandedTasks.push(`${task.id}: ${task.title} (${numSubtasks} subtasks)`);
      } catch {
        // Skip tasks that fail to expand
      }
    }

    await this.saveTaskFile(prdFilename, taskFile);

    return {
      expanded: expandedTasks.length,
      tasks: expandedTasks,
    };
  }

  // Get progress statistics
  static async getProgress(prdFilename: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    pending: number;
    deferred: number;
    percentage: number;
  }> {
    const taskFile = await this.loadTaskFile(prdFilename);
    const allTasks = this.getAllTasksFlat(taskFile.tasks);

    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.status === 'done').length;
    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
    const blocked = allTasks.filter((t) => t.status === 'blocked').length;
    const pending = allTasks.filter((t) => t.status === 'pending').length;
    const deferred = allTasks.filter((t) => t.status === 'deferred').length;

    return {
      total,
      completed,
      inProgress,
      blocked,
      pending,
      deferred,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

// MCP Tool Registration
export function registerTaskTools(server: McpServer) {
  createGetTasksTool(server);
  createGetTaskTool(server);
  createAddTaskTool(server);
  createAddSubtaskTool(server);
  createSetTaskStatusTool(server);
  createUpdateTaskTool(server);
  createRemoveTaskTool(server);
  createClearSubtasksTool(server);
  createAddDependencyTool(server);
  createRemoveDependencyTool(server);
  createValidateDependenciesTool(server);
  createFixDependenciesTool(server);
  createNextTaskTool(server);
  createAnalyzeComplexityTool(server);
  createComplexityReportTool(server);
  createGetProgressTool(server);
  createExpandTaskTool(server);
  createExpandAllTool(server);
}

// Helper to filter out undefined values from options objects
function filterUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function createGetTasksTool(server: McpServer) {
  return server.tool(
    'get_tasks',
    'Get all tasks for a PRD, optionally filtered by status or user story',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        status: z.enum(['pending', 'in_progress', 'done', 'blocked', 'deferred']).optional(),
        includeSubtasks: z.boolean().optional().default(true),
        userStoryId: z.string().optional(),
      }),
    },
    async ({ state }) => {
      const tasks = await TaskManager.getTasks(
        state.filename,
        filterUndefined({
          status: state.status,
          includeSubtasks: state.includeSubtasks,
          userStoryId: state.userStoryId,
        }),
      );

      return {
        content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      };
    },
  );
}

function createGetTaskTool(server: McpServer) {
  return server.tool(
    'get_task',
    'Get a specific task by ID',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task ID (e.g., "1", "1.1", "1.1.2")'),
      }),
    },
    async ({ state }) => {
      const task = await TaskManager.getTask(state.filename, state.taskId);

      if (!task) {
        return {
          content: [{ type: 'text', text: `Task ${state.taskId} not found` }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
      };
    },
  );
}

function createAddTaskTool(server: McpServer) {
  return server.tool(
    'add_task',
    'Add a new task to a PRD',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        title: z.string().describe('Task title'),
        description: z.string().describe('Task description'),
        priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
        dependencies: z.array(z.string()).optional(),
        details: z.string().optional().describe('Implementation notes'),
        testStrategy: z.string().optional().describe('Verification approach'),
        userStoryId: z.string().optional().describe('Associated user story ID'),
      }),
    },
    async ({ state }) => {
      const task = await TaskManager.addTask(
        state.filename,
        state.title,
        state.description,
        filterUndefined({
          priority: state.priority,
          dependencies: state.dependencies,
          details: state.details,
          testStrategy: state.testStrategy,
          userStoryId: state.userStoryId,
        }),
      );

      return {
        content: [{ type: 'text', text: `Task ${task.id} created: "${task.title}"` }],
      };
    },
  );
}

function createAddSubtaskTool(server: McpServer) {
  return server.tool(
    'add_subtask',
    'Add a subtask to an existing task',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        parentId: z.string().describe('Parent task ID'),
        title: z.string().describe('Subtask title'),
        description: z.string().describe('Subtask description'),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        dependencies: z.array(z.string()).optional(),
        details: z.string().optional(),
        testStrategy: z.string().optional(),
      }),
    },
    async ({ state }) => {
      const task = await TaskManager.addSubtask(
        state.filename,
        state.parentId,
        state.title,
        state.description,
        filterUndefined({
          priority: state.priority,
          dependencies: state.dependencies,
          details: state.details,
          testStrategy: state.testStrategy,
        }),
      );

      return {
        content: [
          {
            type: 'text',
            text: `Subtask ${task.id} created under ${state.parentId}: "${task.title}"`,
          },
        ],
      };
    },
  );
}

function createSetTaskStatusTool(server: McpServer) {
  return server.tool(
    'set_task_status',
    'Update the status of a task',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task ID'),
        status: z.enum(['pending', 'in_progress', 'done', 'blocked', 'deferred']),
        blockedReason: z.string().optional().describe('Required if status is blocked'),
        cascadeToSubtasks: z.boolean().optional().default(false),
      }),
    },
    async ({ state }) => {
      const task = await TaskManager.setTaskStatus(
        state.filename,
        state.taskId,
        state.status,
        filterUndefined({
          blockedReason: state.blockedReason,
          cascadeToSubtasks: state.cascadeToSubtasks,
        }),
      );

      return {
        content: [{ type: 'text', text: `Task ${task.id} status updated to ${task.status}` }],
      };
    },
  );
}

function createUpdateTaskTool(server: McpServer) {
  return server.tool(
    'update_task',
    'Update task details (title, description, priority, details, testStrategy)',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task ID'),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        details: z.string().optional(),
        testStrategy: z.string().optional(),
      }),
    },
    async ({ state }) => {
      const { filename, taskId, ...updates } = state;
      const task = await TaskManager.updateTask(filename, taskId, filterUndefined(updates));

      return {
        content: [{ type: 'text', text: `Task ${task.id} updated` }],
      };
    },
  );
}

function createRemoveTaskTool(server: McpServer) {
  return server.tool(
    'remove_task',
    'Remove a task and update dependencies',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task ID to remove'),
      }),
    },
    async ({ state }) => {
      const removed = await TaskManager.removeTask(state.filename, state.taskId);

      return {
        content: [
          {
            type: 'text',
            text: removed ? `Task ${state.taskId} removed` : `Task ${state.taskId} not found`,
          },
        ],
      };
    },
  );
}

function createClearSubtasksTool(server: McpServer) {
  return server.tool(
    'clear_subtasks',
    'Remove all subtasks from a task',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task ID'),
      }),
    },
    async ({ state }) => {
      const count = await TaskManager.clearSubtasks(state.filename, state.taskId);

      return {
        content: [{ type: 'text', text: `Removed ${count} subtask(s) from task ${state.taskId}` }],
      };
    },
  );
}

function createAddDependencyTool(server: McpServer) {
  return server.tool(
    'add_dependency',
    'Add a dependency between tasks',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task that will depend on another'),
        dependsOnId: z.string().describe('Task that must be completed first'),
      }),
    },
    async ({ state }) => {
      const task = await TaskManager.addDependency(state.filename, state.taskId, state.dependsOnId);

      return {
        content: [
          {
            type: 'text',
            text: `Task ${task.id} now depends on ${state.dependsOnId}. Dependencies: [${task.dependencies.join(', ')}]`,
          },
        ],
      };
    },
  );
}

function createRemoveDependencyTool(server: McpServer) {
  return server.tool(
    'remove_dependency',
    'Remove a dependency between tasks',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task to remove dependency from'),
        dependsOnId: z.string().describe('Dependency to remove'),
      }),
    },
    async ({ state }) => {
      const task = await TaskManager.removeDependency(
        state.filename,
        state.taskId,
        state.dependsOnId,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Dependency on ${state.dependsOnId} removed from task ${task.id}. Remaining dependencies: [${task.dependencies.join(', ')}]`,
          },
        ],
      };
    },
  );
}

function createValidateDependenciesTool(server: McpServer) {
  return server.tool(
    'validate_dependencies',
    'Validate all task dependencies for cycles and missing tasks',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
      }),
    },
    async ({ state }) => {
      const result = await TaskManager.validateDependencies(state.filename);

      if (result.valid) {
        return {
          content: [{ type: 'text', text: 'All dependencies are valid!' }],
        };
      }

      const issuesList = result.issues.map((i) => `- Task ${i.taskId}: ${i.issue}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.issues.length} dependency issue(s):\n\n${issuesList}`,
          },
        ],
      };
    },
  );
}

function createFixDependenciesTool(server: McpServer) {
  return server.tool(
    'fix_dependencies',
    'Auto-fix simple dependency issues (remove non-existent, self-references)',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
      }),
    },
    async ({ state }) => {
      const result = await TaskManager.fixDependencies(state.filename);

      if (result.fixed === 0) {
        return {
          content: [{ type: 'text', text: 'No dependency issues to fix.' }],
        };
      }

      const issuesList = result.issues.map((i) => `- ${i}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Fixed ${result.fixed} task(s):\n\n${issuesList}`,
          },
        ],
      };
    },
  );
}

function createNextTaskTool(server: McpServer) {
  return server.tool(
    'next_task',
    'Get the next actionable task based on dependencies and priority',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        userStoryId: z.string().optional().describe('Filter by user story'),
      }),
    },
    async ({ state }) => {
      const result = await TaskManager.getNextTask(
        state.filename,
        filterUndefined({
          userStoryId: state.userStoryId,
        }),
      );

      if (!result.task) {
        return {
          content: [{ type: 'text', text: result.reason }],
        };
      }

      let response = `**Next Task: ${result.task.id}**\n\n`;
      response += `**Title:** ${result.task.title}\n`;
      response += `**Priority:** ${result.task.priority}\n`;
      response += `**Description:** ${result.task.description}\n`;

      if (result.task.details) {
        response += `\n**Implementation Details:**\n${result.task.details}\n`;
      }

      if (result.task.testStrategy) {
        response += `\n**Test Strategy:**\n${result.task.testStrategy}\n`;
      }

      if (result.task.dependencies.length > 0) {
        response += `\n**Dependencies:** ${result.task.dependencies.join(', ')} (all completed)\n`;
      }

      response += `\n---\n${result.reason}`;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createAnalyzeComplexityTool(server: McpServer) {
  return server.tool(
    'analyze_complexity',
    'Analyze complexity of all tasks and recommend breakdowns',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        threshold: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe('Complexity threshold for flagging tasks (1-10)'),
      }),
    },
    async ({ state }) => {
      const report = await TaskManager.analyzeComplexity(state.filename, {
        threshold: state.threshold as ComplexityScore,
      });

      let response = `**Complexity Analysis**\n\n`;
      response += `Generated: ${report.generatedAt}\n\n`;
      response += `**Summary:**\n`;
      response += `- Total tasks: ${report.summary.total}\n`;
      response += `- Low complexity (1-3): ${report.summary.low}\n`;
      response += `- Medium complexity (4-6): ${report.summary.medium}\n`;
      response += `- High complexity (7-10): ${report.summary.high}\n`;
      response += `- Average complexity: ${report.summary.averageComplexity}\n`;

      if (report.recommendations.length > 0) {
        response += `\n**Recommendations:**\n`;
        report.recommendations.forEach((r) => {
          response += `${r}\n`;
        });
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createComplexityReportTool(server: McpServer) {
  return server.tool(
    'complexity_report',
    'Get detailed complexity report for all tasks',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
      }),
    },
    async ({ state }) => {
      const report = await TaskManager.analyzeComplexity(state.filename);

      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
      };
    },
  );
}

function createGetProgressTool(server: McpServer) {
  return server.tool(
    'get_task_progress',
    'Get task completion progress statistics',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
      }),
    },
    async ({ state }) => {
      const progress = await TaskManager.getProgress(state.filename);

      let response = `**Task Progress**\n\n`;
      response += `- Total: ${progress.total}\n`;
      response += `- Completed: ${progress.completed} (${progress.percentage}%)\n`;
      response += `- In Progress: ${progress.inProgress}\n`;
      response += `- Pending: ${progress.pending}\n`;
      response += `- Blocked: ${progress.blocked}\n`;
      response += `- Deferred: ${progress.deferred}\n`;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createExpandTaskTool(server: McpServer) {
  return server.tool(
    'expand_task',
    'Expand a task into subtasks based on complexity analysis',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        taskId: z.string().describe('Task ID to expand'),
        numSubtasks: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe('Number of subtasks to create (default: based on complexity)'),
        force: z
          .boolean()
          .optional()
          .default(false)
          .describe('Force re-expansion if task already has subtasks'),
      }),
    },
    async ({ state }) => {
      const result = await TaskManager.expandTask(
        state.filename,
        state.taskId,
        filterUndefined({
          numSubtasks: state.numSubtasks,
          force: state.force,
        }),
      );

      let response = `**Task ${result.task.id} Expanded**\n\n`;
      response += `Created ${result.subtasksCreated} subtask(s):\n\n`;

      result.task.subtasks.forEach((subtask) => {
        response += `- ${subtask.id}: ${subtask.title}\n`;
      });

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createExpandAllTool(server: McpServer) {
  return server.tool(
    'expand_all',
    'Expand all tasks that exceed a complexity threshold into subtasks',
    {
      state: z.object({
        filename: z.string().describe('PRD filename'),
        threshold: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe('Complexity threshold (1-10) for tasks to expand'),
        force: z
          .boolean()
          .optional()
          .default(false)
          .describe('Force re-expansion of tasks that already have subtasks'),
      }),
    },
    async ({ state }) => {
      const result = await TaskManager.expandAll(state.filename, {
        threshold: state.threshold as ComplexityScore,
        force: state.force,
      });

      if (result.expanded === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No tasks found with complexity >= ${state.threshold} that need expansion.`,
            },
          ],
        };
      }

      let response = `**Expanded ${result.expanded} Task(s)**\n\n`;
      response += `Tasks expanded (processed in order of highest complexity):\n\n`;

      result.tasks.forEach((task) => {
        response += `- ${task}\n`;
      });

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}
