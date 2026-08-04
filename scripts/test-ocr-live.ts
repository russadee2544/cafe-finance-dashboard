import { createWorker } from 'tesseract.js';

const run = async () => {
  console.log('creating worker...');
  const worker = await createWorker('tha+eng', 1, {
    langPath: 'public/tess/lang',
    cachePath: 'C:/Users/mrrus/AppData/Local/Temp/opencode/tess-cache',
  });
  console.log('worker ready, recognizing...');
  const { data } = await worker.recognize('C:/Users/mrrus/AppData/Local/Temp/opencode/test-receipt.png');
  console.log('confidence:', data.confidence);
  console.log('--- TEXT ---');
  console.log(data.text);
  console.log('--- END ---');
  await worker.terminate();
};

run().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
