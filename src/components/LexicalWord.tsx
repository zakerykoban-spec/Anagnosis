import type { KeyboardEvent, MouseEvent } from 'react'
import type { LexicalWordInfo } from '../models/lexical'

interface LexicalWordProps {
  info: LexicalWordInfo
  expanded: boolean
  onOpen: (info: LexicalWordInfo, anchor: HTMLButtonElement) => void
}
export function LexicalWord({ info, expanded, onOpen }: LexicalWordProps) {
  function hasTextSelection() {
    const selection = window.getSelection()
    return Boolean(selection && !selection.isCollapsed && selection.toString().trim())
  }

  function open(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (hasTextSelection()) return
    onOpen(info, event.currentTarget)
  }

  function stopKeyboardPropagation(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
  }

  return <button
    className={`lexical-word${info.uncommon ? ' is-uncommon' : ''}`}
    type="button"
    aria-label={`${info.surface} · ${info.lemma}`}
    aria-haspopup="dialog"
    aria-expanded={expanded}
    onClick={open}
    onKeyDown={stopKeyboardPropagation}
  >{info.surface}</button>
}
