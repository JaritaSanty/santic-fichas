import type { SheetDocument } from '@/core/sheet';
import { SheetSvg } from '@/render/svg/SheetSvg';

export function SheetPreview({ doc, label }: { doc: SheetDocument; label: string }) {
  return (
    <div className="grid gap-4">
      {doc.pages.map((page, i) => (
        <div key={i} className="overflow-hidden border border-line bg-white">
          <SheetSvg paper={doc.paper} page={page} sizing="fluid" label={`${label} ${i + 1}/${doc.pages.length}`} />
        </div>
      ))}
    </div>
  );
}
