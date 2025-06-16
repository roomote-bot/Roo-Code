import * as sax from "sax"
import { Directive } from "./directives"
import { ParseContext, CodeBlockState } from "./ParseContext"
import { DirectiveRegistryFactory } from "./DirectiveRegistryFactory"
import { FallbackParser } from "./FallbackParser"
import { XmlUtils } from "./XmlUtils"

export class DirectiveStreamingParser {
	private static registry = DirectiveRegistryFactory.create()

	static parse(assistantMessage: string): Directive[] {
		const context: ParseContext = {
			currentText: "",
			contentBlocks: [],
			hasXmlTags: false,
			hasIncompleteXml: XmlUtils.hasIncompleteXml(assistantMessage),
			codeBlockState: CodeBlockState.OUTSIDE,
			pendingBackticks: "",
			codeBlockContent: "",
			codeBlockStartIndex: -1,
		}

		const parser = sax.parser(false, { lowercase: true })
		let parseError = false
		let tagStack: string[] = []
		let activeHandler: any = null

		parser.onopentag = (node: sax.Tag) => {
			// Check if we're inside a code block (either global or within tool parameters)
			const insideCodeBlock =
				context.codeBlockState === CodeBlockState.INSIDE ||
				(activeHandler &&
					"isInsideParameterCodeBlock" in activeHandler &&
					(activeHandler as any).isInsideParameterCodeBlock())

			// Only process XML tags if NOT inside code block
			if (!insideCodeBlock) {
				context.hasXmlTags = true
				tagStack.push(node.name)
				const handler = this.registry.getHandler(node.name)

				if (handler) {
					activeHandler = handler
					this.registry.getTextHandler().setState("none")
				}
				if (activeHandler) {
					activeHandler.onOpenTag(node, context)
				}
			} else {
				// Inside code block - treat as plain text
				const tagText = `<${node.name}${this.attributesToString(node.attributes)}>`
				if (activeHandler) {
					activeHandler.onText(tagText, context)
				} else {
					this.registry.getTextHandler().onText(tagText, context)
				}
			}
		}

		parser.onclosetag = (tagName: string) => {
			// Check if we're inside a code block (either global or within tool parameters)
			const insideCodeBlock =
				context.codeBlockState === CodeBlockState.INSIDE ||
				(activeHandler &&
					"isInsideParameterCodeBlock" in activeHandler &&
					(activeHandler as any).isInsideParameterCodeBlock())

			if (!insideCodeBlock) {
				// Normal XML processing
				if (activeHandler) {
					activeHandler.onCloseTag(tagName, context)
					if (tagName === activeHandler.tagName) {
						activeHandler = null
						this.registry.getTextHandler().setState("text")
					}
				}
				tagStack.pop()
			} else {
				// Inside code block - treat as plain text
				if (activeHandler) {
					activeHandler.onText(`</${tagName}>`, context)
				} else {
					this.registry.getTextHandler().onText(`</${tagName}>`, context)
				}
			}
		}

		parser.ontext = (text: string) => {
			if (activeHandler) {
				activeHandler.onText(text, context)
			} else {
				this.registry.getTextHandler().onText(text, context)
			}
		}

		parser.onend = () => {
			for (const handler of this.registry.getAllHandlers()) {
				handler.onEnd(context)
			}
		}

		parser.onerror = (error: Error) => {
			parseError = true
		}

		try {
			const wrappedMessage = `<root>${assistantMessage}</root>`
			parser.write(wrappedMessage).close()
		} catch (e) {
			parseError = true
		}

		if (parseError || (!context.hasXmlTags && context.contentBlocks.length === 0 && assistantMessage.trim())) {
			return FallbackParser.parse(assistantMessage)
		}

		return context.contentBlocks
	}

	/**
	 * Convert SAX node attributes to string representation
	 */
	private static attributesToString(attributes: { [key: string]: string }): string {
		if (!attributes || Object.keys(attributes).length === 0) {
			return ""
		}
		return Object.entries(attributes)
			.map(([key, value]) => ` ${key}="${value}"`)
			.join("")
	}
}
