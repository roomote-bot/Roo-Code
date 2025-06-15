import * as sax from "sax"
import { BaseDirectiveHandler } from "./BaseDirectiveHandler"
import { ParseContext } from "../ParseContext"
import { ToolParamName } from "../../../shared/tools"
import { ToolDirective } from "../directives"

export class ToolDirectiveHandler extends BaseDirectiveHandler {
	readonly tagName: string
	private currentToolDirective?: ToolDirective
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
			this.currentToolDirective = {
				type: "tool_use",
				name: this.tagName as any,
				params: {},
				partial: true,
			}
			this.currentContext = "none"
		} else if (this.currentToolDirective) {
			this.currentParamName = node.name as ToolParamName
			this.currentParamValue = ""
			this.currentContext = "param"
		}
	}

	override onCloseTag(tagName: string, context: ParseContext): void {
		if (tagName === this.tagName && this.currentToolDirective) {
			this.currentToolDirective.partial =
				context.hasIncompleteXml || Object.keys(this.currentToolDirective.params).length === 0
			context.contentBlocks.push(this.currentToolDirective)
			this.currentToolDirective = undefined
		} else if (this.currentToolDirective && this.currentParamName && tagName === this.currentParamName) {
			;(this.currentToolDirective.params as Record<string, string>)[this.currentParamName] =
				this.currentParamValue.trim()
			this.currentParamName = undefined
			this.currentParamValue = ""
			this.currentContext = "none"
		}
	}

	override onText(text: string, context: ParseContext): void {
		if (this.currentContext === "param" && this.currentParamName && this.currentToolDirective) {
			this.currentParamValue += text
		}
	}

	override onEnd(context: ParseContext): void {
		if (this.currentToolDirective) {
			if (this.currentParamName && this.currentParamValue) {
				;(this.currentToolDirective.params as Record<string, string>)[this.currentParamName] =
					this.currentParamValue.trim()
			}
			this.currentToolDirective.partial = true
			context.contentBlocks.push(this.currentToolDirective)
		}
	}
}
