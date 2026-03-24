import manifest from "@/data/photo-shape-manifest.generated.json";
import type { PhotoShapeDataset, PhotoShapeRecord } from "@/lib/types";

export const photoShapeManifest = manifest as Omit<PhotoShapeDataset, "records">;

let cachedPhotoRecords: PhotoShapeRecord[] | null = null;

export async function loadUsablePhotoShapeRecords() {
  if (cachedPhotoRecords) {
    return cachedPhotoRecords;
  }

  const response = await fetch("/data/photo-shape-dataset.generated.json");
  if (!response.ok) {
    throw new Error(`Unable to load photo shape dataset: ${response.status}`);
  }

  const dataset = (await response.json()) as PhotoShapeDataset;
  cachedPhotoRecords = dataset.records.filter((record) => record.usable);
  return cachedPhotoRecords;
}
