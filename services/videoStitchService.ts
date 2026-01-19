import { spawn } from 'child_process';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const DATA_URL_REGEX = /^data:(.+?);base64,(.*)$/;

const parseDataUrl = (dataUrl: string) => {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const mimeType = match[1];
  const base64Data = match[2];
  if (!base64Data) {
    throw new Error('Missing base64 data');
  }
  return { mimeType, buffer: Buffer.from(base64Data, 'base64') };
};

const toDataUrl = (buffer: Buffer, mimeType: string) =>
  `data:${mimeType};base64,${buffer.toString('base64')}`;

const runCommand = (command: string, args: string[], traceId?: string) => {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const message = traceId
        ? `[FFMPEG ${traceId}] ${stderr || `Process exited with code ${code}`}`
        : (stderr || `Process exited with code ${code}`);
      reject(new Error(message));
    });
  });
};

const createTempDir = async () => {
  return mkdtemp(join(tmpdir(), 'predi-video-'));
};

export async function stitchVideoClips(
  clips: string[],
  options?: { traceId?: string; reencode?: boolean }
): Promise<string> {
  if (clips.length === 0) {
    throw new Error('No clips provided for stitching');
  }

  const tempDir = await createTempDir();
  const traceId = options?.traceId;
  try {
    const clipPaths: string[] = [];
    for (let i = 0; i < clips.length; i += 1) {
      const { buffer } = parseDataUrl(clips[i]);
      const clipPath = join(tempDir, `clip-${i}.mp4`);
      await writeFile(clipPath, buffer);
      clipPaths.push(clipPath);
    }

    const listPath = join(tempDir, 'clips.txt');
    const listContent = clipPaths
      .map(path => `file '${path.replace(/'/g, "'\\''")}'`)
      .join('\n');
    await writeFile(listPath, listContent);

    const outputPath = join(tempDir, 'stitched.mp4');
    const concatArgs = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath];

    try {
      await runCommand('ffmpeg', concatArgs, traceId);
    } catch (error) {
      if (options?.reencode === false) {
        throw error;
      }
      const fallbackArgs = [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'veryfast',
        '-an',
        outputPath,
      ];
      await runCommand('ffmpeg', fallbackArgs, traceId);
    }

    const stitchedBuffer = await readFile(outputPath);
    return toDataUrl(stitchedBuffer, 'video/mp4');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function extractLastFrame(
  videoDataUrl: string,
  options?: { traceId?: string }
): Promise<{ base64: string; mimeType: string }> {
  const tempDir = await createTempDir();
  const traceId = options?.traceId;
  try {
    const { buffer } = parseDataUrl(videoDataUrl);
    const inputPath = join(tempDir, 'input.mp4');
    const outputPath = join(tempDir, 'frame.png');

    await writeFile(inputPath, buffer);

    const args = [
      '-y',
      '-sseof',
      '-0.1',
      '-i',
      inputPath,
      '-vframes',
      '1',
      '-vf',
      'scale=1536:-2',
      outputPath,
    ];

    await runCommand('ffmpeg', args, traceId);

    const frameBuffer = await readFile(outputPath);
    return { base64: frameBuffer.toString('base64'), mimeType: 'image/png' };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
