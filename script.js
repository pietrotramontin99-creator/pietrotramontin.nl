const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector("#site-nav");
const navLinks = nav.querySelectorAll("a");

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.textContent = isOpen ? "Sluiten" : "Menu";
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Menu";
  });
});

document.getElementById("year").textContent = new Date().getFullYear();
