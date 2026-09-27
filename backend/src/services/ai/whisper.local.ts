import fs from "fs";
import { WaveFile } from "wavefile";
import { AppError } from "../../middlewares/errorHandler";
import { env } from "../../config/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadingPromise: Promise<any> | null = null;

/**
 * Loads (and caches) the local Whisper pipeline. Model weights download
 * once from Hugging Face on first use (needs internet that one time) and
 * are cached on disk after that — every request after the first runs
 * fully offline, on the CPU, with no API key and no per-request cost.
 *
 * @xenova/transformers is an ESM package; this backend is CommonJS, so we
 * load it with a dynamic import() (which Node can always use to load ESM
 * from CJS) rather than a static import, avoiding require()-vs-ESM
 * compatibility issues entirely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPipeline(): Promise<any> {
  if (cachedPipeline) return cachedPipeline;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return pipeline("automatic-speech-recognition", env.WHISPER_MODEL);
    })();
  }
  cachedPipeline = await loadingPromise;
  return cachedPipeline;
}

/**
 * Transcribes a local WAV file using a local Whisper model.
 *
 * SCOPED LIMITATION: only .wav (PCM) input is supported. Decoding MP3/M4A/
 * OGG properly needs an audio-transcoding step (e.g. ffmpeg) which this
 * project deliberately avoids adding as a dependency — ffmpeg is a large,
 * platform-specific native binary that causes exactly the kind of Windows
 * install friction this refactor was trying to avoid. Callers should
 * convert audio to WAV client-side or with a standalone tool first.
 */
export async function transcribeLocalWav(filePath: string): Promise<string> {
  let wav: WaveFile;
  try {
    const buffer = fs.readFileSync(filePath);
    wav = new WaveFile(buffer);
  } catch (err) {
    throw new AppError(
      `Couldn't read this file as WAV audio: ${(err as Error).message}. Only .wav (PCM) files are supported for transcription right now — convert other formats to WAV first.`,
      400,
    );
  }

  // Whisper expects mono, 16kHz, 32-bit float PCM
  wav.toBitDepth("32f");
  wav.toSampleRate(16000);

  const samples = wav.getSamples();
  let audioData: Float32Array;

  if (Array.isArray(samples)) {
    // Multi-channel WAV comes back as one Float32Array per channel — average to mono
    const channels = samples as Float32Array[];
    audioData = new Float32Array(channels[0].length);
    for (let i = 0; i < audioData.length; i++) {
      let sum = 0;
      for (const ch of channels) sum += ch[i];
      audioData[i] = sum / channels.length;
    }
  } else {
    audioData = samples as Float32Array;
  }

  let transcriber;
  try {
    transcriber = await getPipeline();
  } catch (err) {
    throw new AppError(
      `Failed to load the local Whisper model (${env.WHISPER_MODEL}): ${(err as Error).message}. This model downloads on first use and needs an internet connection that one time.`,
      502,
    );
  }

  try {
    const output = await transcriber(audioData, { chunk_length_s: 30 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = Array.isArray(output) ? output.map((o: any) => o.text).join(" ") : (output as any).text;
    return (text ?? "").trim();
  } catch (err) {
    throw new AppError(`Local transcription failed: ${(err as Error).message}`, 502);
  }
}
