const { PDFDocument } = require("pdf-lib");
const fs = require("fs-extra");
const path = require("path");

// Interactive selection function using raw mode and arrow keys
async function selectDirectory(dirs) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let windowOffset = 0;
    const windowSize = 5;

    // Render only a window of directories, highlighting the selected one.
    function render() {
      console.clear();
      console.log(
        "Select a book directory (use Up/Down arrow keys, press Enter to select):\n"
      );
      // Ensure the selected index is within the window.
      if (selectedIndex < windowOffset) {
        windowOffset = selectedIndex;
      } else if (selectedIndex >= windowOffset + windowSize) {
        windowOffset = selectedIndex - windowSize + 1;
      }
      const windowDirs = dirs.slice(windowOffset, windowOffset + windowSize);
      windowDirs.forEach((dir, idx) => {
        const globalIndex = windowOffset + idx;
        if (globalIndex === selectedIndex) {
          console.log(`> ${dir}`);
        } else {
          console.log(`  ${dir}`);
        }
      });
    }

    // Handler for keypresses.
    function onData(data) {
      const key = data.toString();
      if (key === "\u001B[A") {
        // Up arrow
        if (selectedIndex > 0) {
          selectedIndex--;
          render();
        }
      } else if (key === "\u001B[B") {
        // Down arrow
        if (selectedIndex < dirs.length - 1) {
          selectedIndex++;
          render();
        }
      } else if (key === "\r" || key === "\n") {
        // Enter key
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        console.clear();
        resolve(dirs[selectedIndex]);
      }
    }

    if (typeof process.stdin.setRawMode !== 'function') {
      console.log("Interactive mode not supported, defaulting to first directory.");
      resolve(dirs[0]);
      return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
    render();
  });
}

(async () => {
  const BASE_DIR = "screenshots";

  // Read all subdirectories in the screenshots folder.
  const entries = await fs.readdir(BASE_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (dirs.length === 0) {
    console.error('No book directories found under "screenshots".');
    process.exit(1);
  }

  // Use the interactive menu to select a directory.
  const chosenBook = await selectDirectory(dirs);
  const BOOK_SCREENSHOT_DIR = path.join(BASE_DIR, chosenBook);

  // Ensure the ebooks directory exists
  const EBOOK_DIR = "ebooks";
  await fs.ensureDir(EBOOK_DIR);
  const OUTPUT_PDF = path.join(EBOOK_DIR, `${chosenBook}.pdf`);

  // Read and sort screenshot files numerically.
  const files = fs
    .readdirSync(BOOK_SCREENSHOT_DIR)
    .filter((file) => file.endsWith(".png"))
    .sort((a, b) => {
      const numA = Number(a.replace("page_", "").replace(".png", ""));
      const numB = Number(b.replace("page_", "").replace(".png", ""));
      return numA - numB;
    });

  if (files.length === 0) {
    console.error("No screenshots found in the directory.");
    process.exit(1);
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const imgPath = path.join(BOOK_SCREENSHOT_DIR, file);
    const imageBytes = await fs.readFile(imgPath);
    const image = await pdfDoc.embedPng(imageBytes);

    // Create a new PDF page using the image's dimensions.
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    console.log(`Added ${file} to PDF`);
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(OUTPUT_PDF, pdfBytes);
  console.log(`PDF saved as ${OUTPUT_PDF}`);
  process.exit(0);
})();