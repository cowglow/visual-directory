// TASK.md section 4: "the fixed center marker and participant pins are SVG.
// Build them with DOM APIs (createElementNS, textContent), never
// string-concatenated markup." As JSX, React itself builds this via
// `document.createElementNS`/text nodes under the hood (that's what
// `react-dom` does for any element, SVG included) - the same guarantee the
// task is asking for, just expressed as components instead of imperative
// calls, since the rest of this app's markers (Map.Marker.tsx) are also
// React components rather than hand-built DOM. Never pass label/note through
// here as anything but a plain string child - see LocationPopup.tsx for
// where that matters.
interface SpacePinIconProps {
  variant: "center" | "own" | "participant";
  size?: number;
  title?: string;
  /** Overrides the variant's default fill - used by the placement marker to
   * turn red/green with inside/outside-boundary status. */
  color?: string;
}

const FILL: Record<SpacePinIconProps["variant"], string> = {
  center: "#e5484d",
  own: "#2e9e4f",
  participant: "#f2994a",
};

export default function SpacePinIcon({ variant, size = 32, title, color }: SpacePinIconProps) {
  const fill = color ?? FILL[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 24 32" role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
        fill={fill}
        stroke="#1a1a1a"
        strokeWidth={1}
      />
      <circle cx={12} cy={12} r={5} fill="#fff" />
    </svg>
  );
}
