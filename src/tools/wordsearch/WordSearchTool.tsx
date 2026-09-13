'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { Lang } from '@/core/lang';
import { defaultPaperFor, type PaperSize } from '@/core/paper';
import type { SheetDocument } from '@/core/sheet';
import type { Dictionary } from '@/i18n/dictionary';
import { buildFrame, type SheetHeader } from '@/layout/common/frame';
import { PaperSelect } from '@/tools/shared/PaperSelect';
import { PrintButton } from '@/tools/shared/PrintButton';
import { PrintRoot } from '@/tools/shared/PrintRoot';
import { SheetHeaderFields } from '@/tools/shared/SheetHeaderFields';
import { SheetPreview } from '@/tools/shared/SheetPreview';

const noopSubscribe = () => () => {};
const browserPaper = () => defaultPaperFor(navigator.languages ?? [navigator.language]);
const serverPaper = (): PaperSize => 'a4';

export function WordSearchTool({ lang, labels }: { lang: Lang; labels: { sheet: Dictionary['sheet']; tool: Dictionary['tool'] } }) {
  const [header, setHeader] = useState<SheetHeader>({ title: labels.sheet.defaultTitle, school: '' });
  // Papel detectado del navegador (A4 en el HTML estático) salvo que el docente elija otro.
  const detectedPaper = useSyncExternalStore(noopSubscribe, browserPaper, serverPaper);
  const [chosenPaper, setPaper] = useState<PaperSize | null>(null);
  const paper = chosenPaper ?? detectedPaper;

  const doc = useMemo<SheetDocument>(() => {
    const frame = buildFrame({ paper, header, role: 'student', labels: { name: labels.sheet.name, date: labels.sheet.date, solutions: labels.sheet.solutions } });
    return { paper, lang, pages: [{ role: 'student', primitives: frame.primitives }] };
  }, [paper, header, lang, labels.sheet]);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form className="grid content-start gap-5 self-start border border-line bg-surface p-5" onSubmit={(e) => e.preventDefault()}>
        <SheetHeaderFields value={header} onChange={setHeader} labels={{ legend: labels.tool.headerLegend, title: labels.tool.titleLabel, school: labels.tool.schoolLabel }} />
        <PaperSelect value={paper} onChange={setPaper} labels={{ paper: labels.tool.paperLabel, a4: labels.tool.paperA4, letter: labels.tool.paperLetter }} />
      </form>
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-ink">{labels.tool.preview}</h2>
          <PrintButton label={labels.tool.print} />
        </div>
        <SheetPreview doc={doc} label={labels.sheet.previewLabel} />
      </div>
      <PrintRoot doc={doc} label={labels.sheet.previewLabel} />
    </div>
  );
}
