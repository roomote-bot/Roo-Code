import { ToolArgs } from "./types"

export function getExecuteCommandDescription(args: ToolArgs): string | undefined {
	return `## execute_command
Description: Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task. You must tailor your command to the user's system and provide a clear explanation of what the command does. For command chaining, use the appropriate chaining syntax for the user's shell. Prefer to execute complex CLI commands over creating executable scripts, as they are more flexible and easier to run. Prefer relative commands and paths that avoid location sensitivity for terminal consistency, e.g: \`touch ./testdata/example.file\`, \`dir ./examples/model1/data/yaml\`, or \`go test ./cmd/front --config ./cmd/front/config.yml\`. If directed by the user, you may open a terminal in a different directory by using the \`cwd\` parameter.
Parameters:
- command: (required) The CLI command to execute. This should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions.
- cwd: (optional) The working directory to execute the command in (default: ${args.cwd})
- prefix: (optional) The command prefix extracted from the command that represents a logical, safe action. This should capture the specific intent of the command rather than just the executable name. For example, use "npm install" for package installation, "git status" for git operations, "docker build" for Docker builds. Avoid generic prefixes like "python" or "node" that could be used for various purposes including malicious ones. For chained commands (using &&, ||, ;, | etc.), do not provide a prefix as these are too complex for safe auto-approval. The prefix should represent a category of single commands that users would feel safe auto-approving.
Usage:
<execute_command>
<command>Your command here</command>
<prefix>Command prefix here</prefix>
<cwd>Working directory path (optional)</cwd>
</execute_command>

Example: Requesting to execute npm test
<execute_command>
<command>npm test</command>
<prefix>npm test</prefix>
</execute_command>

Example: Requesting to execute git status
<execute_command>
<command>git status</command>
<prefix>git status</prefix>
</execute_command>

Example: Requesting to execute ls in a specific directory if directed
<execute_command>
<command>ls -la</command>
<prefix>ls</prefix>
<cwd>/home/user/projects</cwd>
</execute_command>

Example: NPM package installation
<execute_command>
<command>npm install express</command>
<prefix>npm install</prefix>
</execute_command>

Example: NPM script execution
<execute_command>
<command>npm run build</command>
<prefix>npm run</prefix>
</execute_command>

Example: Yarn package installation
<execute_command>
<command>yarn add typescript</command>
<prefix>yarn add</prefix>
</execute_command>

Example: Git status check
<execute_command>
<command>git diff --cached</command>
<prefix>git diff</prefix>
</execute_command>

Example: Git log viewing
<execute_command>
<command>git log --oneline</command>
<prefix>git log</prefix>
</execute_command>

Example: Git branch operations
<execute_command>
<command>git checkout -b feature-branch</command>
<prefix>git checkout</prefix>
</execute_command>

Example: Docker build
<execute_command>
<command>docker build -t myapp .</command>
<prefix>docker build</prefix>
</execute_command>

Example: Docker container listing
<execute_command>
<command>docker ps -a</command>
<prefix>docker ps</prefix>
</execute_command>

Example: Cargo testing
<execute_command>
<command>cargo test --release</command>
<prefix>cargo test</prefix>
</execute_command>

Example: Cargo building
<execute_command>
<command>cargo build --release</command>
<prefix>cargo build</prefix>
</execute_command>

Example: Go testing
<execute_command>
<command>go test ./...</command>
<prefix>go test</prefix>
</execute_command>

Example: Go module management
<execute_command>
<command>go mod tidy</command>
<prefix>go mod</prefix>
</execute_command>

Example: Maven clean
<execute_command>
<command>mvn clean compile</command>
<prefix>mvn clean</prefix>
</execute_command>

Example: Maven testing
<execute_command>
<command>mvn test</command>
<prefix>mvn test</prefix>
</execute_command>

Example: Pip package installation
<execute_command>
<command>pip install -r requirements.txt</command>
<prefix>pip install</prefix>
</execute_command>

Example: File listing
<execute_command>
<command>ls -la src/</command>
<prefix>ls</prefix>
</execute_command>

Example: Directory creation
<execute_command>
<command>mkdir -p build/output</command>
<prefix>mkdir</prefix>
</execute_command>

Example: File copying
<execute_command>
<command>cp config.example.json config.json</command>
<prefix>cp</prefix>
</execute_command>

Example: File moving
<execute_command>
<command>mv old-name.txt new-name.txt</command>
<prefix>mv</prefix>
</execute_command>

Example: Text search
<execute_command>
<command>grep -r "TODO" src/</command>
<prefix>grep</prefix>
</execute_command>

Example: File search
<execute_command>
<command>find . -name "*.ts" -type f</command>
<prefix>find</prefix>
</execute_command>

Example: File permissions
<execute_command>
<command>chmod +x build.sh</command>
<prefix>chmod</prefix>
</execute_command>

Example: Chained command (no prefix provided for safety)
<execute_command>
<command>npm run build && npm run test</command>
</execute_command>`
}
