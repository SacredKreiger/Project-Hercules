"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  onDetected: (barcode: string) => void;
  onError?: (msg: string) => void;
}

export default function BarcodeScanner({ onDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"loading" | "scanning" | "unsupported" | "denied">("loading");

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleBarcode = useCallback((barcode: string) => {
    if (firedRef.current) return;
    firedRef.current = true;
    stopStream();
    onDetected(barcode);
  }, [onDetected, stopStream]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Try native BarcodeDetector first
      if ("BarcodeDetector" in window) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;

          // @ts-ignore
          detectorRef.current = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
          setStatus("scanning");

          function tick() {
            if (!videoRef.current || !detectorRef.current || firedRef.current) return;
            detectorRef.current.detect(videoRef.current).then((results: any[]) => {
              if (results.length > 0) handleBarcode(results[0].rawValue);
              else rafRef.current = requestAnimationFrame(tick);
            }).catch(() => {
              rafRef.current = requestAnimationFrame(tick);
            });
          }
          rafRef.current = requestAnimationFrame(tick);
          return;
        } catch (err: any) {
          if (err.name === "NotAllowedError") {
            setStatus("denied");
            onError?.("Camera access denied. Enable camera in Settings.");
            return;
          }
        }
      }

      // Fallback: file input with zxing
      setStatus("unsupported");
    }

    start();
    return () => { cancelled = true; stopStream(); };
  }, [handleBarcode, onError, stopStream]);

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/library");
      const reader = new BrowserMultiFormatReader();
      const img = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL();
      const result = await reader.decodeFromImageUrl(dataUrl);
      handleBarcode(result.getText());
    } catch {
      setStatus("unsupported");
      onError?.("Couldn't read barcode. Try better lighting or a clearer angle.");
    }
  }

  if (status === "denied") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <p className="text-2xl">📷</p>
        <p className="font-semibold text-sm">Camera access denied</p>
        <p className="text-xs text-muted-foreground">Enable camera access in your device Settings, then reload.</p>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <p className="text-2xl">🔍</p>
        <p className="font-semibold text-sm">Tap to scan a barcode</p>
        <p className="text-xs text-muted-foreground">Take a photo of the barcode</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full press"
        >
          Open Camera
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {status === "scanning" && (
        <>
          {/* Dimmed overlay with scanning window */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/45" />
            {/* Clear rectangle in center */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl"
              style={{ width: "72%", height: "28%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
            />
            {/* Corner brackets */}
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl",
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute w-6 h-6 border-white ${cls}`}
                style={{
                  left: i % 2 === 0 ? "14%" : undefined,
                  right: i % 2 === 1 ? "14%" : undefined,
                  top: i < 2 ? "36%" : undefined,
                  bottom: i >= 2 ? "36%" : undefined,
                }}
              />
            ))}
          </div>
          <p className="absolute bottom-4 inset-x-0 text-center text-white/70 text-xs">Align barcode within frame</p>
        </>
      )}
    </div>
  );
}
