from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = PROJECT_ROOT / "Snake images"
OUTPUT_PATH = PROJECT_ROOT / "src" / "data" / "photo-shape-dataset.generated.json"
MAX_DIMENSION = 256
MIN_AREA_RATIO = 0.01
WORKER_COUNT = max((os.cpu_count() or 4) - 1, 1)


@dataclass
class ExtractionResult:
    width: int
    height: int
    usable: bool
    quality_score: float
    extraction_notes: list[str]
    features: dict[str, object]


def log_hu_moments(hu: np.ndarray) -> list[float]:
    values: list[float] = []
    for value in hu.flatten():
        if not np.isfinite(value) or value == 0:
            values.append(0.0)
        else:
            values.append(float(-math.copysign(1.0, value) * math.log10(abs(float(value)))))
    return values


def resize_for_processing(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    max_dimension = max(height, width)
    if max_dimension <= MAX_DIMENSION:
        return image

    scale = MAX_DIMENSION / max_dimension
    return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)


def score_contour(contour: np.ndarray, image_shape: tuple[int, int]) -> tuple[float, list[str]]:
    image_height, image_width = image_shape
    area = cv2.contourArea(contour)
    image_area = image_height * image_width
    x, y, width, height = cv2.boundingRect(contour)
    aspect_ratio = max(width, height) / max(min(width, height), 1)
    area_ratio = area / max(image_area, 1)

    moments = cv2.moments(contour)
    if moments["m00"] == 0:
        centroid_x = x + width / 2
        centroid_y = y + height / 2
    else:
        centroid_x = moments["m10"] / moments["m00"]
        centroid_y = moments["m01"] / moments["m00"]

    center_distance = math.hypot(
        centroid_x - image_width / 2,
        centroid_y - image_height / 2,
    ) / max(math.hypot(image_width / 2, image_height / 2), 1)
    centrality = max(0.0, 1.0 - center_distance)
    touches_border = x <= 1 or y <= 1 or x + width >= image_width - 1 or y + height >= image_height - 1
    size_score = max(0.0, 1.0 - abs(area_ratio - 0.12) / 0.12)

    notes: list[str] = []
    if area_ratio < MIN_AREA_RATIO:
        notes.append("tiny-component")
    if area_ratio > 0.42:
        notes.append("oversized-component")
    if aspect_ratio < 1.25:
        notes.append("weak-elongation")
    if centrality < 0.35:
        notes.append("off-center")
    if touches_border:
        notes.append("touches-border")

    score = size_score * 1.1 + min(aspect_ratio / 6.0, 1.0) * 1.0 + centrality * 0.7
    if touches_border:
        score -= 0.35
    if area_ratio > 0.42:
        score -= 0.5
    return score, notes


def choose_best_component(binary_mask: np.ndarray) -> tuple[np.ndarray | None, float, list[str]]:
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, 0.0, ["no-contours"]

    best_contour = None
    best_score = -1.0
    best_notes: list[str] = []

    for contour in contours:
        score, contour_notes = score_contour(contour, binary_mask.shape)
        if score > best_score:
            best_score = score
            best_contour = contour
            best_notes = contour_notes

    if best_contour is None:
        return None, 0.0, ["no-best-contour"]

    component_mask = np.zeros_like(binary_mask)
    cv2.drawContours(component_mask, [best_contour], -1, 255, thickness=cv2.FILLED)
    return component_mask, best_score, best_notes


def quick_component_mask(working: np.ndarray) -> tuple[np.ndarray | None, float, list[str]]:
    gray = cv2.cvtColor(working, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, dark_foreground = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, light_foreground = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel = np.ones((5, 5), np.uint8)
    candidates: list[tuple[np.ndarray | None, float, list[str]]] = []
    for variant in (dark_foreground, light_foreground):
        cleaned = cv2.morphologyEx(variant, cv2.MORPH_CLOSE, kernel, iterations=1)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=1)
        component_mask, score, notes = choose_best_component(cleaned)
        candidates.append((component_mask, score, notes))

    return max(candidates, key=lambda entry: entry[1])


def grabcut_component_mask(working: np.ndarray) -> tuple[np.ndarray | None, float, list[str]]:
    notes: list[str] = []
    height, width = working.shape[:2]
    mask = np.zeros(working.shape[:2], np.uint8)
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)

    inset_x = max(int(width * 0.06), 1)
    inset_y = max(int(height * 0.06), 1)
    rect = (inset_x, inset_y, max(width - inset_x * 2, 1), max(height - inset_y * 2, 1))

    try:
        cv2.grabCut(working, mask, rect, background_model, foreground_model, 1, cv2.GC_INIT_WITH_RECT)
        foreground = np.where(
            (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
            255,
            0,
        ).astype("uint8")
    except cv2.error:
        return None, 0.0, ["grabcut-failed"]

    kernel = np.ones((5, 5), np.uint8)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, kernel, iterations=1)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, kernel, iterations=1)
    component_mask, score, contour_notes = choose_best_component(foreground)
    return component_mask, score, notes + contour_notes


