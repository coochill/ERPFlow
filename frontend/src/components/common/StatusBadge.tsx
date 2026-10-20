type StatusBadgeProps = {
  label: string
  tone: string
}

function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`stock-badge ${tone}`}>
      <span /> {label}
    </span>
  )
}

export default StatusBadge
