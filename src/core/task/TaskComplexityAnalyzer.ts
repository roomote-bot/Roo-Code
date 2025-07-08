import { TodoItem } from "@roo-code/types"
import { addTodoToTask } from "../tools/updateTodoListTool"
import { Task } from "./Task"

/**
 * Configuration for automatic TODO list creation
 */
export interface AutoTodoConfig {
	enabled: boolean
	complexityThreshold: number
	minTaskLength: number
	maxInitialTodos: number
}

/**
 * Default configuration for automatic TODO list creation
 */
export const DEFAULT_AUTO_TODO_CONFIG: AutoTodoConfig = {
	enabled: true,
	complexityThreshold: 3, // Minimum complexity score to trigger auto TODO
	minTaskLength: 50, // Minimum task description length
	maxInitialTodos: 8, // Maximum number of initial TODOs to create
}

/**
 * Keywords that indicate task complexity and suggest multiple steps
 */
const COMPLEXITY_KEYWORDS = {
	// High complexity indicators (weight: 3)
	high: [
		"create",
		"build",
		"implement",
		"develop",
		"design",
		"architect",
		"full-stack",
		"end-to-end",
		"complete",
		"entire",
		"comprehensive",
		"system",
		"application",
		"project",
		"framework",
		"platform",
		"integrate",
		"configure",
		"setup",
		"install",
		"deploy",
	],
	// Medium complexity indicators (weight: 2)
	medium: [
		"add",
		"update",
		"modify",
		"refactor",
		"optimize",
		"improve",
		"enhance",
		"extend",
		"migrate",
		"convert",
		"transform",
		"test",
		"debug",
		"fix",
		"resolve",
		"handle",
		"manage",
	],
	// Step indicators (weight: 2)
	steps: [
		"step",
		"steps",
		"phase",
		"phases",
		"stage",
		"stages",
		"first",
		"then",
		"next",
		"after",
		"before",
		"finally",
		"initially",
		"subsequently",
		"process",
		"workflow",
	],
	// Multiple item indicators (weight: 1)
	multiple: [
		"multiple",
		"several",
		"various",
		"different",
		"many",
		"all",
		"each",
		"every",
		"both",
		"and",
		"also",
		"plus",
	],
}

/**
 * Patterns that suggest multiple steps or complex workflows
 */
const COMPLEXITY_PATTERNS = [
	// Lists or enumerations
	/\d+\.\s+/g, // "1. ", "2. ", etc.
	/[-*]\s+/g, // "- " or "* " bullet points
	/\b(first|second|third|fourth|fifth|then|next|after|finally)\b/gi,
	// Conditional or branching logic
	/\b(if|when|unless|depending|based on|according to)\b/gi,
	// Multiple technologies or components
	/\b(with|using|and|plus|\+|&)\s+\w+/gi,
	// Authentication, database, API patterns
	/\b(auth|database|api|frontend|backend|server|client)\b/gi,
]

/**
 * Analyzes task description to determine complexity and suggest initial TODOs
 */
export class TaskComplexityAnalyzer {
	private config: AutoTodoConfig

	constructor(config: Partial<AutoTodoConfig> = {}) {
		this.config = { ...DEFAULT_AUTO_TODO_CONFIG, ...config }
	}

