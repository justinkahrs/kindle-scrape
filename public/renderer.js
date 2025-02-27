const { ipcRenderer } = require('electron');

const bookNameInput = document.getElementById('bookName');
const startButton = document.getElementById('startScrape');
const logEl = document.getElementById('log');
const pdfListEl = document.getElementById('pdf-list');

startButton.addEventListener('click', () => {
  const bookName = bookNameInput.value.trim();
  if (!bookName) {
    appendLog('Please enter a book name first.');
    return;
  }
  appendLog(`Starting scrape for: ${bookName}`);
  ipcRenderer.send('start-scraping', bookName);
});

// Listen for logs from the main process
ipcRenderer.on('scrape-log', (event, message) => {
  appendLog(message);
  // after we get logs, we can also refresh PDF list
  ipcRenderer.send('list-pdfs');
});

// Listen for updated PDF list
ipcRenderer.on('pdf-list', (event, pdfFiles) => {
  pdfListEl.innerHTML = '';
  if (pdfFiles.length === 0) {
    pdfListEl.textContent = 'No PDFs found yet.';
  } else {
    pdfFiles.forEach((pdf) => {
      const div = document.createElement('div');
      div.className = 'pdf-item';
      div.textContent = pdf;
      pdfListEl.appendChild(div);
    });
  }
});

// Initial load: request PDFs
ipcRenderer.send('list-pdfs');

function appendLog(text) {
  logEl.textContent += text + '\\n';
  logEl.scrollTop = logEl.scrollHeight;
}