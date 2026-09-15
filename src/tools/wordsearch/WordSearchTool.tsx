'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Lang } from '@/core/lang';
import { unsupportedSheetChars } from '@/core/measure';
import { defaultPaperFor, type PaperSize } from '@/core/paper';
import { newSeedCode } from '@/core/random';
import type { SheetDocument } from '@/core/sheet';
import { readSeedInput, suggestAdjustments, validateWordSearch, WORDSEARCH_ALGORITHM_VERSION, WORDSEARCH_LIMITS, type DirectionOptions } from '@/generators/wordsearch';
import type { Dictionary } from '@/i18n/dictionary';
import { formatMessage, formatPlural } from '@/i18n/format';
import { buildFrame, fitHeader, type SheetHeader } from '@/layout/common/frame';
import { layoutWordSearch } from '@/layout/wordsearch';
import { IncludeSolutionsField } from '@/tools/shared/IncludeSolutionsField';
import { PaperSelect } from '@/tools/shared/PaperSelect';
import { PrintButton } from '@/tools/shared/PrintButton';
import { PrintRoot } from '@/tools/shared/PrintRoot';
import { SeedField } from '@/tools/shared/SeedField';
import { SheetHeaderFields } from '@/tools/shared/SheetHeaderFields';
import { worksheetFilename } from '@/core/filename';
import { Docket } from '@/tools/shared/Docket';
import { DownloadPdfButton } from '@/tools/shared/DownloadPdfButton';
import { JobLine } from '@/tools/shared/JobLine';
import { ProofSheet } from '@/tools/shared/ProofSheet';
import { ToneWedge } from '@/tools/shared/ToneWedge';
import { GridOptions } from './GridOptions';
import { describeError, describeRejected, describeSeed, describeSuggestion, describeWarning } from './messages';
import { UnplacedPanel } from './UnplacedPanel';
import { generationKey, removeWordLines } from './request';
import { createGenerationClient, type WorkerLike } from './wordSearchClient';
import { WordListField } from './WordListField';

export interface WordSearchLabels {
  sheet: Dictionary['sheet'];
  tool: Dictionary['tool'];
  wordsearch: Dictionary['wordsearch'];
  proof: Dictionary['proof'];
}

const noopSubscribe = () => () => {};
const browserPaper = () => defaultPaperFor(navigator.languages ?? [navigator.language]);
const serverPaper = (): PaperSize => 'a4';
// Semilla inicial creada una sola vez en el cliente; el HTML estático no lleva semilla (sin desajuste de hidratación).
let initialSeed: string | null = null;
const browserSeed = () => (initialSeed ??= newSeedCode(WORDSEARCH_ALGORITHM_VERSION));
const serverSeed = () => '';
const createWorker = (): WorkerLike => new Worker(new URL('../../workers/wordsearch.worker.ts', import.meta.url)) as unknown as WorkerLike;

const DEFAULT_SIZE = 12;
const DEFAULT_DIRECTIONS: DirectionOptions = { horizontal: true, vertical: true, diagonal: true, reversed: false };
const DEBOUNCE_MS = 250;

