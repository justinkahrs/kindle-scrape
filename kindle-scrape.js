/*
  ADVANCED OPTION:
  This sample script uses puppeteer-core and the Electron executable path to embed
  the Amazon Reader inside the same Electron environment. So you won't see a separate
  Chromium window spawn, instead the scraping runs in the same browser instance
  that Electron uses.

  Requirements:
    1) npm i puppeteer-core
    2) The electron-main.js must pass the executable path of Electron’s Chromium
       to this script. For simplicity, we read an environment variable.

  If you want to remain with your original approach (Option A),
  skip rewriting this file. This rewrite is purely for demonstration.
*/
const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");
const { updateProgress } = require("./progressBar");
const puppeteer = require("puppeteer-core");

// Helper function for prompting user input from CLI (fallback if no argument).
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

const AMAZON_KINDLE_URL = "https://read.amazon.com";
const BASE_SCREENSHOT_DIR = "screenshots";
const SESSION_DIR = "session";
const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 1400;

(async () => {
  // Ensure session folder exists
  await fs.ensureDir(SESSION_DIR);

  // We read the executable path from an environment variable
  // set by electron-main.js for advanced usage.
  const executablePath = process.env.ELECTRON_BROWSER_PATH;
  if (!executablePath) {
    console.error("No ELECTRON_BROWSER_PATH set. Using a default fallback...");
  }

  // Launch puppeteer-core using the Electron browser
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath || undefined, // fallback to system if not provided
    args: [
      `--user-data-dir=${SESSION_DIR}`,
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`
    ],
    defaultViewport: {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();
  await page.goto(AMAZON_KINDLE_URL, { waitUntil: "networkidle2" });

  // Load or create session cookies
  const cookiesPath = path.join(SESSION_DIR, "cookies.json");
  if (!(await fs.pathExists(cookiesPath))) {
    console.log("Log in to Amazon, then press Enter in terminal...");
    await new Promise((resolve) => process.stdin.once("data", resolve));
    const cookies = await page.cookies();
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log("Session saved!");
  } else {
    const cookies = JSON.parse(await fs.readFile(cookiesPath));
    await page.setCookie(...cookies);
    console.log("Session restored. Navigate to desired book & press Enter...");
    await new Promise((resolve) => process.stdin.once("data", resolve));
  }

  // Check if we have a book name in CLI arg, else prompt
  let bookName = process.argv[2];
  if (!bookName) {
    bookName = await prompt("Enter the book name: ");
  }

  const SCREENSHOT_DIR = path.join(BASE_SCREENSHOT_DIR, bookName);
  await fs.ensureDir(SCREENSHOT_DIR);

  let previousScreenshot = null;
  let pageIndex = 1;

  while (true) {
    // Capture screenshot
    const screenshotBuffer = await page.screenshot({
      clip: {
        x: 0,
        y: 60,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT - 60 - 44
      }
    });

    // Compare with previous
    if (
      previousScreenshot &&
      Buffer.compare(screenshotBuffer, previousScreenshot) === 0
    ) {
      console.log("\nScreenshot identical to previous one. Ending capture.");
      break;
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, `page_${pageIndex}.png`);
    await fs.writeFile(screenshotPath, screenshotBuffer);
    updateProgress(pageIndex);

    previousScreenshot = screenshotBuffer;
    await page.keyboard.press("ArrowRight");

    // short delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    pageIndex++;
  }

  console.log("Closing browser...");
  await browser.close();

  // Convert to PDF (same as original)
  const pdfProcess = spawn("node", ["screenshots-to-pdf.js", bookName], {
    stdio: "inherit"
  });

  pdfProcess.on("close", (code) => {
    process.exit(code);
  });
})();