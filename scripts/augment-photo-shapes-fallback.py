from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = PROJECT_ROOT / "Snake images"
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "photo-shape-dataset.generated.json"
MANIFEST_PATH = PROJECT_ROOT / "src" / "data" / "photo-shape-manifest.generated.json"
MAX_DIMENSION = 256
TARGET_POLYGON_POINTS = 96


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


def smooth_mask(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask.astype(np.uint8), 1)
    neighbor_sum = np.zeros_like(mask, dtype=np.uint8)

    for offset_y in range(3):
        for offset_x in range(3):
            neighbor_sum += padded[offset_y : offset_y + mask.shape[0], offset_x : offset_x + mask.shape[1]]

    return neighbor_sum >= 5


def otsu_threshold(gray: np.ndarray) -> int:
    histogram = np.bincount(gray.reshape(-1), minlength=256)
    total = gray.size
    weighted_total = int(np.dot(np.arange(256), histogram))
    sum_background = 0
    weight_background = 0
    best_threshold = 127
    best_variance = -1.0

    for threshold in range(256):
        weight_background += int(histogram[threshold])
        if weight_background == 0:
            continue

        weight_foreground = total - weight_background
        if weight_foreground == 0:
            break

        sum_background += threshold * int(histogram[threshold])
        mean_background = sum_background / weight_background
        mean_foreground = (weighted_total - sum_background) / weight_foreground
        between_variance = weight_background * weight_foreground * (mean_background - mean_foreground) ** 2

        if between_variance > best_variance:
            best_variance = between_variance
            best_threshold = threshold

    return best_threshold


def score_mask(mask: np.ndarray) -> tuple[float, dict[str, float] | None]:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0 or len(ys) == 0:
        return 0.0, None

    image_height, image_width = mask.shape
    min_x, max_x = int(xs.min()), int(xs.max())
    min_y, max_y = int(ys.min()), int(ys.max())
    width = max_x - min_x + 1
    height = max_y - min_y + 1
    area = int(mask.sum())
    image_area = image_height * image_width
    area_ratio = area / max(image_area, 1)
    aspect_ratio = max(width, height) / max(min(width, height), 1)
    centroid_x = float(xs.mean())
    centroid_y = float(ys.mean())
    center_distance = math.hypot(
        centroid_x - image_width / 2,
        centroid_y - image_height / 2,
    ) / max(math.hypot(image_width / 2, image_height / 2), 1)
    centrality = max(0.0, 1.0 - center_distance)
    touches_border = min_x <= 1 or min_y <= 1 or max_x >= image_width - 2 or max_y >= image_height - 2
    size_score = max(0.0, 1.0 - abs(area_ratio - 0.12) / 0.12)

    score = size_score * 1.1 + min(aspect_ratio / 6.0, 1.0) * 1.0 + centrality * 0.7
    if touches_border:
        score -= 0.35
    if area_ratio > 0.42:
        score -= 0.5

    return score, {
        "x": round(min_x / max(image_width, 1), 6),
        "y": round(min_y / max(image_height, 1), 6),
        "width": round(width / max(image_width, 1), 6),
        "height": round(height / max(image_height, 1), 6),
    }


def detect_subject_bounds(image_path: Path) -> dict[str, float]:
    with Image.open(image_path) as image:
        image = image.convert("RGB")
        width, height = image.size
        max_dimension = max(width, height)
        if max_dimension > MAX_DIMENSION:
            scale = MAX_DIMENSION / max_dimension
            image = image.resize((max(int(width * scale), 1), max(int(height * scale), 1)), Image.Resampling.LANCZOS)

        gray = np.asarray(image.convert("L"), dtype=np.uint8)

    threshold = otsu_threshold(gray)
    dark_mask = smooth_mask(gray < threshold)
    light_mask = smooth_mask(gray > threshold)
    scored = [score_mask(dark_mask), score_mask(light_mask)]
    best_score, best_bounds = max(scored, key=lambda item: item[0])

    if best_bounds is None or best_score <= 0:
        return {"x": 0.0, "y": 0.0, "width": 1.0, "height": 1.0}

    return best_bounds


def build_match_polygon(display_polygon: list[dict[str, float]]) -> list[dict[str, float]]:
    if len(display_polygon) < 3:
        return []

    points = [(float(point["x"]), float(point["y"])) for point in display_polygon]
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    center_x = min(xs) + (max(xs) - min(xs)) / 2
    center_y = min(ys) + (max(ys) - min(ys)) / 2
    centered = np.asarray([(x - center_x, y - center_y) for x, y in points], dtype=np.float32)

    covariance = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    principal = eigenvectors[:, int(np.argmax(eigenvalues))]
    angle = math.atan2(float(principal[1]), float(principal[0]))
    cos_theta = math.cos(-angle)
    sin_theta = math.sin(-angle)

    rotated = [
        (
            x * cos_theta - y * sin_theta,
            x * sin_theta + y * cos_theta,
        )
        for x, y in centered
    ]

    rotated_xs = [x for x, _ in rotated]
    rotated_ys = [y for _, y in rotated]
    scale = max(max(rotated_xs) - min(rotated_xs), max(rotated_ys) - min(rotated_ys), 1e-6)
    normalized = [(x / scale, y / scale) for x, y in rotated]

    return point_dicts(resample_polyline(normalized + [normalized[0]], TARGET_POLYGON_POINTS))


def main() -> None:
    dataset = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    updated_records: list[dict[str, object]] = []

    for record in dataset["records"]:
        display_polygon = record.get("silhouettePolygon", [])
        record["matchSilhouettePolygon"] = build_match_polygon(display_polygon)

        if record.get("usable"):
            image_path = RAW_ROOT / str(record["snakeId"]) / str(record["fileName"])
            record["subjectBounds"] = detect_subject_bounds(image_path)
        else:
            record["subjectBounds"] = {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0}

        updated_records.append(record)

    dataset["generatedAt"] = datetime.now(timezone.utc).isoformat()
    dataset["records"] = updated_records

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
    print(f"[photo-shapes-fallback] updated {len(updated_records)} records")


if __name__ == "__main__":
    main()
