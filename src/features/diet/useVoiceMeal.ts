import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { MealFoodInput } from "./meals-api";

export type VoiceMealStatus = "idle" | "recording" | "transcribing" | "parsing" | "done" | "error";

type ParsedItem = {
  food_name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function getPreferredMimeType(): string | null {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
}

function mimeToExt(mimeType: string | null): string {
  if (!mimeType) return "webm";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  return "wav";
}

export function useVoiceMeal() {
  const [status, setStatus] = useState<VoiceMealStatus>("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [items, setItems] = useState<MealFoodInput[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const processAudioRef = useRef<(audioBlob: Blob, mimeType: string | null) => Promise<void>>(
    undefined!,
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (status === "recording") {
      recorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        setElapsed(0);

        const audioBlob = new Blob(chunks, { type: mimeType ?? "audio/webm" });
        if (audioBlob.size < 1000) {
          toast.warning("Audio muito curto. Tente falar por mais tempo.");
          setStatus("idle");
          return;
        }

        await processAudioRef.current(audioBlob, mimeType);
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setStatus("recording");
      setElapsed(0);
      setTranscribedText("");
      setItems([]);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error("Nao foi possivel acessar o microfone. Verifique as permissoes do navegador.");
    }
  }, [status, stopTimer]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob, mimeType: string | null) => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setStatus("transcribing");

      const formData = new FormData();
      const ext = mimeToExt(mimeType);
      formData.append("audio", audioBlob, `recording.${ext}`);

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!transcribeRes.ok) {
        const error = await transcribeRes.json().catch(() => ({}));
        throw new Error(error.error ?? "Falha na transcricao");
      }

      const { text } = (await transcribeRes.json()) as { text: string };
      if (!text?.trim()) {
        toast.warning("Nao foi possivel entender o audio. Tente falar mais alto e claro.");
        setStatus("idle");
        return;
      }

      setTranscribedText(text);
      setStatus("parsing");

      const parseRes = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!parseRes.ok) {
        const error = await parseRes.json().catch(() => ({}));
        throw new Error(error.error ?? "Falha ao interpretar refeicao");
      }

      const { items: parsedItems } = (await parseRes.json()) as { items: ParsedItem[] };

      if (!parsedItems || parsedItems.length === 0) {
        toast.warning("Nao consegui identificar alimentos. Tente descrever o que comeu.");
        setStatus("idle");
        return;
      }

      const mealInputs: MealFoodInput[] = parsedItems.map((item) => ({
        name: item.food_name,
        foodId: null,
        grams: item.grams,
        calories: item.kcal,
        protein: item.protein_g,
        carbs: item.carbs_g,
        fat: item.fat_g,
      }));

      setItems(mealInputs);
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(message);
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }, []);

  processAudioRef.current = processAudio;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    recorderRef.current?.stop();
    stopTimer();
    setStatus("idle");
    setTranscribedText("");
    setItems([]);
    setElapsed(0);
  }, [stopTimer]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscribedText("");
    setItems([]);
    setElapsed(0);
  }, []);

  return {
    status,
    transcribedText,
    items,
    elapsed,
    startRecording,
    stopRecording,
    cancel,
    reset,
    setItems,
  };
}
