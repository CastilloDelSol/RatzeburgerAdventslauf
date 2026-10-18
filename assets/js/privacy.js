const privacyBox = document.getElementById("privacyBox");

document.querySelectorAll("[data-privacy-open]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        if (privacyBox) privacyBox.style.display = "block";
    });
});

document.querySelectorAll("[data-privacy-close]").forEach(button => {
    button.addEventListener("click", () => {
        if (privacyBox) privacyBox.style.display = "none";
    });
});
