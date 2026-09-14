import { TONE_HEX } from '@/core/sheet';

// Cinco pasos de la escala de grises de la ficha (tinta → papel), con un gris medio entre los tonos definidos.
const STEPS = [TONE_HEX.ink, TONE_HEX.muted, '#808080', TONE_HEX.faint, TONE_HEX.paper] as const;

export function ToneWedge({ label }: { label: string }) {
  return (
    <figure className="flex items-center gap-2">
      <div aria-hidden="true" className="flex border border-line">
        {STEPS.map((tone) => (
          <span key={tone} className="block h-3 w-4" style={{ backgroundColor: tone }} />
        ))}
      </div>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}
