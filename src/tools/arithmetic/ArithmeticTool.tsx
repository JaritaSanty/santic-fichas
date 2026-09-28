'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { worksheetFilename } from '@/core/filename';
import type { Lang } from '@/core/lang';
import { unsupportedSheetChars } from '@/core/measure';
import { defaultPaperFor, type PaperSize } from '@/core/paper';
import { newSeedCode } from '@/core/random';
import type { SheetDocument } from '@/core/sheet';
import {
  ARITHMETIC_ALGORITHM_VERSION,
  ARITHMETIC_LIMITS,
  readSeedInput,
  suggestArithmetic,
  validateArithmetic,
  type ArithmeticError,
  type ArithmeticInput,
  type CarryMode,
  type DivisionMode,
  type OperationKind,
  type SheetLayout,
} from '@/generators/arithmetic';
import type { Dictionary } from '@/i18n/dictionary';
import { formatMessage, formatPlural } from '@/i18n/format';
import { layoutArithmetic } from '@/layout/arithmetic';
import { buildFrame, fitHeader, type SheetHeader } from '@/layout/common/frame';
import { Docket } from '@/tools/shared/Docket';
import { DownloadPdfButton } from '@/tools/shared/DownloadPdfButton';
import { IncludeSolutionsField } from '@/tools/shared/IncludeSolutionsField';
import { JobLine } from '@/tools/shared/JobLine';
import { PaperSelect } from '@/tools/shared/PaperSelect';
import { PrintButton } from '@/tools/shared/PrintButton';
import { PrintRoot } from '@/tools/shared/PrintRoot';
import { ProofSheet } from '@/tools/shared/ProofSheet';
import { SeedField } from '@/tools/shared/SeedField';
import { SheetHeaderFields } from '@/tools/shared/SheetHeaderFields';
import { ToneWedge } from '@/tools/shared/ToneWedge';
import { createArithmeticClient, type ArithmeticWorkerLike } from './arithmeticClient';
import { KindsField } from './KindsField';
import { describeError, describeKindMissing, describeSeed, describeSuggestion, describeSuggestionsLead, describeWarning } from './messages';
import { OptionsFields } from './OptionsFields';
import { RangeFields, type RangeText } from './RangeFields';
import { generationKey, readNumberField } from './request';
import { ShortfallPanel } from './ShortfallPanel';

export interface ArithmeticLabels {
  sheet: Dictionary['sheet'];
  tool: Dictionary['tool'];
  arithmetic: Dictionary['arithmetic'];
  proof: Dictionary['proof'];
}

const noopSubscribe = () => () => {};
const browserPaper = () => defaultPaperFor(navigator.languages ?? [navigator.language]);
const serverPaper = (): PaperSize => 'a4';
// Semilla inicial creada una sola vez en el cliente; el HTML estático no lleva semilla (sin desajuste de hidratación).
let initialSeed: string | null = null;
const browserSeed = () => (initialSeed ??= newSeedCode(ARITHMETIC_ALGORITHM_VERSION));
const serverSeed = () => '';
const createWorker = (): ArithmeticWorkerLike =>
  new Worker(new URL('../../workers/arithmetic.worker.ts', import.meta.url)) as unknown as ArithmeticWorkerLike;

const DEFAULT_KINDS: Record<OperationKind, boolean> = { add: true, sub: true, mul: false, div: false };
const DEFAULT_FIRST: RangeText = { min: '10', max: '99' };
const DEFAULT_SECOND: RangeText = { min: '10', max: '99' };
const DEFAULT_COUNT = '20';
const DEFAULT_COLUMNS = 4;
const DEBOUNCE_MS = 250;

