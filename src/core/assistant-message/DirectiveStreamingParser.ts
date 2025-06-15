import * as sax from "sax"
import { Directive } from "./parsers"
import { ParseContext } from "./interfaces/ParseContext"
import { DirectiveRegistryFactory } from "./DirectiveRegistryFactory"
import { FallbackParser } from "./parsers/FallbackParser"
import { XmlUtils } from "./XmlUtils"

export class DirectiveStreamingParser {
	private static registry = DirectiveRegistryFactory.create()

	static parse(assistantMessage: string): Directive[] {
		const context: ParseContext = {
			currentText: "",
			contentBlocks: [],
			hasXmlTags: false,
			hasIncompleteXml: XmlUtils.hasIncompleteXml(assistantMessage),
		}

		const parser = sax.parser(false, { lowercase: true })
		let parseError = false
		let tagStack: string[] = []
		let activeHandler: any = null

		parser.onopentag = (node: sax.Tag) => {
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
		}

		parser.onclosetag = (tagName: string) => {
			if (activeHandler) {
				activeHandler.onCloseTag(tagName, context)
				if (tagName === activeHandler.tagName) {
					activeHandler = null
					this.registry.getTextHandler().setState("text")
				}
			}
			tagStack.pop()
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
}
