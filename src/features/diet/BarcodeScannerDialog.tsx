import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lookupOpenFoodFactsByBarcode } from "./food-catalog";
import type { TacoFood } from "./food-catalog";

type Props = {
  open: boolean;
  onClose: () => void;
  onFound: (food: TacoFood) => void;
};

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(
    image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  ): Promise<{ rawValue: string; format: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector: typeof BarcodeDetector;
  }
}

export function BarcodeScannerDialog({ open, onClose, onFound }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "found" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualEntry, setManualEntry] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  function stopDetection() {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function stopScanner() {
    stopDetection();
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    processingRef.current = false;
    setStatus("starting");
    setErrorMsg("");

    async function start() {
      // getUserMedia so existe em contexto seguro (HTTPS ou localhost).
      if (!navigator.mediaDevices?.getUserMedia) {
        if (mounted) {
          setStatus("error");
          setErrorMsg(
            "A camera so funciona em HTTPS ou localhost. Ao testar pelo IP da rede (http://192.168...), o navegador bloqueia o acesso. Digite o codigo manualmente abaixo ou acesse pelo endereco publicado.",
          );
        }
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        if (!mounted) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Permissao de camera negada. Autorize o acesso a camera nas configuracoes do navegador."
            : "Nao foi possivel acessar a camera deste dispositivo.",
        );
        return;
      }

      if (!mounted) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      if (mounted) setStatus("scanning");

      // Deteccao automatica so onde o BarcodeDetector existe (Chrome Android).
      if (!("BarcodeDetector" in window)) return;

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !mounted || processingRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results.length === 0) return;
          const barcode = results[0].rawValue;
          if (!barcode || !mounted) return;

          await handleBarcode(barcode);
        } catch {
          // detector falhou neste frame, continua tentando
        }
      }, 800);
    }

    void start();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [open, retryKey]);

  async function handleBarcode(barcode: string) {
    if (processingRef.current) return;

    processingRef.current = true;
    stopDetection();
    setStatus("found");

    try {
      const food = await lookupOpenFoodFactsByBarcode(barcode);
      if (food) {
        stopScanner();
        onFound(food);
        onClose();
        return;
      }

      setStatus("error");
      setErrorMsg(`Codigo ${barcode} nao encontrado na base de alimentos.`);
      processingRef.current = false;
    } catch {
      setStatus("error");
      setErrorMsg("Nao foi possivel buscar esse codigo de barras. Tente novamente.");
      processingRef.current = false;
    }
  }

  function closeScanner() {
    stopScanner();
    onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <p className="font-medium text-white">Escanear codigo de barras</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={closeScanner}
          aria-label="Fechar scanner"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-64 rounded-lg border-2 border-white opacity-70" />
        </div>
      </div>

      <div className="space-y-3 p-4 text-center">
        {status === "starting" && <p className="text-sm text-white/70">Iniciando camera...</p>}
        {status === "scanning" && (
          <p className="text-sm text-white/70">Aponte para o codigo de barras do produto</p>
        )}
        {status === "found" && (
          <p className="text-sm text-green-400">Codigo detectado! Buscando produto...</p>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => {
                setErrorMsg("");
                setStatus("starting");
                setRetryKey((key) => key + 1);
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const code = manualEntry.trim();
            if (code) void handleBarcode(code);
          }}
        >
          <input
            inputMode="numeric"
            value={manualEntry}
            onChange={(event) => setManualEntry(event.target.value)}
            placeholder="Digite o codigo de barras"
            className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="shrink-0 border-white/30 text-white hover:bg-white/20"
          >
            Buscar
          </Button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
