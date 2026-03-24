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
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "photo-shape-dataset.generated.json"
MANIFEST_PATH = PROJECT_ROOT / "src" / "data" / "photo-shape-manifest.generated.json"
MAX_DIMENSION = 256
MIN_AREA_RATIO = 0.01
WORKER_COUNT = max((os.cpu_count() or 4) - 1, 1)
TARGET_LINE_POINTS = 72
TARGET_POLYGON_POINTS = 96


@dataclass
class ExtractionResult:
    width: int
    height: int
    usable: bool
    quality_score: float
    extraction_notes: list[str]
    features: dict[str, object]
    silhouette_polygon: list[dict[str, float]]
    line_points: list[dict[str, float]]
    line_features: dict[str, float | list[float]]
    line_quality_score: float
    line_usable: bool


def log_hu_moments(hu: np.ndarray) -> list[float]:
    values: list[float] = []
    for value in hu.flatten():
        if not np.isfinite(value) or value == 0:
            values.append(0.0)
        else:
            values.append(float(-math.copysign(1.0, value) * math.log10(abs(float(value)))))
    return values


def point_dicts(points: list[tuple[float, float]]) -> list[dict[str, float]]:
    return [{"x": round(float(x), 6), "y": round(float(y), 6)} for x, y in points]


def resample_polyline(points: list[tuple[float, float]], target_count: int) -> list[tuple[float, float]]:
    if not points:
        return []
    if len(points) == 1:
        return [points[0]] * target_count

    cumulative = [0.0]
    for index in range(1, len(points)):
        prev_x, prev_y = points[index - 1]
        curr_x, curr_y = points[index]
        cumulative.append(cumulative[-1] + math.hypot(curr_x - prev_x, curr_y - prev_y))

    total = cumulative[-1]
    if total == 0:
        return [points[0]] * target_count

    interval = total / max(target_count - 1, 1)
    result = [points[0]]
    target_distance = interval
    segment_index = 1

    while segment_index < len(points) and len(result) < target_count - 1:
        prev_distance = cumulative[segment_index - 1]
        curr_distance = cumulative[segment_index]
        if curr_distance >= target_distance:
            ratio = (target_distance - prev_distance) / max(curr_distance - prev_distance, 1e-9)
            ax, ay = points[segment_index - 1]
            bx, by = points[segment_index]
            result.append((ax + (bx - ax) * ratio, ay + (by - ay) * ratio))
            target_distance += interval
        else:
            segment_index += 1

    result.append(points[-1])
    while len(result) < target_count:
        result.append(points[-1])
    return result


def normalize_polyline(points: list[tuple[float, float]], target_count: int = TARGET_LINE_POINTS) -> list[tuple[float, float]]:
    resampled = resample_polyline(points, target_count)
    if not resampled:
        return []

    xs = [x for x, _ in resampled]
    ys = [y for _, y in resampled]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    center_x = min_x + (max_x - min_x) / 2
    center_y = min_y + (max_y - min_y) / 2
    translated = [(x - center_x, y - center_y) for x, y in resampled]

    start_x, start_y = translated[0]
    end_x, end_y = translated[-1]
    angle = math.atan2(end_y - start_y, end_x - start_x)
    cos_theta = math.cos(-angle)
    sin_theta = math.sin(-angle)

    aligned = [
        (
            x * cos_theta - y * sin_theta,
            x * sin_theta + y * cos_theta,
        )
        for x, y in translated
    ]

    aligned_xs = [x for x, _ in aligned]
    aligned_ys = [y for _, y in aligned]
    scale = max(max(aligned_xs) - min(aligned_xs), max(aligned_ys) - min(aligned_ys), 1.0)
    return [(x / scale, y / scale) for x, y in aligned]


