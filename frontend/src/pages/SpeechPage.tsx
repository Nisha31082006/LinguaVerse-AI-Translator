import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import { transcribeAudio, getVoiceHistory } from "../services/speech.service";

const LANGUAGES = [
  { code: "", name: "Transcribe only" },
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

export default function SpeechPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Voice list loads asynchronously in most browsers
  useEffect(() => {
    if (!speechSupported) return;
    function loadVoices() {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
      if (list.length > 0 && !voiceURI) setVoiceURI(list[0].voiceURI);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [speechSupported, voiceURI]);

  const { data: history } = useQuery({
    queryKey: ["voice-history"],
    queryFn: getVoiceHistory,
  });

  const transcribeMutation = useMutation({
    mutationFn: () => transcribeAudio(audioFile as File, targetLanguage || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Transcription failed"),
  });

  function speak() {
    if (!speechSupported) {
      toast.error("Your browser doesn't support speech synthesis");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(ttsText);
    const voice = voices.find((v) => v.voiceURI === voiceURI);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Speech</h1>

      <section className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Speech to text</h2>
        <p className="text-xs text-slate-400">
          Runs on a local Whisper model on the server — free, no API key. <strong>.wav files only</strong> for
          now (convert other formats to WAV first).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,.wav"
          onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => transcribeMutation.mutate()}
            disabled={!audioFile || transcribeMutation.isPending}
            className="ml-auto rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {transcribeMutation.isPending ? "Transcribing… (first run downloads the model)" : "Transcribe"}
          </button>
        </div>

        {transcribeMutation.data && (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
            <p className="whitespace-pre-wrap">{transcribeMutation.data.transcript}</p>
            {transcribeMutation.data.translatedText && (
              <p className="whitespace-pre-wrap text-slate-500">
                {transcribeMutation.data.translatedText}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Text to speech</h2>
        <p className="text-xs text-slate-400">
          Uses your browser's built-in speech synthesis — free, works offline, no backend call.
        </p>
        <textarea
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
          maxLength={4000}
          rows={4}
          placeholder="Type text to hear it spoken aloud…"
          className="w-full resize-none rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-800"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={voiceURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            disabled={voices.length === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            {voices.length === 0 && <option>No voices found</option>}
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          {speaking ? (
            <button
              onClick={stopSpeaking}
              className="ml-auto rounded-lg border border-red-300 px-6 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={speak}
              disabled={!ttsText.trim() || !speechSupported}
              className="ml-auto rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              Speak
            </button>
          )}
        </div>
        {!speechSupported && (
          <p className="text-xs text-red-500">
            Speech synthesis isn't supported in this browser.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent transcriptions</h2>
        <div className="space-y-2">
          {history?.items.length === 0 && (
            <p className="text-sm text-slate-400">No transcriptions yet.</p>
          )}
          {history?.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <p className="text-xs text-slate-400">{item.originalFileName}</p>
              <p className="font-medium">{item.transcript}</p>
              {item.translatedText && <p className="text-slate-500">{item.translatedText}</p>}
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
