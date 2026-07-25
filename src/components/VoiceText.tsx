import type { UiTerm } from "../ui/lexicon"

interface VoiceTextProps {
  term: UiTerm
  showGloss?: boolean
}

export function VoiceText({
  term,
  showGloss = true,
}: VoiceTextProps) {
  return (
    <div className="voice-text">
      <div className="voice-text-greek">
        {term.greek}
      </div>

      {showGloss && (
        <div className="voice-text-gloss">
          {term.english}
        </div>
      )}
    </div>
  )
}