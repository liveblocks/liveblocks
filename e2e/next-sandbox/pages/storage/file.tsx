import { LiveFile, LiveList } from "@liveblocks/client";
import type { LiveFileData } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { useState } from "react";

import {
  getRoomFromUrl,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useFileUrl,
  useMutation,
  useSelf,
  useStorage,
  useSyncStatus,
  useUploadFile,
} = createRoomContext<never, { files: LiveList<LiveFile> }>(client);

// Above 5 MB the client switches from a single PUT to a multipart upload, so
// this is the only way to exercise that path from the browser.
const MULTIPART_THRESHOLD = 5 * 1024 * 1024;

function makeTextFile(): File {
  return new File([`hello from the sandbox at ${Date.now()}`], "hello.txt", {
    type: "text/plain",
  });
}

const SHAPES = [
  "rect",
  "circle",
  "triangle",
  "pentagon",
  "hexagon",
  "octagon",
] as const;

type Shape = (typeof SHAPES)[number];

const POLYGON_SIDES: Partial<Record<Shape, number>> = {
  triangle: 3,
  pentagon: 5,
  hexagon: 6,
  octagon: 8,
};

const SIZE = 120;

/** Corners of a regular n-gon, first one pointing straight up. */
function polygonPoints(
  sides: number,
  cx: number,
  cy: number,
  r: number
): string {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function shapeMarkup(
  shape: Shape,
  fill: string,
  cx: number,
  cy: number,
  r: number
): string {
  const sides = POLYGON_SIDES[shape];
  if (sides !== undefined) {
    return `<polygon points="${polygonPoints(sides, cx, cy, r)}" fill="${fill}"/>`; // prettier-ignore
  }
  if (shape === "circle") {
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="${fill}"/>`;
  }
  // Deliberately not square, so the rotation is actually visible
  const w = r * 1.6;
  const h = r;
  return `<rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>`; // prettier-ignore
}

function rotated(markup: string, degrees: number, cx: number, cy: number) {
  return `<g transform="rotate(${degrees} ${cx} ${cy})">${markup}</g>`;
}

/**
 * A random shape in a random colour at a random angle, so uploads are told
 * apart by their picture rather than by reading ids. The filename says which
 * shape it is, which is what matches a rendered image back to its row.
 *
 * It's an image because rendering it in an <img> is the one thing only a real
 * browser can prove: the signed URL is fetched with no Authorization header.
 */
function makeImageFile(): File {
  const shape = SHAPES[randomInt(SHAPES.length)];
  const hue = randomInt(360);
  const center = SIZE / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  ${rotated(shapeMarkup(shape, `hsl(${hue} 70% 55%)`, center, center, SIZE * 0.4), randomInt(360), center, center)}
</svg>`;

  return new File([svg], `${shape}-${hue}.svg`, { type: "image/svg+xml" });
}

const BIG_CANVAS = 2000;

/**
 * The same thing, but scaled up past the multipart threshold by scattering
 * thousands of shapes across a big canvas.
 *
 * Making it a real image rather than random bytes is the whole trick: SVG in
 * an <img> only renders if it is well-formed XML, so a part that arrives out
 * of order, twice, or not at all shows up as a broken image. A binary blob of
 * the right total length would look perfectly fine.
 */
function makeBigImageFile(): File {
  const chunks = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BIG_CANVAS}" height="${BIG_CANVAS}">`,
    `<rect width="${BIG_CANVAS}" height="${BIG_CANVAS}" fill="#0b1021"/>`,
  ];

  // Everything emitted here is ASCII, so string length is byte length.
  let size = chunks[0].length + chunks[1].length;
  let shapes = 0;

  while (size < MULTIPART_THRESHOLD + 1024 * 1024) {
    const cx = randomInt(BIG_CANVAS);
    const cy = randomInt(BIG_CANVAS);
    const chunk = rotated(
      shapeMarkup(
        SHAPES[randomInt(SHAPES.length)],
        `hsl(${randomInt(360)} 70% 55%)`,
        cx,
        cy,
        12 + randomInt(48)
      ),
      randomInt(360),
      cx,
      cy
    );

    chunks.push(chunk);
    size += chunk.length;
    shapes++;
  }
  chunks.push("</svg>");

  return new File(chunks, `big-${shapes}-shapes.svg`, {
    type: "image/svg+xml",
  });
}

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{ files: new LiveList([]) }}
    >
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const renderCount = useRenderCount();
  const files = useStorage((root) => root.files);
  const me = useSelf();
  const syncStatus = useSyncStatus();
  const uploadFile = useUploadFile();

  const [status, setStatus] = useState<string>("idle");

  const addFile = useMutation(({ storage }, file: LiveFile) => {
    storage.get("files").push(file);
  }, []);

  const clear = useMutation(({ storage }) => {
    storage.get("files").clear();
  }, []);

  async function upload(file: File) {
    setStatus(`uploading ${file.name} (${file.size} bytes)…`);
    try {
      const started = Date.now();
      const liveFile = await uploadFile(file);
      addFile(liveFile);
      setStatus(`uploaded ${liveFile.name} in ${Date.now() - started}ms`);
    } catch (err) {
      setStatus(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Reference a file whose bytes were never uploaded. The server must refuse
   * the op; outside production the client throws when it sees the rejection,
   * so expect a red error in the console rather than a new row.
   */
  function referenceGhost() {
    setStatus("referencing a file that was never uploaded…");
    addFile(
      new LiveFile({
        id: `fl_${"0".repeat(21)}`,
        name: "ghost.txt",
        size: 1,
        mimeType: "text/plain",
      })
    );
  }

  if (files === null || me === null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveFile
      </h3>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="upload-text"
          onClick={() => void upload(makeTextFile())}
          subtitle="small, single PUT"
        >
          Upload text
        </Button>

        <Button
          id="upload-image"
          onClick={() => void upload(makeImageFile())}
          subtitle="renders below"
        >
          Upload image
        </Button>

        <Button
          id="upload-big"
          onClick={() => void upload(makeBigImageFile())}
          subtitle="6 MB SVG, multipart"
        >
          Upload big
        </Button>

        <Button
          id="reference-ghost"
          onClick={referenceGhost}
          subtitle="server should reject"
        >
          Reference ghost
        </Button>

        <Button id="clear" enabled={files.length > 0} onClick={clear}>
          Clear
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
          <Row id="uploadStatus" name="Upload status" value={status} />
          <Row id="fileCount" name="Number of files" value={files.length} />
          <Row id="files" name="Serialized" value={files} />
        </tbody>
      </table>

      {files.map((file) => (
        <FileRow key={file.id} file={file} />
      ))}
    </div>
  );
}

function FileRow({ file }: { file: LiveFileData }) {
  const { url, error, isLoading } = useFileUrl(file);

  return (
    <div style={{ borderTop: "1px solid #ddd", padding: "8px 0" }}>
      <table style={styles.dataTable}>
        <tbody>
          <Row id={`file-${file.id}`} name={file.name} value={file} />
          <Row
            id={`url-${file.id}`}
            name="URL"
            value={isLoading ? "(loading)" : (error?.message ?? url)}
          />
        </tbody>
      </table>

      {url && file.mimeType.startsWith("image/") ? (
        // Fetched by the browser with no Authorization header, which is the
        // whole point of the URL being signed.
        <img
          src={url}
          alt={file.name}
          style={{ marginTop: 4, maxWidth: 400, border: "1px solid #ddd" }}
        />
      ) : null}

      {url && !file.mimeType.startsWith("image/") ? (
        <a href={url} target="_blank" rel="noreferrer">
          download {file.name}
        </a>
      ) : null}
    </div>
  );
}
