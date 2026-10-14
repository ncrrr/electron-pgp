const preferenceLabels = {
    system: 'Auto (follow system)',
    light: 'Light',
    dark: 'Dark',
};

const applyTheme = (themeState) => {
    document.documentElement.dataset.theme = themeState.effective;
};

const initializeTheme = async () => {
    const initialTheme = await window.theme.get();
    applyTheme(initialTheme);
};

window.theme.onChange((themeState) => {
    applyTheme(themeState);
});

initializeTheme();
