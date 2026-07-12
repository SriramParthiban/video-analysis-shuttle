// In-browser video downscaling with ffmpeg.wasm.
// Shrinks a clip so its long side is <= 1280px (720p-class), re-encodes H.264,
// drops audio. The models downscale frames anyway, so this loses no analysis
// quality while cutting file size dramatically (a 1080p iPhone clip -> ~30-50MB).
//
// ffmpeg is loaded lazily (dynamic import) so it never runs during SSR/build,
// and the ffmpeg-core files are self-hosted under /public/ffmpeg.

import type { FFmpeg } from '@ffmpeg/ffmpeg';

export type CompressResult = { file: File; compressed: boolean };

// Files already comfortably under the cap skip compression entirely.
const SKIP_COMPRESS_BYTES = 45 * 1024 * 1024; // 45 MB

// Read a clip's duration in the browser (0 if the codec can't be decoded here).
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(v.duration) ? v.duration : 0);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      v.src = url;
    } catch {
      resolve(0);
    }
  });
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');
      const instance = new FFmpeg();
      await instance.load({
        coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      });
      return instance;
    })();
  }
  return ffmpegPromise;
}

export async function compressVideo(
  input: File,
  onProgress?: (ratio: number) => void,
): Promise<CompressResult> {
  if (input.size <= SKIP_COMPRESS_BYTES) {
    return { file: input, compressed: false };
  }

  try {
    const { fetchFile } = await import('@ffmpeg/util');
    const ffmpeg = await loadFFmpeg();

    const inExt = (input.name.split('.').pop() || 'mp4').toLowerCase();
    const inName = `input.${inExt}`;
    const outName = 'output.mp4';

    await ffmpeg.writeFile(inName, await fetchFile(input));

    const handleProgress = ({ progress }: { progress: number }) => {
      onProgress?.(Math.max(0, Math.min(1, progress)));
    };
    ffmpeg.on('progress', handleProgress);

    // Target ~42 MB regardless of length by choosing a bitrate from the duration.
    // (Resolution-only downscaling can't keep a LONG clip under the cap.)
    const TARGET_BYTES = 42 * 1024 * 1024;
    const duration = await getVideoDuration(input); // seconds, 0 if unknown
    const args = [
      '-i', inName,
      // Cap the long side at 1280px without ever upscaling; keep aspect (even dims).
      '-vf', "scale='if(gt(iw,ih),min(iw,1280),-2)':'if(gt(iw,ih),-2,min(ih,1280))'",
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-an', // analysis doesn't need audio
      '-movflags', '+faststart',
    ];
    if (duration > 0) {
      const kbps = Math.max(300, Math.min(2500, Math.floor((TARGET_BYTES * 8) / duration / 1000)));
      args.push('-b:v', `${kbps}k`, '-maxrate', `${Math.floor(kbps * 1.5)}k`, '-bufsize', `${kbps * 2}k`);
    } else {
      args.push('-crf', '30');
    }
    args.push('-fs', '43M', outName); // hard size cap as a final safety net
    await ffmpeg.exec(args);

    ffmpeg.off('progress', handleProgress);

    const data = await ffmpeg.readFile(outName);
    ffmpeg.deleteFile(inName).catch(() => {});
    ffmpeg.deleteFile(outName).catch(() => {});

    // Copy into an ArrayBuffer-backed view so it's a valid BlobPart.
    const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
    if (blob.size >= input.size) {
      // Somehow larger — keep the original.
      return { file: input, compressed: false };
    }

    const base = input.name.replace(/\.[^.]+$/, '');
    const outFile = new File([blob], `${base}-720p.mp4`, { type: 'video/mp4' });
    return { file: outFile, compressed: true };
  } catch (err) {
    // Safety net: never block an upload because compression failed.
    console.warn('Video compression failed; uploading original.', err);
    return { file: input, compressed: false };
  }
}
