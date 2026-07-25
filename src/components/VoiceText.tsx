import type { UiTerm } from '../ui/lexicon'
import './VoiceText.css'

interface VoiceTextProps {
  term: UiTerm
  showGloss?: boolean
}

export function VoiceText({
  term,
  showGloss = true,
}: VoiceTextProps) {
  return (
    <span className="voice-text">
      <span className="voice-text-greek">{term.greek}</span>

      {showGloss && (
        <span className="voice-text-gloss">{term.english}</span>
      )}
    </span>
  )
}
