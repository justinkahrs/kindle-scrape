const fs = require("fs-extra");

async function cleanScreenshots() {
  try {
    await fs.emptyDir("./screenshots");
    console.log("Screenshots directory has been cleaned.");
  } catch (err) {
    console.error("Error cleaning screenshots directory:", err);
  }
}

cleanScreenshots();
