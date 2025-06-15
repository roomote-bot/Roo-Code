import * as sax from "sax"
import { BaseDirectiveHandler } from "./BaseDirectiveHandler"
import { ParseContext } from "../interfaces/ParseContext"
import { ToolUse, ToolParamName } from "../../../shared/tools"

export class ToolDirectiveHandler extends BaseDirectiveHandler {
	readonly tagName: string
	private currentToolUse?: ToolUse
	private currentParamName?: ToolParamName
	private currentParamValue = ""
	private currentContext: "param" | "none" = "none"

	constructor(toolName: string) {
		super()
		this.tagName = toolName
	}

	override onOpenTag(node: sax.Tag, context: ParseContext): void {
		if (node.name === this.tagName) {
			this.flushCurrentText(context)
			this.currentToolUse = {
				type: "tool_use",
				name: this.tagName as any,
				params: {},
				partial: true,
			}
			this.currentContext = "none"
		} else if (this.currentToolUse) {
			this.currentParamName = node.name as ToolParamName
			this.currentParamValue = ""
			this.currentContext = "param"
		}
	}

	override onCloseTag(tagName: string, context: ParseContext): void {
		if (tagName === this.tagName && this.currentToolUse) {
			this.currentToolUse.partial =
				context.hasIncompleteXml || Object.keys(this.currentToolUse.params).length === 0
			context.contentBlocks.push(this.currentToolUse)
			this.currentToolUse = undefined
		} else if (this.currentToolUse && this.currentParamName && tagName === this.currentParamName) {
			;(this.currentToolUse.params as Record<string, string>)[this.currentParamName] =
				this.currentParamValue.trim()
			this.currentParamName = undefined
			this.currentParamValue = ""
			this.currentContext = "none"
		}
	}

	override onText(text: string, context: ParseContext): void {
		if (this.currentContext === "param" && this.currentParamName && this.currentToolUse) {
			this.currentParamValue += text
		}
	}

	override onEnd(context: ParseContext): void {
		if (this.currentToolUse) {
			if (this.currentParamName && this.currentParamValue) {
				;(this.currentToolUse.params as Record<string, string>)[this.currentParamName] =
					this.currentParamValue.trim()
			}
			this.currentToolUse.partial = true
			context.contentBlocks.push(this.currentToolUse)
		}
	}
}
