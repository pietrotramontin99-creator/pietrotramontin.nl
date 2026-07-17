document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("error", () => {
    img.style.display = "none";
    const placeholder = img.parentElement.querySelector(".image-placeholder");
    if (placeholder) placeholder.style.display = "flex";
  });
});
