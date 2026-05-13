const currentScript = document.currentScript;
const page = currentScript?.dataset.page ?? window.location.pathname;
const status = document.querySelector("#js-status");

if (status) {
  status.textContent = `JavaScript loaded for ${page}`;
}
