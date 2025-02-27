# Kindle Scrape Tools

This repository contains two Node.js scripts that help you capture Kindle book pages from Amazon's web reader and convert them into a PDF.

## Overview

- **Screenshot Script (`kindle-scrape.js`):**  
  Uses Puppeteer to launch a browser, load the [Amazon Kindle Reader](https://read.amazon.com), and capture screenshots of a book’s pages.

  - Supports session persistence (login cookies).
  - Waits for manual navigation before starting the capture.
  - Prompts for a book name and saves screenshots under `screenshots/{bookname}/page_x.png`.
  - Stops capturing when two consecutive screenshots are identical.

- **PDF Conversion Script (`screenshot-to-pdf.js`):**  
  Converts the captured screenshots into a PDF using pdf-lib.
  - Lists available book directories from the `screenshots` folder.
  - Provides an interactive menu (using arrow keys) to select a book (displays up to 5 at a time).
  - Sorts the screenshots numerically and generates a PDF.
  - Saves the PDF in the `ebooks` directory as `ebooks/{bookname}.pdf`.
  - Displays an ASCII progress bar showing the current page and total pages.

## Prerequisites

- [Node.js](https://nodejs.org/)
- npm packages:
  - `puppeteer`
  - `fs-extra`
  - `pdf-lib`
  - (Optional) `readline` (Node.js built-in module)

Install dependencies via:

```bash
npm i
```

### Usage

1.`npm run scrape`:

- If no session exists, you’ll be prompted to **log in** manually to Amazon Kindle Reader.
- Once logged in, **navigate** manually to the desired book and page (you probably want to start at the beginning 😅) and press Enter.
- When prompted, **enter a name** for the book. Screenshots will be saved to screenshots/{bookname}/.
- The script will capture pages until it detects no change between consecutive screenshots (ie the end of the book).
- Automatically run PDF conversion

2. (optionally) `npm run pdf`:

- Use the arrow keys (up/down) to navigate through the list of available book directories (**> indicates selected directory**) and press Enter to select one.
- The script reads and sorts the screenshots, then builds a PDF with a progress bar display.
- Output: The PDF is saved as ebooks/{bookname}.pdf.
