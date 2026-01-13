const themeToggle = document.getElementById('theme-toggle');
const menuThemeToggle = document.getElementById('menu-theme-toggle');
const html = document.documentElement;
const themeIcon = document.getElementById('theme-icon');
const menuThemeIcon = document.getElementById('menu-theme-icon');

const setIcon = (iconElement) => {
    if (!iconElement) return;
    if (html.classList.contains('dark')) {
        iconElement.textContent = '☀️';
    } else {
        iconElement.textContent = '🌓';
    }
};

const updateAllIcons = () => {
    setIcon(themeIcon);
    setIcon(menuThemeIcon);
};

// Apply the theme on initial load
if (localStorage.getItem('theme') === 'dark') {
    html.classList.add('dark');
}
updateAllIcons();

const toggleTheme = () => {
    html.classList.toggle('dark');

    if (html.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }

    updateAllIcons();
};

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

if (menuThemeToggle) {
    menuThemeToggle.addEventListener('click', toggleTheme);
}