def standard_deviation(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    avg = sum(values) / len(values)
    variance = sum((value - avg) ** 2 for value in values) / len(values)
    return math.sqrt(variance)


def extract_line_features(points: list[tuple[float, float]]) -> dict[str, float]:
    if len(points) < 3:
        return {
            "pathLength": 0.0,
            "aspectRatio": 1.0,
            "curvature": 0.0,
            "turnVariance": 0.0,
            "waviness": 0.0,
        }

    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    width = max(xs) - min(xs)
    height = max(ys) - min(ys)
    path_length = 0.0
    turning_angles: list[float] = []
    y_deltas: list[float] = []

    for index in range(1, len(points)):
        ax, ay = points[index - 1]
        bx, by = points[index]
        path_length += math.hypot(bx - ax, by - ay)

    for index in range(1, len(points) - 1):
        px, py = points[index - 1]
        cx, cy = points[index]
        nx, ny = points[index + 1]
        angle_a = math.atan2(cy - py, cx - px)
        angle_b = math.atan2(ny - cy, nx - cx)
        delta = math.atan2(math.sin(angle_b - angle_a), math.cos(angle_b - angle_a))
        turning_angles.append(abs(delta))
        y_deltas.append(ny - cy)

    sign_changes = 0
    previous_sign = 0
    for value in y_deltas:
        sign = 1 if value > 0 else -1 if value < 0 else 0
        if sign != 0 and previous_sign != 0 and sign != previous_sign:
            sign_changes += 1
        if sign != 0:
            previous_sign = sign

    curvature = sum(turning_angles) / (math.pi * max(len(turning_angles), 1))
    return {
        "pathLength": round(min(path_length, 4.0), 6),
        "aspectRatio": round(min(max(width / max(height, 1e-4), 0.5), 8.0), 6),
        "curvature": round(min(max(curvature, 0.0), 1.0), 6),
        "turnVariance": round(min(max(standard_deviation(turning_angles) / math.pi, 0.0), 1.0), 6),
        "waviness": round(min(max(sign_changes / max(len(y_deltas), 1), 0.0), 1.0), 6),
    }


def normalize_polygon(contour: np.ndarray, target_count: int = TARGET_POLYGON_POINTS) -> list[tuple[float, float]]:
    points = [(float(point[0][0]), float(point[0][1])) for point in contour]
    if not points:
        return []

    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max(max_x - min_x, 1.0)
    height = max(max_y - min_y, 1.0)

    normalized = [((x - min_x) / width, (y - min_y) / height) for x, y in points]
    return resample_polyline(normalized + [normalized[0]], target_count)


def extract_centerline_points(component_mask: np.ndarray) -> tuple[list[tuple[float, float]], float, list[str]]:
    coords = np.column_stack(np.where(component_mask > 0))
    if len(coords) < 24:
        return [], 0.0, ["line-too-small"]

    coords_xy = np.column_stack((coords[:, 1], coords[:, 0])).astype(np.float32)
    mean = coords_xy.mean(axis=0)
    centered = coords_xy - mean
    covariance = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    principal = eigenvectors[:, int(np.argmax(eigenvalues))]
    angle = math.atan2(float(principal[1]), float(principal[0]))

    cos_theta = math.cos(-angle)
    sin_theta = math.sin(-angle)
    rotated = np.empty_like(coords_xy)
    rotated[:, 0] = centered[:, 0] * cos_theta - centered[:, 1] * sin_theta
    rotated[:, 1] = centered[:, 0] * sin_theta + centered[:, 1] * cos_theta

    bins: dict[int, list[float]] = {}
    for x_value, y_value in rotated:
        bins.setdefault(int(round(float(x_value))), []).append(float(y_value))

    ordered_x = sorted(bins.keys())
    if len(ordered_x) < 18:
        return [], 0.0, ["line-too-short"]

    raw_points = []
    for x_value in ordered_x:
        y_values = bins[x_value]
        raw_points.append((float(x_value), (min(y_values) + max(y_values)) / 2))

    smoothed_points = []
    window = 4
    for index, (x_value, _) in enumerate(raw_points):
        slice_start = max(index - window, 0)
        slice_end = min(index + window + 1, len(raw_points))
        sample = raw_points[slice_start:slice_end]
        smoothed_points.append((x_value, sum(y for _, y in sample) / len(sample)))

    cos_back = math.cos(angle)
    sin_back = math.sin(angle)
    restored = []
    for x_value, y_value in smoothed_points:
        rotated_x = x_value * cos_back - y_value * sin_back + float(mean[0])
        rotated_y = x_value * sin_back + y_value * cos_back + float(mean[1])
        restored.append((rotated_x, rotated_y))

    normalized_line = normalize_polyline(restored, TARGET_LINE_POINTS)
    coverage = len(ordered_x) / max(max(ordered_x) - min(ordered_x) + 1, 1)
    span_x = max(point[0] for point in normalized_line) - min(point[0] for point in normalized_line)
    span_y = max(point[1] for point in normalized_line) - min(point[1] for point in normalized_line)
    elongation = span_x / max(span_y, 1e-4)
    quality = min(max(coverage * 0.7 + min(elongation / 4.0, 1.0) * 0.3, 0.0), 1.0)

    notes: list[str] = []
    if coverage < 0.32:
        notes.append("line-sparse")
    if elongation < 1.1:
        notes.append("line-weak-elongation")

    return normalized_line, round(float(quality), 6), notes


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
            silhouette_polygon=[],
            line_points=[],
            line_features=extract_line_features([]),
            line_quality_score=0.0,
            line_usable=False,
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
            "silhouettePolygon": result.silhouette_polygon,
            "linePoints": result.line_points,
            "lineFeatures": result.line_features,
            "lineQualityScore": result.line_quality_score,
            "lineUsable": result.line_usable,
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
            silhouette_polygon=[],
            line_points=[],
            line_features=extract_line_features([]),
            line_quality_score=0.0,
            line_usable=False,
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
            "silhouettePolygon": result.silhouette_polygon,
            "linePoints": result.line_points,
            "lineFeatures": result.line_features,
            "lineQualityScore": result.line_quality_score,
            "lineUsable": result.line_usable,
        }

    contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour = max(contours, key=cv2.contourArea)
    quality_score, contour_notes = score_contour(contour, component_mask.shape)
    all_notes = list(dict.fromkeys(notes + contour_notes))
    features = extract_features(component_mask)
    line_points, line_quality_score, line_notes = extract_centerline_points(component_mask)
    all_notes = list(dict.fromkeys(all_notes + line_notes))
    usable = (
        quality_score >= 0.55
        and "tiny-component" not in all_notes
        and "oversized-component" not in all_notes
        and "touches-border" not in all_notes
        and features["fillRatio"] < 0.82
        and features["compactness"] < 0.42
    )
    line_usable = usable and line_quality_score >= 0.42 and len(line_points) >= 24

    result = ExtractionResult(
        width=width,
        height=height,
        usable=usable,
        quality_score=round(quality_score, 6),
        extraction_notes=all_notes,
        features=features,
        silhouette_polygon=point_dicts(normalize_polygon(contour)),
        line_points=point_dicts(line_points),
        line_features=extract_line_features(line_points),
        line_quality_score=line_quality_score,
        line_usable=line_usable,
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
        "silhouettePolygon": result.silhouette_polygon,
        "linePoints": result.line_points,
        "lineFeatures": result.line_features,
        "lineQualityScore": result.line_quality_score,
        "lineUsable": result.line_usable,
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

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(dataset, separators=(",", ":")), encoding="utf-8")
    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "generatedAt": dataset["generatedAt"],
                "totalImages": dataset["totalImages"],
                "usableImages": dataset["usableImages"],
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(
        f"[photo-shapes] wrote {len(records)} records to {OUTPUT_PATH} "
        f"({dataset['usableImages']} usable)"
    )


if __name__ == "__main__":
    main()
