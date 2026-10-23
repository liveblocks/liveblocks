# PPTX export

Download the whole deck as a PowerPoint file, one image per slide.

## Exporting

- "Download .pptx" in the header renders every slide of the shared deck
  off-screen, snapshots each one as a 16:9 image and saves `slides.pptx`.
- While the export runs the button shows a spinner and ignores further clicks.
- A slide with no HTML yet is exported as the starter slide.
- An empty deck can't be exported.
- Slides that load fonts or images from the network export whatever has loaded
  by the time the snapshot is taken.
- Known bug (pinned by the e2e test, not fixed): the first click after a cold
  page load can silently produce no file, because the off-screen frame reports
  itself loaded before the slide HTML is parsed. A second click works.

## Files

- `index.ts`: public surface
- `export-pptx.ts`: renders each slide off-screen and builds the `.pptx`
- `export-pptx-button.tsx`: the header button with its busy state
- `tests/export-pptx.test.ts`: refuses an empty deck; one image per slide, 16:9
  layout, `slides.pptx`, frames cleaned up
- `tests/pptx-export.spec.ts`: clicking the button downloads `slides.pptx`
  (retrying the click, see the known bug)
