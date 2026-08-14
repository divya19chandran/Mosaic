import { createWorker, type Worker } from 'tesseract.js';
import { guessDateFromText, guessTimeFromText } from './autofill';

/** One recognized line of text plus its pixel height, used to tell a big
 * headline apart from small print (UI chrome, captions, etc). */
export interface OcrLine {
  text: string;
  height: number;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
}

/**
 * Shrinks an uploaded image to a reasonable size and returns it as a JPEG
 * data URL, so screenshots don't bloat localStorage (which has a small
 * per-origin quota) or make activity cards slow to render.
 */
export async function toCompressedDataUrl(file: File, maxDim = 640, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

async function recognizeSource(worker: Worker, source: Parameters<Worker['recognize']>[0]): Promise<OcrResult> {
  const { data } = await worker.recognize(source, {}, { text: true, blocks: true });
  const lines: OcrLine[] = [];
  (data.blocks ?? []).forEach((block) => {
    block.paragraphs.forEach((paragraph) => {
      paragraph.lines.forEach((line) => {
        const text = line.text.trim();
        if (!text) return;
        lines.push({ text, height: Math.max(0, line.bbox.y1 - line.bbox.y0) });
      });
    });
  });
  return { text: data.text ?? '', lines };
}

/**
 * Vertical slices (as a fraction of image height) to retry OCR on when the
 * first full-image pass doesn't turn up a date/time. Tesseract's whole-page
 * layout analysis was built for scanned documents, and on a graphic-design
 * flyer — a big headline, colored banner blocks, a logo, an address — it can
 * decide one of those blocks doesn't fit the page's "profile" and silently
 * drop it from the output entirely, even when that line is perfectly legible
 * on its own. Cropping to overlapping bands sidesteps that whole-page
 * decision (each band gets analyzed on its own, simpler layout), and the
 * overlap means a line near a slice boundary still lands fully inside at
 * least one of the three.
 */
const RETRY_BANDS: [number, number][] = [
  [0, 0.66],
  [0.25, 0.75],
  [0.34, 1],
];

async function cropToBlob(bitmap: ImageBitmap, topFrac: number, bottomFrac: number): Promise<Blob | null> {
  const top = Math.round(bitmap.height * topFrac);
  const bottom = Math.round(bitmap.height * bottomFrac);
  const height = Math.max(1, bottom - top);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, top, bitmap.width, height, 0, 0, bitmap.width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Runs on-device OCR over an uploaded screenshot and returns both the raw
 * extracted text and per-line bounding-box heights. The per-line heights are
 * what let the title guesser (see lib/autofill.ts) tell a big flyer headline
 * apart from small print like nav chrome, handles, and button labels —
 * something plain text alone can't do. Everything happens in the browser (no
 * server, no upload of the image anywhere) — the worker script, WASM core,
 * and English language data are all served from this app's own
 * `public/tesseract` folder (copied from the tesseract.js/tesseract.js-core/
 * @tesseract.js-data packages at build time) rather than tesseract.js's
 * default jsdelivr CDN paths. That keeps OCR working the first time
 * regardless of whether a given network allows third-party CDN requests, and
 * means everything after the initial page load works fully offline.
 *
 * Uses `createWorker` directly (rather than the `Tesseract.recognize`
 * convenience wrapper) because the wrapper always requests `{ text: true }`
 * output only — getting line-level bounding boxes back requires asking for
 * `{ blocks: true }` explicitly via the lower-level worker API.
 *
 * If the first full-image pass doesn't yield a date or time, this retries on
 * a few overlapping vertical bands of the same image (see RETRY_BANDS above)
 * and appends whatever text those turn up — cheap insurance against
 * Tesseract's page-layout analysis dropping a legible banner line, at the
 * cost of a bit more time only on the images where the fast path came up
 * short.
 */
export async function extractTextFromImage(file: File): Promise<OcrResult> {
  const worker = await createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core/',
    langPath: '/tesseract/lang/',
  });

  try {
    // Decode the file into a bitmap up front and hand tesseract a
    // canvas-re-encoded PNG blob rather than the raw uploaded File. Tesseract
    // has its own internal decoding path for File/Blob sources, separate from
    // the browser's createImageBitmap/canvas pipeline, and it doesn't handle
    // every real-world phone-screenshot JPEG the same way (progressive
    // JPEGs, CMYK color profiles, odd EXIF orientation, etc. have been seen
    // to make it throw outright even though the browser decodes the same
    // file just fine). Re-encoding through canvas first means tesseract
    // always receives a plain, uncompressed-color, orientation-normalized
    // PNG — the same reliable path the retry crop bands already use below —
    // so the "happy path" gets the same robustness the retry path had.
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
    } catch (err) {
      console.error('OCR: createImageBitmap failed, falling back to raw file', err);
    }

    let first: OcrResult;
    if (bitmap) {
      const normalized = await cropToBlob(bitmap, 0, 1);
      try {
        first = await recognizeSource(worker, normalized ?? file);
      } catch (err) {
        console.error('OCR: recognize failed on normalized image, retrying with raw file', err);
        first = await recognizeSource(worker, file);
      }
    } else {
      first = await recognizeSource(worker, file);
    }

    // Require BOTH a date and a time before trusting the first full-image
    // pass enough to skip the retry crops. A single full-image OCR pass on
    // a compact card (small text overlaid on a busy photo/video background,
    // e.g. an Instagram/TikTok-style event post) often mangles just one of
    // the two — a stray digit gets fuzzy-matched into a plausible-looking
    // but wrong date, while the time doesn't match at all (or vice versa).
    // The old `||` check treated finding just one as "good enough" and
    // skipped the retry bands entirely, so the more accurate, tightly-cropped
    // read of that same line never got a chance to run. Falling through to
    // the retry bands whenever either field is missing gives
    // guessDateFromText/guessTimeFromText's combo-line matching (see
    // lib/autofill.ts) real alternative text to prefer over a low-confidence
    // first-pass guess.
    const hasDateAndTime = !!guessDateFromText(first.text) && !!guessTimeFromText(first.text);
    if (hasDateAndTime) return first;

    // Reuse the bitmap decoded above for the normalized first pass — no need
    // to decode the file a second time (and if it failed up there, it'll
    // fail the same way here, so just bail out consistent with before).
    if (!bitmap) return first; // can't crop for retry bands — just return what we have

    const extraTexts: string[] = [];
    for (const [topFrac, bottomFrac] of RETRY_BANDS) {
      try {
        const blob = await cropToBlob(bitmap, topFrac, bottomFrac);
        if (!blob) continue;
        const band = await recognizeSource(worker, blob);
        if (band.text.trim()) extraTexts.push(band.text);
      } catch {
        // one band failing shouldn't sink the others — just skip it
      }
    }

    if (extraTexts.length === 0) return first;
    return { text: [first.text, ...extraTexts].join('\n'), lines: first.lines };
  } finally {
    await worker.terminate();
  }
}