	/**
	 * Analyzes a task description and returns complexity score and suggested TODOs
	 */
	analyzeTask(taskDescription: string): {
		complexityScore: number
		shouldCreateTodos: boolean
		suggestedTodos: string[]
		reasoning: string[]
	} {
		if (!taskDescription || taskDescription.length < this.config.minTaskLength) {
			return {
				complexityScore: 0,
				shouldCreateTodos: false,
				suggestedTodos: [],
				reasoning: ["Task description too short for complexity analysis"],
			}
		}

		const reasoning: string[] = []
		let complexityScore = 0

		// Analyze keyword complexity
		const keywordScore = this.analyzeKeywords(taskDescription, reasoning)
		complexityScore += keywordScore

		// Analyze pattern complexity
		const patternScore = this.analyzePatterns(taskDescription, reasoning)
		complexityScore += patternScore

		// Analyze length and structure
		const structureScore = this.analyzeStructure(taskDescription, reasoning)
		complexityScore += structureScore

		// Generate suggested TODOs based on the task
		const suggestedTodos = this.generateSuggestedTodos(taskDescription, complexityScore)

		const shouldCreateTodos =
			this.config.enabled && complexityScore >= this.config.complexityThreshold && suggestedTodos.length > 0

		reasoning.push(`Total complexity score: ${complexityScore}`)
		reasoning.push(`Threshold: ${this.config.complexityThreshold}`)
		reasoning.push(`Should create TODOs: ${shouldCreateTodos}`)

		return {
			complexityScore,
			shouldCreateTodos,
			suggestedTodos,
			reasoning,
		}
	}

	/**
	 * Analyzes keywords in the task description
	 */
	private analyzeKeywords(task: string, reasoning: string[]): number {
		const lowerTask = task.toLowerCase()
		let score = 0

		// Check high complexity keywords
		const highMatches = COMPLEXITY_KEYWORDS.high.filter((keyword) => lowerTask.includes(keyword))
		if (highMatches.length > 0) {
			score += highMatches.length * 3
			reasoning.push(`High complexity keywords found: ${highMatches.join(", ")} (+${highMatches.length * 3})`)
		}

		// Check medium complexity keywords
		const mediumMatches = COMPLEXITY_KEYWORDS.medium.filter((keyword) => lowerTask.includes(keyword))
		if (mediumMatches.length > 0) {
			score += mediumMatches.length * 2
			reasoning.push(
				`Medium complexity keywords found: ${mediumMatches.join(", ")} (+${mediumMatches.length * 2})`,
			)
		}

		// Check step indicators
		const stepMatches = COMPLEXITY_KEYWORDS.steps.filter((keyword) => lowerTask.includes(keyword))
		if (stepMatches.length > 0) {
			score += stepMatches.length * 2
			reasoning.push(`Step indicators found: ${stepMatches.join(", ")} (+${stepMatches.length * 2})`)
		}

		// Check multiple item indicators
		const multipleMatches = COMPLEXITY_KEYWORDS.multiple.filter((keyword) => lowerTask.includes(keyword))
		if (multipleMatches.length > 0) {
			score += multipleMatches.length * 1
			reasoning.push(`Multiple item indicators found: ${multipleMatches.join(", ")} (+${multipleMatches.length})`)
		}

		return score
	}

	/**
	 * Analyzes patterns that suggest complexity
	 */
	private analyzePatterns(task: string, reasoning: string[]): number {
		let score = 0

		for (const pattern of COMPLEXITY_PATTERNS) {
			const matches = task.match(pattern)
			if (matches && matches.length > 0) {
				score += matches.length
				reasoning.push(`Pattern matches for ${pattern.source}: ${matches.length} (+${matches.length})`)
			}
		}

		return Math.min(score, 10) // Cap pattern score at 10
	}

	/**
	 * Analyzes task structure and length
	 */
	private analyzeStructure(task: string, reasoning: string[]): number {
		let score = 0

		// Length-based scoring
		if (task.length > 200) {
			score += 2
			reasoning.push("Long task description (+2)")
		} else if (task.length > 100) {
			score += 1
			reasoning.push("Medium task description (+1)")
		}

		// Sentence count
		const sentences = task.split(/[.!?]+/).filter((s) => s.trim().length > 0)
		if (sentences.length > 3) {
			score += 2
			reasoning.push(`Multiple sentences: ${sentences.length} (+2)`)
		}

		// Line breaks suggest structured content
		const lines = task.split(/\n/).filter((l) => l.trim().length > 0)
		if (lines.length > 2) {
			score += 1
			reasoning.push(`Multiple lines: ${lines.length} (+1)`)
		}

		return score
	}

