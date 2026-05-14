export const DESTINATION_TASKLANE = 'tasklane'
export const DESTINATION_THINGS3 = 'things3'

/**
 * Segmented control for import destination (Tasklane vs Things 3).
 * @param {{ value: 'tasklane' | 'things3', onChange: (next: 'tasklane' | 'things3') => void }} props
 */
export default function DestinationToggle({ value, onChange }) {
  return (
    <div
      className="destination-toggle"
      role="group"
      aria-label="Import destination"
    >
      <button
        type="button"
        className="destination-toggle__segment"
        aria-pressed={value === DESTINATION_TASKLANE}
        onClick={() => onChange(DESTINATION_TASKLANE)}
      >
        Tasklane
      </button>
      <button
        type="button"
        className="destination-toggle__segment"
        aria-pressed={value === DESTINATION_THINGS3}
        onClick={() => onChange(DESTINATION_THINGS3)}
      >
        Things 3
      </button>
    </div>
  )
}
