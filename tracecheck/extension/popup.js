const button = document.getElementById('authorize');
const status = document.getElementById('status');
button.addEventListener('click', () => {
  chrome.storage.session.set({ deepScanAuthorizedAt: Date.now() }, () => {
    status.textContent = 'One scan authorized. Return to TraceCheck and run Deep Cookie Scan.';
    button.textContent = 'Authorized';
    button.disabled = true;
  });
});