def build_component_mask(image: np.ndarray) -> tuple[np.ndarray | None, list[str]]:
    working = resize_for_processing(image)
    quick_mask, quick_score, quick_notes = quick_component_mask(working)
    if quick_mask is not None and quick_score >= 0.24 and "tiny-component" not in quick_notes:
        return quick_mask, quick_notes

    fallback_mask, fallback_score, fallback_notes = grabcut_component_mask(working)
    if fallback_mask is not None and fallback_score >= quick_score:
        return fallback_mask, ["used-grabcut"] + fallback_notes

    return quick_mask, quick_notes


def extract_features(component_mask: np.ndarray) -> dict[str, object]:
    contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour = max(contours, key=cv2.contourArea)

    x, y, width, height = cv2.boundingRect(contour)
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    bbox_area = max(width * height, 1)
    moments = cv2.moments(contour)
    hu = cv2.HuMoments(moments)

    return {
        "aspectRatio": round(max(width / max(height, 1), 0.25), 6),
        "fillRatio": round(min(area / bbox_area, 1.0), 6),
        "compactness": round(min((4 * math.pi * area) / max(perimeter * perimeter, 1.0), 1.0), 6),
        "huMoments": [round(value, 6) for value in log_hu_moments(hu)],
    }


def extract_record(image_path_str: str) -> dict[str, object]:
    image_path = Path(image_path_str)
    image = cv2.imread(str(image_path))
    if image is None:
        result = ExtractionResult(
            width=0,
            height=0,
            usable=False,
            quality_score=0.0,
            extraction_notes=["unreadable-image"],
            features={
                "aspectRatio": 1.0,
                "fillRatio": 0.0,
                "compactness": 0.0,
                "huMoments": [0.0] * 7,
            },
        )
        return {
            "id": f"{image_path.parent.name}/{image_path.name}",
            "snakeId": image_path.parent.name,
            "fileName": image_path.name,
            "imagePath": f"/api/snake-photo/{image_path.parent.name}/{image_path.name}",
            "width": result.width,
            "height": result.height,
            "usable": result.usable,
            "qualityScore": result.quality_score,
            "extractionNotes": result.extraction_notes,
            "features": result.features,
        }

    height, width = image.shape[:2]
    component_mask, notes = build_component_mask(image)

    if component_mask is None:
        result = ExtractionResult(
            width=width,
            height=height,
            usable=False,
            quality_score=0.0,
            extraction_notes=notes,
            features={
                "aspectRatio": 1.0,
                "fillRatio": 0.0,
                "compactness": 0.0,
                "huMoments": [0.0] * 7,
            },
        )
        return {
            "id": f"{image_path.parent.name}/{image_path.name}",
            "snakeId": image_path.parent.name,
            "fileName": image_path.name,
            "imagePath": f"/api/snake-photo/{image_path.parent.name}/{image_path.name}",
            "width": result.width,
            "height": result.height,
            "usable": result.usable,
            "qualityScore": result.quality_score,
            "extractionNotes": result.extraction_notes,
            "features": result.features,
        }

    contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour = max(contours, key=cv2.contourArea)
    quality_score, contour_notes = score_contour(contour, component_mask.shape)
    all_notes = list(dict.fromkeys(notes + contour_notes))
    features = extract_features(component_mask)
    usable = (
        quality_score >= 0.55
        and "tiny-component" not in all_notes
        and "oversized-component" not in all_notes
        and "touches-border" not in all_notes
        and features["fillRatio"] < 0.82
        and features["compactness"] < 0.42
    )

    result = ExtractionResult(
        width=width,
        height=height,
        usable=usable,
        quality_score=round(quality_score, 6),
        extraction_notes=all_notes,
        features=features,
    )
    return {
        "id": f"{image_path.parent.name}/{image_path.name}",
        "snakeId": image_path.parent.name,
        "fileName": image_path.name,
        "imagePath": f"/api/snake-photo/{image_path.parent.name}/{image_path.name}",
        "width": result.width,
        "height": result.height,
        "usable": result.usable,
        "qualityScore": result.quality_score,
        "extractionNotes": result.extraction_notes,
        "features": result.features,
    }


def main() -> None:
    image_paths = [
        str(image_path)
        for species_dir in sorted(path for path in RAW_ROOT.iterdir() if path.is_dir())
        for image_path in sorted(species_dir.glob("*.jpg"))
    ]

    with ProcessPoolExecutor(max_workers=WORKER_COUNT) as executor:
        records = list(executor.map(extract_record, image_paths, chunksize=16))

    dataset = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalImages": len(records),
        "usableImages": sum(1 for record in records if record["usable"]),
        "records": records,
    }

    OUTPUT_PATH.write_text(json.dumps(dataset, separators=(",", ":")), encoding="utf-8")
    print(
        f"[photo-shapes] wrote {len(records)} records to {OUTPUT_PATH} "
        f"({dataset['usableImages']} usable)"
    )


if __name__ == "__main__":
    main()
