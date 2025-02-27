const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");
const { updateProgress } = require("./progressBar");

// Helper function for prompting user input
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

const AMAZON_KINDLE_URL = "https://read.amazon.com"; // Kindle Reader URL
const BASE_SCREENSHOT_DIR = "screenshots";
const SESSION_DIR = "session"; // Directory to store session data
const VIEWPORT_WIDTH = 1000; // Mimics a single-column PDF
const VIEWPORT_HEIGHT = 1400;

(async () => {
  // Ensure session directory exists
  await fs.ensureDir(SESSION_DIR);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
      `--user-data-dir=${SESSION_DIR}`, // Persistent session storage
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 2,
  });

  // Navigate to Kindle Reader
  await page.goto(AMAZON_KINDLE_URL, { waitUntil: "networkidle2" });

  const cookiesPath = path.join(SESSION_DIR, "cookies.json");
  if (!(await fs.pathExists(cookiesPath))) {
    console.log("Log in manually, then press Enter in the terminal...");
    await new Promise((resolve) => process.stdin.once("data", resolve));

    // Save session cookies after login
    const cookies = await page.cookies();
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log("Session saved!");
  } else {
    // Load existing session cookies
    const cookies = JSON.parse(await fs.readFile(cookiesPath));
    await page.setCookie(...cookies);
    console.log("Session restored.");
    console.log(
      "Navigate to the correct book/page, then press Enter in the terminal..."
    );
    await new Promise((resolve) => process.stdin.once("data", resolve));
  }

  // Ask for the book name and create a subdirectory for screenshots
  const bookName = await prompt("Enter the book name: ");
  const SCREENSHOT_DIR = path.join(BASE_SCREENSHOT_DIR, bookName);
  await fs.ensureDir(SCREENSHOT_DIR);

  let previousScreenshot = null;
  let pageIndex = 1;
  while (true) {
    // Capture screenshot as a buffer
    const screenshotBuffer = await page.screenshot({
      clip: {
        x: 0,
        y: 60,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT - 60
      }
    });

    // Compare with the previous screenshot using Buffer.compare
    if (
      previousScreenshot &&
      Buffer.compare(screenshotBuffer, previousScreenshot) === 0
    ) {
      console.log("\nScreenshot identical to previous one. Ending capture.");
      break;
    }

    // Save the screenshot to the book-specific directory
    const screenshotPath = path.join(SCREENSHOT_DIR, `page_${pageIndex}.png`);
    await fs.writeFile(screenshotPath, screenshotBuffer);
    updateProgress(pageIndex);

    // Update previous screenshot buffer
    previousScreenshot = screenshotBuffer;

    // Navigate to the next page by simulating a right arrow key press
    await page.keyboard.press("ArrowRight");

    // Delay to allow the page to render
    await new Promise((resolve) => setTimeout(resolve, 500));

    pageIndex++;
  }
  console.log("");

  console.log("Screenshots captured. Closing browser...");
  await browser.close();
  const pdfProcess = spawn("node", ["screenshots-to-pdf.js", bookName], {
    stdio: "inherit",
  });
  pdfProcess.on("close", (code) => {
    process.exit(code);
  });
})();