export function ArithmeticTool({ lang, labels }: { lang: Lang; labels: ArithmeticLabels }) {
  const t = labels.arithmetic;
  const [header, setHeader] = useState<SheetHeader>({ title: t.defaultTitle, school: '' });
  const detectedPaper = useSyncExternalStore(noopSubscribe, browserPaper, serverPaper);
  const [chosenPaper, setPaper] = useState<PaperSize | null>(null);
  const paper = chosenPaper ?? detectedPaper;
  const [kinds, setKinds] = useState<Record<OperationKind, boolean>>(DEFAULT_KINDS);
  const [first, setFirst] = useState<RangeText>(DEFAULT_FIRST);
  const [second, setSecond] = useState<RangeText>(DEFAULT_SECOND);
  const [carry, setCarry] = useState<CarryMode>('any');
  const [division, setDivision] = useState<DivisionMode>('exact');
  const [countText, setCountText] = useState(DEFAULT_COUNT);
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>('columns');
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [includeSolutions, setIncludeSolutions] = useState(true);
  const [seedInput, setSeedInput] = useState('');
  const [regeneratedSeed, setRegeneratedSeed] = useState<string | null>(null);
  const initialSeedCode = useSyncExternalStore(noopSubscribe, browserSeed, serverSeed);

  const [client] = useState(() => createArithmeticClient(createWorker));
  const generation = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  useEffect(() => () => client.dispose(), [client]);

  const input = useMemo<ArithmeticInput>(
    () => ({
      kinds,
      first: { min: readNumberField(first.min), max: readNumberField(first.max) },
      second: { min: readNumberField(second.min), max: readNumberField(second.max) },
      carry,
      division,
      count: readNumberField(countText),
      layout: sheetLayout,
      columns,
    }),
    [kinds, first, second, carry, division, countText, sheetLayout, columns],
  );
  // Un extremo de rango a medias llega como NaN y `validateArithmetic` lo rechaza como valor fuera de rango, así que
  // la vista previa conserva la ficha anterior y no se sortea con un número inventado.
  const validation = useMemo(() => validateArithmetic(input), [input]);

  const seedRead = readSeedInput(seedInput);
  const seedError = describeSeed(seedRead, t);
  const seedInvalid = seedError !== null;
  const seedCode = (seedRead.status === 'ok' ? seedRead.code : null) ?? regeneratedSeed ?? initialSeedCode;
  const requestKey = validation.ok && seedCode !== '' && !seedInvalid ? generationKey(validation.value, seedCode) : null;

  useEffect(() => {
    if (!requestKey || !validation.ok) return;
    const value = validation.value;
    const timer = setTimeout(() => client.request(requestKey, { value, seedCode }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, requestKey, validation, seedCode]);

  const current = requestKey !== null && generation.key === requestKey;
  // Mientras corre el debounce o el Worker, la vista previa conserva el cuadernillo anterior: no se imprime ni se descarga.
  const pending = requestKey !== null && !(current && (generation.status === 'done' || generation.status === 'failed'));
  const result = requestKey && generation.response?.ok ? generation.response.result : null;
  const hasOperations = result !== null && result.operations.length > 0;
  // Resultado vigente: lo que se puede contar y aconsejar (operaciones que no han salido, ficha corta).
  const settled = current && generation.status === 'done' && result !== null;
  // Solo se imprime o descarga un cuadernillo generado para la clave actual, y con operaciones dentro: nunca el
  // anterior, ni el marco vacío (código mal escrito o de otra versión, opciones no válidas, fallo del Worker), ni una
  // hoja sin un solo ejercicio.
  const ready = settled && hasOperations;
  // Con un código erróneo la ficha no corresponde a ningún código: no se muestra el anterior.
  const shownSeed = seedInvalid || seedCode === '' ? '—' : seedCode;
  const frameLabels = useMemo(() => ({ name: labels.sheet.name, date: labels.sheet.date, solutions: labels.sheet.solutions }), [labels.sheet]);
  const laid = useMemo(
    () =>
      result ? layoutArithmetic({ result, header, labels: frameLabels, paper, lang, includeSolutions, layout: sheetLayout, columns }) : null,
    [result, header, frameLabels, paper, lang, includeSolutions, sheetLayout, columns],
  );
  // Sin operaciones se usa el marco vacío de una sola hoja: el documento maquetado serían dos hojas en blanco y la
  // línea de trabajo anunciaría dos páginas que nadie quiere imprimir.
  const doc = useMemo<SheetDocument>(() => {
    if (laid?.ok && hasOperations) return laid.doc;
    return { paper, lang, pages: [{ role: 'student', primitives: buildFrame({ paper, header, labels: frameLabels, role: 'student' }).primitives }] };
  }, [laid, hasOperations, paper, lang, header, frameLabels]);

  const quote = (chars: string[]) => chars.map((c) => formatMessage(labels.tool.quote, { text: c })).join(' ');
  const headerChars = unsupportedSheetChars(`${header.title}${header.school}`.replace(/\s+/g, ' '));
  const headerFit = fitHeader({ paper, header, labels: frameLabels, role: includeSolutions ? 'solution' : 'student' });
  const headerNotices = [
    ...(headerChars.length > 0 ? [formatMessage(labels.tool.headerUnsupportedChars, { chars: quote(headerChars) })] : []),
    ...(headerFit.title.truncated ? [labels.tool.headerTitleShortened] : []),
  ];

  const errors = validation.ok ? [] : validation.errors;
  // Cada campo numérico repite bajo sí el problema que le toca, como el código de ficha: el aviso bloqueante es el
  // resumen, pero el docente corrige mirando el campo.
  const fieldError = (match: (e: ArithmeticError) => boolean): string | null => {
    const found = errors.find(match);
    return found ? describeError(found, t) : null;
  };
  const rangeError = (operand: 'first' | 'second') =>
    fieldError((e) => (e.code === 'operand-out-of-range' || e.code === 'range-inverted') && e.operand === operand);
  const countError = fieldError((e) => e.code === 'count-out-of-range');

  const failed = current && generation.status === 'failed';
  // El mismo problema puede llegar por dos caminos (los dos extremos de un operando fuera de rango): no se repite.
  const blocking = [
    ...new Set([
      ...errors.map((e) => describeError(e, t)),
      ...(laid && !laid.ok ? [t.errors.blockTooLarge] : []),
      ...(failed ? [t.errors.workerFailed] : []),
    ]),
  ];

  // Una operación elegida que no ha aportado ninguna no la señala el generador: se deduce del resultado vigente.
  // Con cero operaciones no se dice una por una: ese estado ya lo explica entero el panel de ficha corta.
  const missingKinds =
    settled && result && result.operations.length > 0 && validation.ok
      ? validation.value.kinds.filter((kind) => !result.operations.some((op) => op.kind === kind))
      : [];
  const notices = [
    ...new Set([
      // Las columnas pedidas se recortan a las que caben; el selector sigue marcando las pedidas, así que se dice.
      ...(settled && laid?.ok && laid.capacity.columns < columns
        ? [formatMessage(t.warnings.columnsReduced, { columns: laid.capacity.columns })]
        : []),
      ...validation.warnings.map((w) => describeWarning(w, t)),
      ...missingKinds.map((kind) => describeKindMissing(kind, t)),
    ]),
  ];

  // La ficha corta se aconseja aunque no salga ninguna operación (justo entonces es cuando más falta hace), así que
  // cuelga del resultado vigente y no de `ready`, que además exige que haya algo que imprimir.
  const shortfall = settled && result && result.operations.length < result.requested ? result : null;
  const available = shortfall ? shortfall.operations.length : 0;
  const advice = useMemo(
    () => (shortfall && validation.ok ? suggestArithmetic(validation.value, shortfall.operations.length) : []),
    [shortfall, validation],
  );
  const suggestions = advice.map((s) => describeSuggestion(s, t));
  // La salvedad sobre la ficha completa se dice una vez, en la entrada de la lista, no al final de cada sugerencia.
  const suggestionsLead = describeSuggestionsLead(advice, t);
  const retry = () => {
    if (requestKey && validation.ok) client.request(requestKey, { value: validation.value, seedCode });
  };

  // La hoja que se ve es imprimible: hay maquetación y lleva ejercicios. Es la condición del documento de la vista
  // previa, así que la línea de trabajo y la prueba dicen siempre lo mismo que se está mirando (mientras se genera la
  // siguiente ficha sigue vigente la anterior, y sus cifras con ella).
  const printable = laid?.ok === true && hasOperations;
  const paperName = paper === 'a4' ? labels.tool.paperA4 : labels.tool.paperLetter;
  // Cuántas hojas de alumno salen y cuántos ejercicios caben en cada una: un dato del trabajo, no un aviso.
  const sheetsValue =
    printable && laid?.ok ? formatMessage(t.sheets, { pages: laid.capacity.pages, perPage: laid.capacity.perPage }) : '—';

  // Con la cantidad a medias el resumen del parte no inventa un cero: «—», como el código de ficha.
  const docketDetail = Number.isInteger(input.count)
    ? formatPlural(t.optionsDetail, input.count, { seed: shownSeed })
    : formatMessage(t.optionsDetail.other, { count: '—', seed: shownSeed });
  const secondMaxDigits = kinds.mul || kinds.div ? ARITHMETIC_LIMITS.maxFactorDigits : ARITHMETIC_LIMITS.maxDigits;
  const filename = worksheetFilename(header.title, lang === 'es' ? 'ficha' : 'worksheet');
  const proof = labels.proof;

  return (
    <div data-generation={current ? generation.status : 'pending'} className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form className="md:self-start" onSubmit={(e) => e.preventDefault()}>
        <Docket summary={labels.tool.optionsSummary} detail={docketDetail}>
          <SheetHeaderFields
            value={header}
            onChange={setHeader}
            notices={headerNotices}
            labels={{ legend: labels.tool.headerLegend, title: labels.tool.titleLabel, school: labels.tool.schoolLabel }}
          />
          <KindsField value={kinds} onChange={setKinds} labels={{ legend: t.kindsLegend, ...t.kinds }} />
          <RangeFields
            first={first}
            onFirstChange={setFirst}
            second={second}
            onSecondChange={setSecond}
            firstMaxDigits={ARITHMETIC_LIMITS.maxDigits}
            secondMaxDigits={secondMaxDigits}
            firstError={rangeError('first')}
            secondError={rangeError('second')}
            labels={{
              legend: t.operandsLegend,
              first: t.firstLabel,
              second: t.secondLabel,
              min: t.minLabel,
              max: t.maxLabel,
              digits: t.digitsLabel,
              digitsHelp: t.digitsHelp,
            }}
          />
          <OptionsFields
            carry={carry}
            onCarryChange={setCarry}
            division={division}
            onDivisionChange={setDivision}
            count={countText}
            onCountChange={setCountText}
            countError={countError}
            layout={sheetLayout}
            onLayoutChange={setSheetLayout}
            columns={columns}
            onColumnsChange={setColumns}
            labels={{
              legend: t.optionsLegend,
              carryLegend: t.carryLegend,
              carryAny: t.carryAny,
              carryWith: t.carryWith,
              carryWithout: t.carryWithout,
              carryHelp: t.carryHelp,
              divisionLegend: t.divisionLegend,
              divisionExact: t.divisionExact,
              divisionRemainder: t.divisionRemainder,
              countLabel: t.countLabel,
              countHelp: formatMessage(t.countHelp, { min: ARITHMETIC_LIMITS.minCount, max: ARITHMETIC_LIMITS.maxCount }),
              layoutLegend: t.layoutLegend,
              layoutColumns: t.layoutColumns,
              layoutInline: t.layoutInline,
              columnsLabel: t.columnsLabel,
              columnsHelp: formatMessage(t.columnsHelp, { min: ARITHMETIC_LIMITS.minColumns, max: ARITHMETIC_LIMITS.maxColumns }),
            }}
          />
          <PaperSelect value={paper} onChange={setPaper} labels={{ paper: labels.tool.paperLabel, a4: labels.tool.paperA4, letter: labels.tool.paperLetter }} />
          <SeedField
            value={seedInput}
            onChange={setSeedInput}
            error={seedError}
            onNewSeed={() => {
              setSeedInput('');
              setRegeneratedSeed(newSeedCode(ARITHMETIC_ALGORITHM_VERSION));
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
              <PrintButton label={labels.tool.print} disabled={!ready || !laid?.ok} />
              <DownloadPdfButton
                doc={doc}
                filename={filename}
                disabled={!ready || !laid?.ok}
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
            { label: proof.jobPaper, value: paperName },
            { label: proof.jobSheets, value: sheetsValue },
            // Sin ejercicios no hay páginas que imprimir: «—», como el código de ficha con un código erróneo.
            { label: proof.jobPages, value: printable ? String(doc.pages.length) : '—' },
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

        {/* La región viva se monta siempre: si apareciera con su primer mensaje, los lectores de pantalla no lo leerían. */}
        <div data-notices aria-live="polite">
          {notices.length > 0 && (
            <ul className="grid gap-1 border border-line bg-surface p-4 text-sm text-ink">
              {notices.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>

        {shortfall && (
          <ShortfallPanel
            title={t.shortfall.title}
            intro={available === 0 ? t.shortfall.none : formatPlural(t.shortfall.intro, available, { requested: shortfall.requested })}
            lead={suggestionsLead}
            suggestions={suggestions}
            action={available > 0 ? formatPlural(t.shortfall.apply, available) : null}
            onApply={() => setCountText(String(available))}
          />
        )}

        <ProofSheet
          doc={doc}
          state={printable ? undefined : t.emptySheet}
          docKey={JSON.stringify([requestKey ?? 'frame', header.title, header.school, paper, includeSolutions])}
          label={labels.sheet.previewLabel}
          labels={{ zoomLegend: proof.zoomLegend, zoomFit: proof.zoomFit, zoomActual: proof.zoomActual, enlarge: proof.enlarge, close: proof.close }}
        />
      </div>

      {/* Solo con una ficha imprimible: sin esto, Ctrl+P sacaría hojas en blanco con el botón deshabilitado. */}
      {ready && <PrintRoot doc={doc} label={labels.sheet.previewLabel} />}
    </div>
  );
}
