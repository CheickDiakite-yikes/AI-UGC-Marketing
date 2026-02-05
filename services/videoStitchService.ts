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

const runCommandWithOutput = (command: string, args: string[], traceId?: string) => {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
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

const parseFps = (rate?: string): number | null => {
  if (!rate) return null;
  const parts = rate.split('/');
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }
  const value = Number(rate);
  return Number.isFinite(value) ? value : null;
};

const probeVideoInfo = async (inputPath: string, traceId?: string) => {
  const output = await runCommandWithOutput('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,r_frame_rate',
    '-of',
    'json',
    inputPath
  ], traceId);

  const data = JSON.parse(output);
  const stream = data?.streams?.[0];
  const width = Number(stream?.width);
  const height = Number(stream?.height);
  const fps = parseFps(stream?.r_frame_rate) || null;

  return {
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    fps
  };
};

const normalizeClipPaths = async (
  clipPaths: string[],
  params: { width: number; height: number; fps: number; traceId?: string; tempDir: string }
) => {
  const { width, height, fps, traceId, tempDir } = params;
  const normalizedPaths: string[] = [];
  const evenWidth = Math.max(2, Math.floor(width / 2) * 2);
  const evenHeight = Math.max(2, Math.floor(height / 2) * 2);
  const scaleFilter = `scale=${evenWidth}:${evenHeight}:force_original_aspect_ratio=decrease,pad=${evenWidth}:${evenHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

  for (let i = 0; i < clipPaths.length; i += 1) {
    const inputPath = clipPaths[i];
    const outputPath = join(tempDir, `normalized-${i}.mp4`);
    const args = [
      '-y',
      '-i',
      inputPath,
      '-vf',
      scaleFilter,
      '-r',
      `${fps}`,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'veryfast',
      '-an',
      outputPath
    ];
    await runCommand('ffmpeg', args, traceId);
    normalizedPaths.push(outputPath);
  }

  return normalizedPaths;
};

export async function stitchVideoClips(
  clips: string[],
  options?: { traceId?: string; reencode?: boolean; normalize?: boolean }
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
      console.warn(`[FFMPEG ${traceId}] Direct concat failed, attempting re-encode`, error);
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
      try {
        await runCommand('ffmpeg', fallbackArgs, traceId);
      } catch (fallbackError) {
        console.warn(`[FFMPEG ${traceId}] Re-encode concat failed, attempting normalized clips`, fallbackError);
        if (options?.normalize === false) {
          throw fallbackError;
        }
        let probe = { width: null as number | null, height: null as number | null, fps: null as number | null };
        try {
          probe = await probeVideoInfo(clipPaths[0], traceId);
        } catch (probeError) {
          console.warn(`[FFMPEG ${traceId}] Failed to probe clip metadata, using defaults`, probeError);
        }
        const targetWidth = probe.width || 1280;
        const targetHeight = probe.height || 720;
        const targetFps = probe.fps || 30;
        const normalizedPaths = await normalizeClipPaths(clipPaths, {
          width: targetWidth,
          height: targetHeight,
          fps: targetFps,
          traceId,
          tempDir
        });
        const normalizedListPath = join(tempDir, 'normalized-clips.txt');
        const normalizedList = normalizedPaths
          .map(path => `file '${path.replace(/'/g, "'\\''")}'`)
          .join('\n');
        await writeFile(normalizedListPath, normalizedList);
        const normalizedConcatArgs = [
          '-y',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          normalizedListPath,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-preset',
          'veryfast',
          '-an',
          outputPath,
        ];
        await runCommand('ffmpeg', normalizedConcatArgs, traceId);
        console.log(`[FFMPEG ${traceId}] Normalized concat succeeded`, {
          targetWidth,
          targetHeight,
          targetFps,
          clipCount: normalizedPaths.length
        });
      }
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
