const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const themeIcon = document.getElementById('theme-icon');

const setIcon = () => {
    if (body.classList.contains('dark')) {
        themeIcon.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌓';
    }
};

// Apply the theme on initial load
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark');
}
setIcon();

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark');

    if (body.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }

    setIcon();
});