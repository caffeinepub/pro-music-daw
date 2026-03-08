import { useCallback, useEffect, useRef, useState } from "react";

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  size?: number;
  color?: string;
  label?: string;
  unit?: string;
  defaultValue?: number;
}

export function Knob({
  value,
  min,
  max,
  onChange,
  size = 36,
  color = "#00b4d8",
  label,
  unit,
  defaultValue,
}: KnobProps) {
  const knobRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const lastY = useRef(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Map value to angle (-135 to +135 degrees)
  const minAngle = -135;
  const maxAngle = 135;
  const normalized = (value - min) / (max - min);
  const angle = minAngle + normalized * (maxAngle - minAngle);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const indicatorLength = r - 3;

  const rad = (angle * Math.PI) / 180;
  const ix = cx + Math.sin(rad) * indicatorLength;
  const iy = cy - Math.cos(rad) * indicatorLength;

  // Arc path for value indicator
  const arcStartAngle = minAngle;
  const arcEndAngle = angle;
  const arcR = r - 1;

  const polarToXY = (angleDeg: number, radius: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return {
      x: cx + Math.sin(a) * radius,
      y: cy - Math.cos(a) * radius,
    };
  };

  const arcStart = polarToXY(arcStartAngle, arcR);
  const arcEnd = polarToXY(arcEndAngle, arcR);
  const largeArc = arcEndAngle - arcStartAngle > 180 ? 1 : 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastY.current = e.clientY;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = lastY.current - e.clientY;
      lastY.current = e.clientY;
      const range = max - min;
      const sensitivity = e.shiftKey ? 0.001 : 0.005;
      const newValue = Math.max(
        min,
        Math.min(max, value + delta * range * sensitivity),
      );
      onChange(newValue);
    },
    [value, min, max, onChange],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) onChange(defaultValue);
  }, [defaultValue, onChange]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const displayValue =
    typeof value === "number"
      ? Number.isInteger(value)
        ? value
        : value.toFixed(2)
      : value;

  return (
    <div
      className="flex flex-col items-center gap-0.5 select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative">
        {showTooltip && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 text-[9px] font-mono bg-black/90 text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none border border-white/10">
            {displayValue}
            {unit}
          </div>
        )}
        <svg
          ref={knobRef}
          width={size}
          height={size}
          role="img"
          aria-label={label ?? "Knob"}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: "ns-resize", display: "block" }}
        >
          {/* Track arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          {/* Value arc */}
          {Math.abs(arcEndAngle - arcStartAngle) > 2 && (
            <path
              d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {/* Body */}
          <circle
            cx={cx}
            cy={cy}
            r={r - 3}
            fill="oklch(0.22 0 0)"
            stroke="oklch(0.30 0 0)"
            strokeWidth="1"
          />
          {/* Indicator */}
          <line
            x1={cx}
            y1={cy}
            x2={ix}
            y2={iy}
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx={cx} cy={cy} r="2" fill={color} opacity="0.5" />
        </svg>
      </div>
      {label && (
        <span className="text-[9px] text-daw-text-dim text-center leading-none">
          {label}
        </span>
      )}
    </div>
  );
}
