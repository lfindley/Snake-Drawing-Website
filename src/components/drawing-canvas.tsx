"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { StrokePoint } from "@/lib/types";

type DrawingCanvasProps = {
  points: StrokePoint[];
  onChange: (points: StrokePoint[]) => void;
  onStrokeStart?: () => void;
  className?: string;
  overlay?: ReactNode;
};

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 620;
export { CANVAS_WIDTH, CANVAS_HEIGHT };

export function DrawingCanvas({
  points,
  onChange,
  onStrokeStart,
  className,
  overlay,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const interactionRef = useRef<HTMLDivElement | null>(null);
  const activeStrokeRef = useRef<StrokePoint[]>(points);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const beginStroke = (clientX: number, clientY: number) => {
    onStrokeStart?.();
    drawingRef.current = true;
    activeStrokeRef.current = [];
    appendPoint(clientX, clientY);
  };

  const endStroke = () => {
    drawingRef.current = false;
    pointerIdRef.current = null;
  };

  useEffect(() => {
    activeStrokeRef.current = points;
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 10;
    context.strokeStyle = "#30452d";
    context.shadowColor = "rgba(49, 72, 44, 0.12)";
    context.shadowBlur = 14;

    if (points.length < 2) {
      return;
    }

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    points.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y);
    });

    context.stroke();
  }, [points]);

  const appendPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const interactionLayer = interactionRef.current;
    if (!canvas || !interactionLayer) {
      return;
    }

    const rect = interactionLayer.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      t: Date.now(),
    };

    const currentPoints = activeStrokeRef.current;
    const previousPoint = currentPoints[currentPoints.length - 1];
    const duplicate =
      previousPoint &&
      Math.hypot(previousPoint.x - point.x, previousPoint.y - point.y) < 1.5;

    if (duplicate) {
      return;
    }

    const nextPoints = [...currentPoints, point];
    activeStrokeRef.current = nextPoints;
    onChange(nextPoints);
  };

  return (
    <div className="relative overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-[#f8f1df] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      <div className="canvas-grid relative overflow-hidden rounded-[1.35rem] border border-[rgba(49,72,44,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(244,234,212,0.3))]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`relative z-10 block h-[320px] w-full select-none transition-opacity duration-500 sm:h-[420px] lg:h-[520px] xl:h-[620px] ${className ?? ""}`}
        />
        {overlay ? <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div> : null}
        <div
          ref={interactionRef}
          className="pointer-events-auto absolute inset-0 z-30 cursor-crosshair touch-none"
          onPointerDown={(event) => {
            event.preventDefault();
            pointerIdRef.current = event.pointerId;
            interactionRef.current?.setPointerCapture(event.pointerId);
            beginStroke(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current || pointerIdRef.current !== event.pointerId) {
              return;
            }
            event.preventDefault();
            appendPoint(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (pointerIdRef.current === event.pointerId) {
              interactionRef.current?.releasePointerCapture(event.pointerId);
            }
            endStroke();
          }}
          onPointerCancel={(event) => {
            if (pointerIdRef.current === event.pointerId) {
              interactionRef.current?.releasePointerCapture(event.pointerId);
            }
            endStroke();
          }}
          onLostPointerCapture={() => {
            endStroke();
          }}
        />

        {points.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm leading-6 text-[var(--muted)] sm:text-base xl:text-[1.02rem]">
            Draw one continuous line with your mouse or finger. Curves, coils, and zig-zags
            all change the match. The canvas is intentionally oversized for desktop sketching.
          </div>
        ) : null}
      </div>
    </div>
  );
}
