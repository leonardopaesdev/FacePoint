import { Camera, ImageUp, RefreshCw } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  onCapture: (image: Blob | null) => void;
  compact?: boolean;
};

export function CameraCapture({ onCapture, compact = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "denied" | "unavailable" | "busy" | "error">("starting");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    stopCamera();
    setCameraState("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      stopCamera();
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setCameraState("denied");
      } else if (error instanceof DOMException && error.name === "NotFoundError") {
        setCameraState("unavailable");
      } else if (error instanceof DOMException && ["NotReadableError", "AbortError", "TrackStartError"].includes(error.name)) {
        setCameraState("busy");
      } else {
        console.error("Falha ao iniciar a câmera", error);
        setCameraState("error");
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera();
    return () => {
      requestIdRef.current += 1;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const setImage = (blob: Blob) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(blob));
    onCapture(blob);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      if (cameraState !== "starting") void startCamera();
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && setImage(blob), "image/jpeg", 0.9);
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setImage(file);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onCapture(null);
  };

  const cameraMessage = {
    starting: "Iniciando a câmera...",
    ready: "CÂMERA ATIVA · AGUARDANDO ROSTO",
    denied: "Permissão bloqueada. Redefina a câmera no navegador e tente novamente.",
    unavailable: "Nenhuma câmera disponível. Use uma imagem do dispositivo.",
    busy: "A câmera está ocupada. Feche outro aplicativo ou aba que esteja usando a webcam.",
    error: "O navegador não conseguiu iniciar a câmera. Tente novamente ou selecione uma imagem.",
  }[cameraState];

  return (
    <div className={`camera ${compact ? "camera--compact" : ""}`}>
      <div className="camera__viewport">
        {preview ? <img src={preview} alt="Captura facial" /> : <video ref={videoRef} autoPlay muted playsInline />}
        <span className="camera__corner camera__corner--tl" />
        <span className="camera__corner camera__corner--tr" />
        <span className="camera__corner camera__corner--bl" />
        <span className="camera__corner camera__corner--br" />
        {!preview && <div className="camera__guide"><Camera size={compact ? 38 : 56} /></div>}
      </div>
      <div className={`camera__status camera__status--${preview ? "ready" : cameraState}`}><span /> {preview ? "IMAGEM CAPTURADA" : cameraMessage}</div>
      <div className="camera__actions">
        {preview ? (
          <button className="button button--secondary" type="button" onClick={reset}><RefreshCw size={17} /> Refazer</button>
        ) : (
          <>
            <button className="button button--primary" type="button" disabled={cameraState !== "ready"} onClick={capture}><Camera size={17} /> Capturar foto</button>
            {cameraState !== "ready" && cameraState !== "starting" && (
              <button className="button button--secondary" type="button" onClick={() => void startCamera()}><RefreshCw size={17} /> Tentar novamente</button>
            )}
          </>
        )}
        <label className="button button--ghost">
          <ImageUp size={17} /> Selecionar arquivo
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} hidden />
        </label>
      </div>
    </div>
  );
}
