import { Package } from "@roo/package"

interface VersionIndicatorProps {
	onClick?: () => void
	className?: string
}

const VersionIndicator = ({ onClick, className }: VersionIndicatorProps) => {
	return (
		<div
			className={`text-xs text-vscode-descriptionForeground cursor-pointer hover:text-vscode-foreground transition-colors ${className || ""}`}
			onClick={onClick}
			title={`Roo Code v${Package.version}`}>
			v{Package.version}
		</div>
	)
}

export default VersionIndicator
