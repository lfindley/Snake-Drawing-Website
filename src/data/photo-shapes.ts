import dataset from "@/data/photo-shape-dataset.generated.json";
import type { PhotoShapeDataset, PhotoShapeRecord } from "@/lib/types";

export const photoShapeDataset = dataset as PhotoShapeDataset;

export const photoShapeRecords: PhotoShapeRecord[] = photoShapeDataset.records;

export const usablePhotoShapeRecords = photoShapeRecords.filter((record) => record.usable);
