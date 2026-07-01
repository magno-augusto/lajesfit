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
  const [status, setStatus] = useState<"starting" | "scanning" | "found" | "error" | "unsupported">("starting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        if (mounted) setStatus("unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (mounted) setStatus("scanning");

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
            if (mounted) setStatus("found");

            const food = await lookupOpenFoodFactsByBarcode(barcode);
            if (!mounted) return;

            if (food) {
              onFound(food);
              onClose();
            } else {
              setStatus("error");
              setErrorMsg(`Código ${barcode} não encontrado na base de alimentos.`);
            }
          } catch {
            // detector falhou neste frame, continua tentando
          }
        }, 800);
      } catch (err) {
        if (!mounted) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Não foi possível acessar a câmera.");
      }
    }

    start();

    return () => {
      mounted = false;
      clearInterval(intervalRef.current!);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

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

      <div className="p-4 text-center">
        {status === "starting" && (
          <p className="text-white/70 text-sm">Iniciando câmera...</p>
        )}
        {status === "scanning" && (
          <p className="text-white/70 text-sm">Aponte para o código de barras do produto</p>
        )}
        {status === "found" && (
          <p className="text-green-400 text-sm">Código detectado! Buscando produto...</p>
        )}
        {status === "unsupported" && (
          <p className="text-yellow-400 text-sm">
            Seu navegador não suporta leitura de código de barras. Use o Chrome no Android.
          </p>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => { setStatus("starting"); setErrorMsg(""); }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
