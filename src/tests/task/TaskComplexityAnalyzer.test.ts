import { describe, test, expect } from "vitest"
import { TaskComplexityAnalyzer, DEFAULT_AUTO_TODO_CONFIG } from "../../core/task/TaskComplexityAnalyzer"

describe("TaskComplexityAnalyzer", () => {
	test("should detect simple tasks and not create TODOs", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)
		const result = analyzer.analyzeTask("Fix the typo in the README file")

		expect(result.shouldCreateTodos).toBe(false)
		expect(result.complexityScore).toBeLessThan(DEFAULT_AUTO_TODO_CONFIG.complexityThreshold)
		expect(result.suggestedTodos).toHaveLength(0)
	})

	test("should detect complex tasks and create TODOs", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)
		const complexTask = `
			Create a new React component for user authentication that includes:
			1. Login form with email and password validation
			2. Registration form with email verification
			3. Password reset functionality
			4. Integration with backend API
			5. Error handling and loading states
			6. Unit tests for all components
			7. Documentation and examples
		`

		const result = analyzer.analyzeTask(complexTask)

		expect(result.shouldCreateTodos).toBe(true)
		expect(result.complexityScore).toBeGreaterThanOrEqual(DEFAULT_AUTO_TODO_CONFIG.complexityThreshold)
		expect(result.suggestedTodos.length).toBeGreaterThan(0)
		expect(result.reasoning.length).toBeGreaterThan(0)
	})

	test("should detect multi-step tasks", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)
		const multiStepTask = `
			First, analyze the existing codebase structure.
			Then, implement the new feature.
			Next, write comprehensive tests.
			Finally, update the documentation.
		`

		const result = analyzer.analyzeTask(multiStepTask)

		expect(result.shouldCreateTodos).toBe(true)
		expect(result.complexityScore).toBeGreaterThanOrEqual(DEFAULT_AUTO_TODO_CONFIG.complexityThreshold)
		expect(result.suggestedTodos.length).toBeGreaterThan(0)
		// The analyzer generates contextual TODOs based on keywords, not exact text
		expect(result.suggestedTodos.some((todo) => todo.toLowerCase().includes("implement"))).toBe(true)
	})

	test("should detect numbered lists", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)
		const numberedTask = `
			Please complete the following tasks:
			1. Set up the development environment
			2. Create the database schema
			3. Implement the API endpoints
			4. Build the frontend interface
			5. Deploy to staging environment
		`

		const result = analyzer.analyzeTask(numberedTask)

		expect(result.shouldCreateTodos).toBe(true)
		expect(result.complexityScore).toBeGreaterThanOrEqual(DEFAULT_AUTO_TODO_CONFIG.complexityThreshold)
		expect(result.suggestedTodos.length).toBeGreaterThan(0)
		// The analyzer detects "implement" and "api" keywords and generates contextual TODOs
		expect(result.suggestedTodos.some((todo) => todo.toLowerCase().includes("api"))).toBe(true)
	})

	test("should detect bullet point lists", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)
		const bulletTask = `
			Create a new feature that includes:
			- User authentication system
			- Dashboard with analytics
			- Settings page with preferences
			- Email notification system
			- Mobile responsive design
		`

		const result = analyzer.analyzeTask(bulletTask)

		expect(result.shouldCreateTodos).toBe(true)
		expect(result.complexityScore).toBeGreaterThanOrEqual(DEFAULT_AUTO_TODO_CONFIG.complexityThreshold)
		expect(result.suggestedTodos.length).toBeGreaterThan(0)
		// The analyzer detects "create" keyword and generates contextual TODOs for applications
		expect(
			result.suggestedTodos.some(
				(todo) =>
					todo.toLowerCase().includes("implement") ||
					todo.toLowerCase().includes("design") ||
					todo.toLowerCase().includes("analyze"),
			),
		).toBe(true)
	})

	test("should handle custom configuration", () => {
		const customConfig = {
			enabled: true,
			complexityThreshold: 10,
			minTaskLength: 20,
			maxInitialTodos: 3,
		}

		const analyzer = new TaskComplexityAnalyzer(customConfig)
		const task = "Implement a new feature and create comprehensive tests"

		const result = analyzer.analyzeTask(task)

		expect(result.complexityScore).toBeGreaterThan(0)
		expect(result.suggestedTodos.length).toBeLessThanOrEqual(customConfig.maxInitialTodos)
	})

	test("should respect enabled setting", () => {
		const disabledConfig = {
			...DEFAULT_AUTO_TODO_CONFIG,
			enabled: false,
		}

		const analyzer = new TaskComplexityAnalyzer(disabledConfig)
		const complexTask = `
			Create a comprehensive web application with:
			1. Frontend React components
			2. Backend API with authentication
			3. Database design and implementation
			4. Testing suite
			5. Documentation
		`

		const result = analyzer.analyzeTask(complexTask)

		expect(result.shouldCreateTodos).toBe(false)
		// TODOs may still be generated for analysis, but shouldCreateTodos should be false
		expect(result.complexityScore).toBeGreaterThan(0)
	})

	test("should generate contextual TODOs based on task type", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)

		// Bug fix task
		const bugTask = "Fix the authentication bug where users cannot log in with special characters in their password"
		const bugResult = analyzer.analyzeTask(bugTask)

		if (bugResult.shouldCreateTodos) {
			expect(
				bugResult.suggestedTodos.some(
					(todo) =>
						todo.toLowerCase().includes("reproduce") ||
						todo.toLowerCase().includes("identify") ||
						todo.toLowerCase().includes("test"),
				),
			).toBe(true)
		}

		// Feature task
		const featureTask = "Implement a new user dashboard with analytics, charts, and user management capabilities"
		const featureResult = analyzer.analyzeTask(featureTask)

		if (featureResult.shouldCreateTodos) {
			expect(
				featureResult.suggestedTodos.some(
					(todo) =>
						todo.toLowerCase().includes("design") ||
						todo.toLowerCase().includes("implement") ||
						todo.toLowerCase().includes("test"),
				),
			).toBe(true)
		}
	})

	test("should limit number of suggested TODOs", () => {
		const analyzer = new TaskComplexityAnalyzer(DEFAULT_AUTO_TODO_CONFIG)
		const longTask = `
			Create a massive application with:
			1. User authentication
			2. User profiles
			3. Dashboard
			4. Analytics
			5. Reporting
			6. Settings
			7. Admin panel
			8. API documentation
			9. Testing suite
			10. Deployment scripts
			11. Monitoring
			12. Logging
			13. Error handling
			14. Performance optimization
			15. Security audit
		`

		const result = analyzer.analyzeTask(longTask)

		expect(result.suggestedTodos.length).toBeLessThanOrEqual(DEFAULT_AUTO_TODO_CONFIG.maxInitialTodos)
	})
})
