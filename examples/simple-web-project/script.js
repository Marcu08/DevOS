console.log("Website loaded");

function updateYear() {
  const year = new Date().getFullYear();
  const footer = document.querySelector("footer p");
  if (footer) {
    footer.innerHTML = `&copy; ${year} My Website`;
  }
}

document.addEventListener("DOMContentLoaded", updateYear);