	/**
	 * Generates suggested TODO items based on task analysis
	 */
	private generateSuggestedTodos(task: string, complexityScore: number): string[] {
		const todos: string[] = []
		const lowerTask = task.toLowerCase()

		// Common patterns for different types of tasks
		if (this.containsAny(lowerTask, ["create", "build", "develop", "implement"])) {
			if (this.containsAny(lowerTask, ["app", "application", "website", "system"])) {
				todos.push("Analyze requirements and define scope")
				todos.push("Design system architecture")
				todos.push("Set up project structure")
				todos.push("Implement core functionality")
				todos.push("Add error handling and validation")
				todos.push("Write tests")
				todos.push("Update documentation")
			} else if (this.containsAny(lowerTask, ["api", "endpoint", "service"])) {
				todos.push("Define API specification")
				todos.push("Set up routing and middleware")
				todos.push("Implement endpoint logic")
				todos.push("Add authentication and authorization")
				todos.push("Write API tests")
				todos.push("Update API documentation")
			} else if (this.containsAny(lowerTask, ["component", "ui", "interface"])) {
				todos.push("Design component interface")
				todos.push("Implement component logic")
				todos.push("Add styling and responsive design")
				todos.push("Handle user interactions")
				todos.push("Write component tests")
				todos.push("Update component documentation")
			}
		}

		if (this.containsAny(lowerTask, ["fix", "debug", "resolve", "issue"])) {
			todos.push("Reproduce the issue")
			todos.push("Identify root cause")
			todos.push("Implement fix")
			todos.push("Test the solution")
			todos.push("Verify no regression")
		}

		if (this.containsAny(lowerTask, ["refactor", "optimize", "improve"])) {
			todos.push("Analyze current implementation")
			todos.push("Identify improvement opportunities")
			todos.push("Plan refactoring approach")
			todos.push("Implement improvements")
			todos.push("Test refactored code")
			todos.push("Update related documentation")
		}

		if (this.containsAny(lowerTask, ["setup", "configure", "install"])) {
			todos.push("Review setup requirements")
			todos.push("Install dependencies")
			todos.push("Configure environment")
			todos.push("Test configuration")
			todos.push("Document setup process")
		}

		// If no specific patterns matched, create generic todos based on complexity
		if (todos.length === 0 && complexityScore >= this.config.complexityThreshold) {
			todos.push("Break down the task into smaller steps")
			todos.push("Analyze requirements and constraints")
			todos.push("Plan implementation approach")
			todos.push("Execute the main task")
			todos.push("Test and verify results")
		}

		// Limit the number of initial todos
		return todos.slice(0, this.config.maxInitialTodos)
	}

	/**
	 * Helper method to check if text contains any of the given keywords
	 */
	private containsAny(text: string, keywords: string[]): boolean {
		return keywords.some((keyword) => text.includes(keyword))
	}

	/**
	 * Creates automatic TODO list for a task if complexity threshold is met
	 */
	async createAutomaticTodoList(cline: Task, taskDescription: string): Promise<boolean> {
		const analysis = this.analyzeTask(taskDescription)

		if (!analysis.shouldCreateTodos) {
			return false
		}

		// Create TODO items
		for (const todoContent of analysis.suggestedTodos) {
			addTodoToTask(cline, todoContent, "pending")
		}

		// Log the automatic TODO creation
		await cline.say(
			"text",
			`🎯 **Automatic TODO List Created**\n\nDetected complex task requiring step-by-step tracking. Created ${analysis.suggestedTodos.length} initial TODO items:\n\n${analysis.suggestedTodos.map((todo, i) => `${i + 1}. ${todo}`).join("\n")}\n\n*You can update this list as the task progresses using the update_todo_list tool.*`,
		)

		return true
	}

	/**
	 * Updates the configuration
	 */
	updateConfig(newConfig: Partial<AutoTodoConfig>): void {
		this.config = { ...this.config, ...newConfig }
	}

	/**
	 * Gets the current configuration
	 */
	getConfig(): AutoTodoConfig {
		return { ...this.config }
	}
}
