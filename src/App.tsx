import { useEffect, useMemo, useRef, useState } from 'react';
import { Counts, CrossingLine, CrossingTracker, LineOrientation } from './tracker';

type Model = {
  detect: (video: HTMLVideoElement) => Promise<ModelPrediction[]>;
};

type ModelPrediction = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

const confidenceThreshold = 0.55;
const emptyCounts: Counts = { person: 0, car: 0 };

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const trackerRef = useRef(new CrossingTracker({ line: { orientation: 'horizontal', position: 0 } }));

  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [status, setStatus] = useState('Listo para iniciar el conteo.');
  const [isRunning, setIsRunning] = useState(false);
  const [orientation, setOrientation] = useState<LineOrientation>('horizontal');

  const line = useMemo<CrossingLine>(() => ({
    orientation,
    position: orientation === 'horizontal'
      ? (canvasRef.current?.height ?? 480) / 2
      : (canvasRef.current?.width ?? 640) / 2,
  }), [orientation]);

  useEffect(() => {
    trackerRef.current.updateLine(line);
  }, [line]);

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      setStatus('Cargando modelo de deteccion...');
      const [{ load }, tf] = await Promise.all([
        import('@tensorflow-models/coco-ssd'),
        import('@tensorflow/tfjs'),
      ]);

      await tf.ready();
      const model = await load();

      setStatus('Solicitando acceso a la camara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;

      if (!video) {
        throw new Error('No se encontro el elemento de video.');
      }

      video.srcObject = stream;
      await video.play();
      setIsRunning(true);
      setStatus('Contando personas y autos en vivo.');
      detectLoop(model);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible iniciar la camara.');
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRunning(false);
  };

  const resetCounts = () => {
    setCounts(trackerRef.current.reset());
    drawScene([]);
  };

  const detectLoop = (model: Model) => {
    const loop = async () => {
      const video = videoRef.current;

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      syncCanvasSize(video);
      const predictions = await model.detect(video);
      const tracked = predictions
        .filter((prediction) => prediction.score >= confidenceThreshold)
        .filter((prediction) => prediction.class === 'person' || prediction.class === 'car')
        .map((prediction) => ({
          className: prediction.class as 'person' | 'car',
          bbox: prediction.bbox,
        }));

      drawScene(predictions);
      setCounts(trackerRef.current.update(tracked));
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  };

  const syncCanvasSize = (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
  };

  const drawScene = (predictions: ModelPrediction[]) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 3;
    context.font = '16px system-ui';

    for (const prediction of predictions) {
      if (prediction.score < confidenceThreshold || !['person', 'car'].includes(prediction.class)) {
        continue;
      }

      const [x, y, width, height] = prediction.bbox;
      context.strokeStyle = prediction.class === 'person' ? '#22c55e' : '#38bdf8';
      context.fillStyle = context.strokeStyle;
      context.strokeRect(x, y, width, height);
      context.fillText(`${prediction.class} ${(prediction.score * 100).toFixed(0)}%`, x, Math.max(y - 8, 16));
    }

    context.strokeStyle = '#f97316';
    context.setLineDash([12, 8]);

    if (line.orientation === 'horizontal') {
      const y = canvas.height / 2;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    } else {
      const x = canvas.width / 2;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }

    context.setLineDash([]);
  };

  return (
    <main className="shell">
      <section className="panel">
        <div className="title-group">
          <p className="eyebrow">POCIA Count</p>
          <h1>Contador de personas y autos</h1>
          <p className="summary">
            Prototipo web para contar cruces frente a la camara del celular usando solo el navegador.
          </p>
        </div>

        <div className="counter-grid" aria-label="Conteos">
          <div>
            <span>Personas</span>
            <strong>{counts.person}</strong>
          </div>
          <div>
            <span>Autos</span>
            <strong>{counts.car}</strong>
          </div>
        </div>

        <div className="controls">
          <div className="segmented" aria-label="Orientacion de linea">
            <button
              className={`segment ${orientation === 'horizontal' ? 'active' : ''}`}
              type="button"
              onClick={() => setOrientation('horizontal')}
            >
              Linea horizontal
            </button>
            <button
              className={`segment ${orientation === 'vertical' ? 'active' : ''}`}
              type="button"
              onClick={() => setOrientation('vertical')}
            >
              Linea vertical
            </button>
          </div>

          <button type="button" onClick={isRunning ? stopCamera : startCamera}>
            {isRunning ? 'Detener conteo' : 'Iniciar conteo'}
          </button>
          <button className="secondary" type="button" onClick={resetCounts}>
            Reiniciar
          </button>
        </div>

        <p className="status">{status}</p>
      </section>

      <section className="camera-stage" aria-label="Vista de camara">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
      </section>
    </main>
  );
}

export default App;
