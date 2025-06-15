import { BaseDirectiveHandler } from "./BaseDirectiveHandler"
import { ParseContext } from "../interfaces/ParseContext"
import { TextDirective } from "../directives"

export class TextDirectiveHandler extends BaseDirectiveHandler {
	readonly tagName = "text"
	private currentState: "text" | "none" = "text"

	override canHandle(tagName: string): boolean {
		return false // Text handler is fallback
	}

	override onText(text: string, context: ParseContext): void {
		if (this.currentState === "text") {
			context.currentText += text
		}
	}

	setState(state: "text" | "none"): void {
		this.currentState = state
	}

	override onEnd(context: ParseContext): void {
		if (context.currentText.trim()) {
			context.contentBlocks.push({
				type: "text",
				content: context.currentText.trim(),
				partial: true,
			} as TextDirective)
		}
	}
}
