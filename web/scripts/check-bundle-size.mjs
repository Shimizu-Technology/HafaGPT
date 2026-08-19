import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const distDirectory = path.resolve('dist');
const assetsDirectory = path.join(distDirectory, 'assets');
const maxEntryBytes = 400 * 1024;
const maxChunkBytes = 450 * 1024;

const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/);

if (!entryMatch) {
  throw new Error('Could not find the production JavaScript entry in dist/index.html.');
}

const javascriptFiles = (await readdir(assetsDirectory)).filter((file) => file.endsWith('.js'));
const sizes = await Promise.all(
  javascriptFiles.map(async (file) => ({
    file,
    bytes: (await stat(path.join(assetsDirectory, file))).size,
  })),
);

const entry = sizes.find(({ file }) => file === entryMatch[1]);
if (!entry) {
  throw new Error(`Could not inspect production entry asset ${entryMatch[1]}.`);
}

const oversizedChunks = sizes.filter(({ bytes }) => bytes > maxChunkBytes);
const formatKilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

if (entry.bytes > maxEntryBytes || oversizedChunks.length > 0) {
  const failures = [];

  if (entry.bytes > maxEntryBytes) {
    failures.push(
      `entry ${entry.file} is ${formatKilobytes(entry.bytes)} (limit ${formatKilobytes(maxEntryBytes)})`,
    );
  }

  for (const chunk of oversizedChunks) {
    failures.push(
      `chunk ${chunk.file} is ${formatKilobytes(chunk.bytes)} (limit ${formatKilobytes(maxChunkBytes)})`,
    );
  }

  throw new Error(`Production bundle budget exceeded:\n- ${failures.join('\n- ')}`);
}

const largestChunk = sizes.reduce((largest, chunk) =>
  chunk.bytes > largest.bytes ? chunk : largest,
);

console.log(
  `Bundle budget passed: entry ${formatKilobytes(entry.bytes)}, ` +
    `largest chunk ${formatKilobytes(largestChunk.bytes)}, ${sizes.length} JavaScript chunks.`,
);