export function WordSearchTool({ lang, labels }: { lang: Lang; labels: WordSearchLabels }) {
  const t = labels.wordsearch;
  const [header, setHeader] = useState<SheetHeader>({ title: labels.sheet.defaultTitle, school: '' });
  const detectedPaper = useSyncExternalStore(noopSubscribe, browserPaper, serverPaper);
  const [chosenPaper, setPaper] = useState<PaperSize | null>(null);
  const paper = chosenPaper ?? detectedPaper;
  const [wordsText, setWordsText] = useState(t.sampleWords);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [directions, setDirections] = useState<DirectionOptions>(DEFAULT_DIRECTIONS);
  const [includeSolutions, setIncludeSolutions] = useState(true);
  const [seedInput, setSeedInput] = useState('');
  const [regeneratedSeed, setRegeneratedSeed] = useState<string | null>(null);
  const initialSeedCode = useSyncExternalStore(noopSubscribe, browserSeed, serverSeed);

  const [client] = useState(() => createGenerationClient(createWorker));
  const generation = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  useEffect(() => () => client.dispose(), [client]);

  const validation = useMemo(() => validateWordSearch({ wordsText, size, directions }, lang), [wordsText, size, directions, lang]);
  const seedRead = readSeedInput(seedInput);
  const seedError = describeSeed(seedRead, t);
  const seedInvalid = seedError !== null;
  const seedCode = (seedRead.status === 'ok' ? seedRead.code : null) ?? regeneratedSeed ?? initialSeedCode;
  const requestKey =
    validation.ok && seedCode !== '' && !seedInvalid
      ? generationKey(validation.value.entries, size, directions, seedCode, lang)
      : null;

  useEffect(() => {
    if (!requestKey || !validation.ok) return;
    const value = validation.value;
    const timer = setTimeout(() => client.request(requestKey, { value, seedCode, lang }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, requestKey, validation, seedCode, lang]);

  const current = requestKey !== null && generation.key === requestKey;
  // Mientras corre el debounce o el Worker, la vista previa conserva la ficha anterior: no se imprime ni se descarga.
  const pending = requestKey !== null && !(current && (generation.status === 'done' || generation.status === 'failed'));
  const result = requestKey && generation.response?.ok ? generation.response.result : null;
  // Solo se imprime o descarga una ficha generada para la clave actual: nunca la anterior ni el marco vacío
  // (código mal escrito o de otra versión, lista no válida, fallo del Worker).
  const ready = current && generation.status === 'done' && result !== null;
  // Con un código erróneo la ficha no corresponde a ningún código: no se muestra el anterior.
  const shownSeed = seedInvalid || seedCode === '' ? '—' : seedCode;
  const frameLabels = useMemo(() => ({ name: labels.sheet.name, date: labels.sheet.date, solutions: labels.sheet.solutions }), [labels.sheet]);
  const layout = useMemo(
    () => (result ? layoutWordSearch({ result, header, labels: frameLabels, paper, lang, includeSolutions }) : null),
    [result, header, frameLabels, paper, lang, includeSolutions],
  );
  const doc = useMemo<SheetDocument>(() => {
    if (layout?.ok) return layout.doc;
    return { paper, lang, pages: [{ role: 'student', primitives: buildFrame({ paper, header, labels: frameLabels, role: 'student' }).primitives }] };
  }, [layout, paper, lang, header, frameLabels]);

  const quote = (chars: string[]) => chars.map((c) => formatMessage(t.quote, { text: c })).join(' ');
  const headerChars = unsupportedSheetChars(`${header.title}${header.school}`.replace(/\s+/g, ' '));
  const headerFit = fitHeader({ paper, header, labels: frameLabels, role: includeSolutions ? 'solution' : 'student' });
  const headerNotices = [
    ...(headerChars.length > 0 ? [formatMessage(labels.tool.headerUnsupportedChars, { chars: quote(headerChars) })] : []),
    ...(headerFit.title.truncated ? [labels.tool.headerTitleShortened] : []),
  ];

  const lineMessages = [...validation.rejected.map((r) => describeRejected(r, t)), ...validation.warnings.map((w) => describeWarning(w, t))];
  const wordCount = validation.wordCount;
  const failed = current && generation.status === 'failed';
  const blocking = [
    ...(validation.ok ? [] : validation.errors.map((e) => describeError(e, t))),
    ...(layout && !layout.ok ? [formatMessage(t.errors.cellsTooSmall, { size: layout.error.maxSize })] : []),
    ...(failed ? [t.errors.workerFailed] : []),
  ];

  const unplaced = current && generation.status === 'done' && result ? result.unplaced : [];
  const suggestions = unplaced.length > 0 && validation.ok ? suggestAdjustments(validation.value, unplaced).map((s) => describeSuggestion(s, t)) : [];
  const removeUnplaced = () => setWordsText(removeWordLines(wordsText, unplaced.map((e) => e.normalized), lang));
  const retry = () => {
    if (requestKey && validation.ok) client.request(requestKey, { value: validation.value, seedCode, lang });
  };

  const filename = worksheetFilename(header.title, lang === 'es' ? 'ficha' : 'worksheet');
  const proof = labels.proof;

  return (
    <div data-generation={current ? generation.status : 'pending'} className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form className="md:self-start" onSubmit={(e) => e.preventDefault()}>
        <Docket
          summary={labels.tool.optionsSummary}
          detail={formatPlural(labels.tool.optionsDetail, wordCount, { size, seed: shownSeed })}
        >
          <SheetHeaderFields
            value={header}
            onChange={setHeader}
            notices={headerNotices}
            labels={{ legend: labels.tool.headerLegend, title: labels.tool.titleLabel, school: labels.tool.schoolLabel }}
          />
          <WordListField
            value={wordsText}
            onChange={setWordsText}
            messages={lineMessages}
            countLabel={formatMessage(t.wordsCount, { count: wordCount, max: WORDSEARCH_LIMITS.maxWords })}
            labels={{ label: t.wordsLabel, help: formatMessage(t.wordsHelp, { max: WORDSEARCH_LIMITS.maxWords }) }}
          />
          <GridOptions
            size={size}
            onSizeChange={setSize}
            directions={directions}
            onDirectionsChange={setDirections}
            labels={{ legend: t.gridLegend, size: t.sizeLabel, directions: t.directionsLegend, horizontal: t.horizontal, vertical: t.vertical, diagonal: t.diagonal, reversed: t.reversed }}
          />
          <PaperSelect value={paper} onChange={setPaper} labels={{ paper: labels.tool.paperLabel, a4: labels.tool.paperA4, letter: labels.tool.paperLetter }} />
          <SeedField
            value={seedInput}
            onChange={setSeedInput}
            error={seedError}
            onNewSeed={() => {
              setSeedInput('');
              setRegeneratedSeed(newSeedCode(WORDSEARCH_ALGORITHM_VERSION));
            }}
            placeholder={seedCode || '—'}
            labels={{ label: t.seedLabel, help: t.seedHelp, newSeed: t.newSheet }}
          />
          <IncludeSolutionsField checked={includeSolutions} onChange={setIncludeSolutions} label={t.includeSolutions} />
        </Docket>
      </form>

      <div className="grid content-start gap-4">
        <h2 className="text-lg font-semibold text-ink">{labels.tool.preview}</h2>
        <JobLine
          actions={
            <>
              <PrintButton label={labels.tool.print} disabled={!ready || !layout?.ok} />
              <DownloadPdfButton
                doc={doc}
                filename={filename}
                disabled={!ready || !layout?.ok}
                labels={{ download: proof.downloadPdf, preparing: proof.preparingPdf, offline: proof.pdfOffline, failed: proof.pdfFailed }}
              />
              {/* Ancho reservado con una copia invisible: la línea de trabajo no cambia de medida al anunciar el estado. */}
              <span className="inline-grid text-sm text-muted">
                <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                  {t.generating}
                </span>
                <span role="status" aria-live="polite" className="col-start-1 row-start-1">
                  {pending ? t.generating : ''}
                </span>
              </span>
            </>
          }
          items={[
            { label: proof.jobPaper, value: paper === 'a4' ? labels.tool.paperA4 : labels.tool.paperLetter },
            { label: proof.jobPages, value: String(doc.pages.length) },
            { label: proof.jobSeed, value: shownSeed },
          ]}
        />
        <ToneWedge label={proof.toneLegend} />

        {blocking.length > 0 && (
          <div role="alert" className="grid gap-2 border border-line bg-surface p-4 text-sm text-ink">
            <ul className="grid gap-1">
              {blocking.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            {failed && (
              <button type="button" data-action="generate" onClick={retry} className="justify-self-start border border-line px-3 py-1 font-semibold text-ink">
                {t.retry}
              </button>
            )}
          </div>
        )}

        {unplaced.length > 0 && (
          <UnplacedPanel
            words={unplaced.map((e) => e.original)}
            suggestions={suggestions}
            onRemove={removeUnplaced}
            labels={{ title: t.unplaced.title, intro: formatPlural(t.unplaced.intro, unplaced.length), action: t.unplaced.generateWithout }}
          />
        )}

        <ProofSheet
          doc={doc}
          docKey={JSON.stringify([requestKey ?? 'frame', header.title, header.school, paper, includeSolutions])}
          label={labels.sheet.previewLabel}
          labels={{ zoomLegend: proof.zoomLegend, zoomFit: proof.zoomFit, zoomActual: proof.zoomActual, enlarge: proof.enlarge, close: proof.close }}
        />
      </div>

      <PrintRoot doc={doc} label={labels.sheet.previewLabel} />
    </div>
  );
}
