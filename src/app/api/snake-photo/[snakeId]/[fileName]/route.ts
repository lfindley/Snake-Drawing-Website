import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const projectRoot = resolve(/* turbopackIgnore: true */ process.cwd());
const rawImageRoot = join(projectRoot, /* turbopackIgnore: true */ "Snake images");

function contentType(extension: string) {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ snakeId: string; fileName: string }> },
) {
  const { snakeId, fileName } = await context.params;
  const absolutePath = normalize(join(/* turbopackIgnore: true */ rawImageRoot, snakeId, fileName));

  if (!absolutePath.startsWith(rawImageRoot)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(absolutePath);

    return new Response(file, {
      headers: {
        "Content-Type": contentType(extname(fileName)),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
