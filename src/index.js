const { app, BrowserWindow, ipcMain, nativeTheme, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const THEME_PREFERENCES = new Set(['system', 'light', 'dark']);

const buildApplicationMenu = () => {
    const themePreference = nativeTheme.themeSource;
    const template = [
        ...(process.platform === 'darwin'
            ? [
                  {
                      label: app.name,
                      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
                  },
              ]
            : []),
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: 'Theme',
                    submenu: [
                        {
                            label: 'Auto (Follow System)',
                            type: 'radio',
                            checked: themePreference === 'system',
                            click: () => setThemePreference('system'),
                        },
                        {
                            label: 'Light',
                            type: 'radio',
                            checked: themePreference === 'light',
                            click: () => setThemePreference('light'),
                        },
                        {
                            label: 'Dark',
                            type: 'radio',
                            checked: themePreference === 'dark',
                            click: () => setThemePreference('dark'),
                        },
                    ],
                },
            ],
        },
    ];

    return Menu.buildFromTemplate(template);
};

const getThemeSettingsPath = () =>
    path.join(app.getPath('userData'), 'settings.json');

const getThemeState = () => ({
    preference: nativeTheme.themeSource,
    effective: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
});

const loadSavedThemePreference = () => {
    try {
        const settingsRaw = fs.readFileSync(getThemeSettingsPath(), 'utf8');
        const settings = JSON.parse(settingsRaw);
        if (THEME_PREFERENCES.has(settings.themePreference)) {
            return settings.themePreference;
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Failed to read theme preference:', error);
        }
    }

    return 'system';
};

const saveThemePreference = (themePreference) => {
    try {
        let settings = {};
        try {
            const existingSettings = fs.readFileSync(getThemeSettingsPath(), 'utf8');
            settings = JSON.parse(existingSettings);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to read existing settings:', error);
            }
        }

        settings.themePreference = themePreference;
        fs.writeFileSync(getThemeSettingsPath(), JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Failed to persist theme preference:', error);
    }
};

const notifyThemeChanged = () => {
    const themeState = getThemeState();
    Menu.setApplicationMenu(buildApplicationMenu());
    for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send('theme:changed', themeState);
    }
};

const setThemePreference = (themePreference) => {
    if (!THEME_PREFERENCES.has(themePreference)) {
        throw new Error(`Unsupported theme preference: ${themePreference}`);
    }

    nativeTheme.themeSource = themePreference;
    saveThemePreference(themePreference);
    notifyThemeChanged();

    return getThemeState();
};

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    nativeTheme.themeSource = loadSavedThemePreference();
    Menu.setApplicationMenu(buildApplicationMenu());

    ipcMain.handle('theme:get', () => getThemeState());
    ipcMain.handle('theme:set', (_event, themePreference) =>
        setThemePreference(themePreference)
    );

    nativeTheme.on('updated', () => {
        notifyThemeChanged();
    });

    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
