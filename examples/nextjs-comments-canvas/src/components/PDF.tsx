"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import "./PDF.css";

import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

const resizeObserverOptions = {};

const maxWidth = 800;

type PDFFile = string | File | null;

export default function Sample() {
  const [file, setFile] = useState<PDFFile>("./sample.pdf");
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCanvasClick = useCallback((event: MouseEvent) => {
    console.log("event", event);
    console.log("canvasRef", canvasRef.current);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log(`Click position: (${x}, ${y})`);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      console.log("canvas", canvas);
      canvas.addEventListener("click", console.log);
      return () => canvas.removeEventListener("click", handleCanvasClick);
    }
  }, [handleCanvasClick]);

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { files } = event.target;

    const nextFile = files?.[0];

    if (nextFile) {
      setFile(nextFile);
    }
  }

  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
  }

  return (
    // <div className="Example">
    <div className="Example__container">
      <div className="Example__container__load">
        <label htmlFor="file">Load from file:</label>{" "}
        <input onChange={onFileChange} type="file" />
      </div>
      <div className="Example__container__document" ref={setContainerRef}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          options={options}
          // onClick={console.log}
        >
          {/* {Array.from(new Array(numPages), (_el, index) => ( */}
          <Page
            canvasRef={canvasRef}
            // onClick={console.log}
            key={`page_${1}`}
            pageNumber={1}
            width={
              containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth
            }
          />
          {/* ))} */}
        </Document>
      </div>
    </div>
    // </div>
  );
}
