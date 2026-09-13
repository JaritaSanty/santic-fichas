import { PAPER, type PaperSize } from '@/core/paper';
import { withBasePath } from '@/core/paths';
import { TONE_HEX, type Primitive, type SheetPage } from '@/core/sheet';

export const BRAND_MARK_SRC = '/brand/mark-gray.svg';

// Sin kerning ni ligaduras: la maquetación mide con la suma de avances, igual que el PDF.
const FONT_STYLE = { fontFamily: 'var(--font-sheet)', fontKerning: 'none', fontVariantLigatures: 'none' } as const;

function PrimitiveNode({ p }: { p: Primitive }) {
  switch (p.t) {
    case 'text':
      return (
        <text x={p.x} y={p.y} fontSize={p.size} fontWeight={p.font === 'sheetBold' ? 700 : 400} textAnchor={p.align} fill={TONE_HEX[p.tone]} style={FONT_STYLE}>
          {p.text}
        </text>
      );
    case 'rect':
      return (
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.radius} fill={p.fill ? TONE_HEX[p.fill] : 'none'} stroke={p.stroke ? TONE_HEX[p.stroke] : 'none'} strokeWidth={p.strokeWidth} />
      );
    case 'line':
      return <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={TONE_HEX[p.stroke]} strokeWidth={p.strokeWidth} strokeDasharray={p.dash?.join(' ')} />;
    case 'capsule':
      return (
        <rect
          x={p.cx - p.length / 2}
          y={p.cy - p.width / 2}
          width={p.length}
          height={p.width}
          rx={p.width / 2}
          transform={`rotate(${p.angleDeg} ${p.cx} ${p.cy})`}
          fill="none"
          stroke={TONE_HEX[p.stroke]}
          strokeWidth={p.strokeWidth}
        />
      );
    case 'image':
      return <image href={withBasePath(BRAND_MARK_SRC)} x={p.x} y={p.y} width={p.w} height={p.h} preserveAspectRatio="xMidYMid meet" />;
  }
}

export function SheetSvg({ paper, page, sizing, label, className }: {
  paper: PaperSize;
  page: SheetPage;
  sizing: 'fluid' | 'physical';
  label: string;
  className?: string;
}) {
  const { widthMm, heightMm } = PAPER[paper];
  const physical = sizing === 'physical';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${widthMm} ${heightMm}`}
      width={physical ? `${widthMm}mm` : '100%'}
      height={physical ? `${heightMm}mm` : undefined}
      role="img"
      aria-label={label}
      className={className}
    >
      <rect x={0} y={0} width={widthMm} height={heightMm} fill={TONE_HEX.paper} />
      {page.primitives.map((p, i) => (
        <PrimitiveNode key={i} p={p} />
      ))}
    </svg>
  );
}
