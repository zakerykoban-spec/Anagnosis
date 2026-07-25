interface UILabelProps {
    label: UiLabel
    showGloss?: boolean
}

export function UILabel({
    label,
    showGloss = true,
}: UILabelProps) {
    return (
        <div className="ui-label">
            <div className="ui-label-greek">
                {label.greek}
            </div>

            {showGloss && (
                <div className="ui-label-english">
                    {label.english}
                </div>
            )}
        </div>
    )
}