import React, { useState, useRef, useEffect } from "react"
import { Button } from "@src/components/ui"
import { cn } from "@src/lib/utils"

interface EmojiReactionsProps {
	messageTs: number
	reactions?: Record<string, number>
	onAddReaction: (emoji: string) => void
	onRemoveReaction: (emoji: string) => void
	className?: string
}

const COMMON_EMOJIS = [
	"👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉", 
	"🚀", "👀", "💯", "🔥", "⭐", "✅", "❌", "🤔"
]

export const EmojiReactions = ({
	messageTs,
	reactions = {},
	onAddReaction,
	onRemoveReaction,
	className,
}) => {
	const [showPicker, setShowPicker] = useState(false)
	const pickerRef = useRef<HTMLDivElement>(null)

	// Close picker when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
				setShowPicker(false)
			}
		}

		if (showPicker) {
			document.addEventListener("mousedown", handleClickOutside)
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [showPicker])

	const handleEmojiClick = (emoji: string) => {
		if (reactions && reactions[emoji] && reactions[emoji] > 0) {
			onRemoveReaction(emoji)
		} else {
			onAddReaction(emoji)
		}
		setShowPicker(false)
	}

	const hasReactions = Object.keys(reactions).some(emoji => reactions[emoji] > 0)

	return (
		<div className={cn("relative flex items-center gap-1 mt-2", className)}>
			{/* Existing reactions */}
			{reactions && Object.entries(reactions)
				.filter(([_, count]) => (count as number) > 0)
				.map(([emoji, count]) => (
					<Button
						key={emoji}
						variant="outline"
						size="sm"
						className="h-6 px-2 py-0 text-xs bg-vscode-button-secondaryBackground hover:bg-vscode-button-secondaryHoverBackground border-vscode-button-border"
						onClick={() => handleEmojiClick(emoji)}
					>
						<span className="mr-1">{emoji}</span>
						<span>{count as number}</span>
					</Button>
				))}

			{/* Add reaction button */}
			<div className="relative" ref={pickerRef}>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 w-6 p-0 text-xs hover:bg-vscode-button-secondaryHoverBackground"
					onClick={() => setShowPicker(!showPicker)}
					title="Add reaction"
				>
					<span className="text-sm">😊</span>
				</Button>

				{/* Emoji picker */}
				{showPicker && (
					<div className="absolute top-full left-0 mt-1 p-2 bg-vscode-dropdown-background border border-vscode-dropdown-border rounded shadow-lg z-50 grid grid-cols-8 gap-1 max-w-64">
						{COMMON_EMOJIS.map((emoji) => (
							<Button
								key={emoji}
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 hover:bg-vscode-list-hoverBackground"
								onClick={() => handleEmojiClick(emoji)}
							>
								{emoji}
							</Button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

export default EmojiReactions