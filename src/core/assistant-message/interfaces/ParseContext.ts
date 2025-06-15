import { Directive } from "../parsers"

export interface ParseContext {
	currentText: string
	contentBlocks: Directive[]
	hasXmlTags: boolean
	hasIncompleteXml: boolean
}
