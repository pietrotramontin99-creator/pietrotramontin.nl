document.getElementById("year").textContent = new Date().getFullYear();

const portrait = document.querySelector(".portrait");
if (portrait) {
  portrait.addEventListener("error", () => {
    portrait.style.display = "none";
    document.querySelector(".portrait-fallback").style.display = "flex";
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
