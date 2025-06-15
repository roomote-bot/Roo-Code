import { Directive } from "./directives"

export interface ParseContext {
	currentText: string
	contentBlocks: Directive[]
	hasXmlTags: boolean
	hasIncompleteXml: boolean
}
