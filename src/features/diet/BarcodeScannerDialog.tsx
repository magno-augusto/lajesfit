import { useEffect, useRef, useState } from "react";
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
  detect(image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<{ rawValue: string; format: string }[]>;
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
  const [status, setStatus] = useState<"starting" | "scanning" | "found" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualEntry, setManualEntry] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function start() {
      // getUserMedia só existe em contexto seguro (HTTPS ou localhost).
      if (!navigator.mediaDevices?.getUserMedia) {
        if (mounted) {
          setStatus("error");
          setErrorMsg(
            "A câmera só funciona em HTTPS ou localhost. Ao testar pelo IP da rede (http://192.168...), o navegador bloqueia o acesso. Digite o código manualmente abaixo ou acesse pelo endereço publicado.",
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
            ? "Permissão de câmera negada. Autorize o acesso à câmera nas configurações do navegador."
            : "Não foi possível acessar a câmera deste dispositivo.",
        );
        return;
      }

      if (!mounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      if (mounted) setStatus("scanning");

      // Detecção automática só onde o BarcodeDetector existe (Chrome Android).
      if (!("BarcodeDetector" in window)) return;

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !mounted) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results.length === 0) return;
          const barcode = results[0].rawValue;
          if (!barcode || !mounted) return;

          clearInterval(intervalRef.current!);
          await handleBarcode(barcode);
        } catch {
          // detector falhou neste frame, continua tentando
        }
      }, 800);
    }

    start();

    return () => {
      mounted = false;
      clearInterval(intervalRef.current!);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, retryKey]);

  async function handleBarcode(barcode: string) {
    setStatus("found");
    const food = await lookupOpenFoodFactsByBarcode(barcode);
    if (food) {
      onFound(food);
      onClose();
    } else {
      setStatus("error");
      setErrorMsg(`Código ${barcode} não encontrado na base de alimentos.`);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <p className="text-white font-medium">Escanear código de barras</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
          aria-label="Fechar scanner"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* mira central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-40 border-2 border-white rounded-lg opacity-70" />
        </div>
      </div>

      <div className="space-y-3 p-4 text-center">
        {status === "starting" && (
          <p className="text-white/70 text-sm">Iniciando câmera...</p>
        )}
        {status === "scanning" && (
          <p className="text-white/70 text-sm">Aponte para o código de barras do produto</p>
        )}
        {status === "found" && (
          <p className="text-green-400 text-sm">Código detectado! Buscando produto...</p>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => {
                setErrorMsg("");
                setStatus("starting");
                setRetryKey((k) => k + 1);
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Entrada manual do código — util quando a câmera não está disponível */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = manualEntry.trim();
            if (code) void handleBarcode(code);
          }}
        >
          <input
            inputMode="numeric"
            value={manualEntry}
            onChange={(e) => setManualEntry(e.target.value)}
            placeholder="Digite o código de barras"
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
    </div>
  );
}
