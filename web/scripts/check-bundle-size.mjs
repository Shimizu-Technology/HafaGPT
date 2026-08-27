import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const distDirectory = path.resolve('dist');
const assetsDirectory = path.join(distDirectory, 'assets');

// The authenticated production build includes Clerk plus React Router's data
// APIs. Keep a narrow raw-size allowance above that verified baseline, and pair
// it with a transfer-size ceiling so a split or minifier change cannot disguise
// meaningful startup growth.
export const DEFAULT_BUNDLE_BUDGETS = Object.freeze({
  maxInitialBytes: 425 * 1024,
  maxInitialGzipBytes: 140 * 1024,
  maxChunkBytes: 450 * 1024,
});

const formatKilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

export function inspectBundle(indexHtml, assets, budgets = DEFAULT_BUNDLE_BUDGETS) {
  const entryMatch = indexHtml.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/);

  if (!entryMatch) {
    throw new Error('Could not find the production JavaScript entry in dist/index.html.');
  }

  const sizes = [...assets.entries()]
    .filter(([file]) => file.endsWith('.js'))
    .map(([file, contents]) => ({ file, bytes: contents.byteLength }));
  const entry = sizes.find(({ file }) => file === entryMatch[1]);
  if (!entry) {
    throw new Error(`Could not inspect production entry asset ${entryMatch[1]}.`);
  }

  const modulePreloadFiles = [...indexHtml.matchAll(/<link\b[^>]*>/g)].flatMap(([tag]) => {
    if (!/\brel=["']modulepreload["']/.test(tag)) return [];
    const href = tag.match(/\bhref=["']\/assets\/([^"']+\.js)["']/);
    return href ? [href[1]] : [];
  });
  const initialFiles = [...new Set([entry.file, ...modulePreloadFiles])];
  const initialChunks = initialFiles.map((file) => {
    const chunk = sizes.find((size) => size.file === file);
    if (!chunk) {
      throw new Error(`Could not inspect initial JavaScript asset ${file}.`);
    }
    return chunk;
  });
  const initialBytes = initialChunks.reduce((total, chunk) => total + chunk.bytes, 0);
  const initialGzipBytes = initialFiles.reduce(
    (total, file) => total + gzipSync(assets.get(file)).byteLength,
    0,
  );
  const oversizedChunks = sizes.filter(({ bytes }) => bytes > budgets.maxChunkBytes);
  const failures = [];

  if (initialBytes > budgets.maxInitialBytes) {
    failures.push(
      `initial JavaScript is ${formatKilobytes(initialBytes)} across ` +
        `${initialChunks.length} chunks (limit ${formatKilobytes(budgets.maxInitialBytes)})`,
    );
  }

  if (initialGzipBytes > budgets.maxInitialGzipBytes) {
    failures.push(
      `compressed initial JavaScript is ${formatKilobytes(initialGzipBytes)} ` +
        `(limit ${formatKilobytes(budgets.maxInitialGzipBytes)})`,
    );
  }

  for (const chunk of oversizedChunks) {
    failures.push(
      `chunk ${chunk.file} is ${formatKilobytes(chunk.bytes)} ` +
        `(limit ${formatKilobytes(budgets.maxChunkBytes)})`,
    );
  }

  const largestChunk = sizes.reduce((largest, chunk) =>
    chunk.bytes > largest.bytes ? chunk : largest,
  );

  return {
    failures,
    initialBytes,
    initialChunks,
    initialFiles,
    initialGzipBytes,
    javascriptChunkCount: sizes.length,
    largestChunk,
    oversizedChunks,
  };
}

async function checkProductionBundle() {
  const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
  const javascriptFiles = (await readdir(assetsDirectory)).filter((file) => file.endsWith('.js'));
  const assets = new Map(
    await Promise.all(
      javascriptFiles.map(async (file) => [file, await readFile(path.join(assetsDirectory, file))]),
    ),
  );
  const result = inspectBundle(indexHtml, assets);

  if (result.failures.length > 0) {
    throw new Error(`Production bundle budget exceeded:\n- ${result.failures.join('\n- ')}`);
  }

  console.log(
    `Bundle budget passed: initial JavaScript ${formatKilobytes(result.initialBytes)} ` +
      `raw / ${formatKilobytes(result.initialGzipBytes)} compressed across ` +
      `${result.initialChunks.length} chunks, largest chunk ` +
      `${formatKilobytes(result.largestChunk.bytes)}, ` +
      `${result.javascriptChunkCount} JavaScript chunks.`,
  );
}

const isDirectExecution =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  await checkProductionBundle();
}
