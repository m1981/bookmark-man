Here's Part 1 of the formatted content:

# chrome.sidePanel

Use the chrome.sidePanel API to host content in the browser's side panel alongside the main content of a webpage.

## Permissions

`sidePanel`

To use the Side Panel API, add the "sidePanel" permission in the extension manifest file:

### Availability
Chrome 114+ MV3+

```json
// manifest.json:
{
  "name": "My side panel extension",
  ...
  "permissions": [
    "sidePanel"
  ]
}
```

## Concepts and usage

The Side Panel API allows extensions to display their own UI in the side panel, enabling persistent experiences that complement the user's browsing journey.

Some features include:
- Chrome browser side panel UI
- The side panel remains open when navigating between tabs (if set to do so)
- It can be available only on specific websites
- As an extension page, side panels have access to all Chrome APIs
- Within Chrome's settings, users can specify which side the panel should be displayed on

## Use cases

The following sections demonstrate some common use cases for the Side Panel API. See Extension samples for complete extension examples.

### Display the same side panel on every site

The side panel can be set initially from the "default_path" property in the "side_panel" key of the manifest to display the same side panel on every site. This should point to a relative path within the extension directory.

```json
// manifest.json:
{
  "name": "My side panel extension",
  ...
  "side_panel": {
    "default_path": "sidepanel.html"
  }
  ...
}
```

```html
<!-- sidepanel.html: -->
<!DOCTYPE html>
<html>
<head>
  <title>My Sidepanel</title>
</head>
<body>
  <h1>All sites sidepanel extension</h1>
  <p>This side panel is enabled on all sites</p>
</body>
</html>
```

Here's Part 2 of the formatted content:

### Enable a side panel on a specific site

An extension can use `sidepanel.setOptions()` to enable a side panel on a specific tab. This example uses `chrome.tabs.onUpdated()` to listen for any updates made to the tab. It checks if the URL is www.google.com and enables the side panel. Otherwise, it disables it.

```javascript
// service-worker.js:
const GOOGLE_ORIGIN = 'https://www.google.com';

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  
  // Enables the side panel on google.com
  if (url.origin === GOOGLE_ORIGIN) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    });
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});
```

When a user temporarily switches to a tab where the side panel is not enabled, the side panel will be hidden. It will automatically show again when the user switches to a tab where it was previously open.

When the user navigates to a site where the side panel is not enabled, the side panel will close, and the extension won't show in the side panel drop-down menu.

### Open the side panel by clicking the toolbar icon

Developers can allow users to open the side panel when they click the action toolbar icon with `sidePanel.setPanelBehavior()`. First, declare the "action" key in the manifest:

```json
// manifest.json:
{
  "name": "My side panel extension",
  ...
  "action": {
    "default_title": "Click to open panel"
  },
  ...
}
```

```javascript
// service-worker.js:
const GOOGLE_ORIGIN = 'https://www.google.com';

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
...
```

### Programmatically open the side panel on user interaction

Chrome 116 introduces `sidePanel.open()`. It allows extensions to open the side panel through an extension user gesture, such as clicking on the action icon. Or a user interaction on an extension page or content script, such as clicking a button.

```javascript
// service-worker.js:
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openSidePanel',
    title: 'Open side panel',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidePanel') {
    // This will open the panel in all the pages on the current window.
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
```

Here's Part 3 of the formatted content:

### Switch to a different panel

Extensions can use `sidepanel.getOptions()` to retrieve the current side panel. The following example sets a welcome side panel on `runtime.onInstalled()`. Then when the user navigates to a different tab, it replaces it with the main side panel.

```javascript
// service-worker.js:
const welcomePage = 'sidepanels/welcome-sp.html';
const mainPage = 'sidepanels/main-sp.html';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: welcomePage });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const { path } = await chrome.sidePanel.getOptions({ tabId });
  if (path === welcomePage) {
    chrome.sidePanel.setOptions({ path: mainPage });
  }
});
```

## Side panel user experience

Users will see Chrome's built-in side panels first. Each side panel displays the extension's icon in the side panel menu. If no icons are included, it will show a placeholder icon with the first letter of the extension's name.

### Open the side panel

To allow users to open the side panel, use an action icon in combination with `sidePanel.setPanelBehavior()`. Alternatively, make a call to `sidePanel.open()` following a user interaction, such as:

- An action click
- A keyboard shortcut
- A context menu
- A user gesture on an extension page or content script

### Pin the side panel

The side panel toolbar displays a pin icon when your side panel is open. Clicking the icon pins your extension's action icon. Clicking the action icon once pinned will perform the default action for your action icon and will only open the side panel if this has been explicitly configured.

## Examples

For more Side Panel API extensions demos, explore any of the following extensions:

- Dictionary side panel
- Global side panel
- Multiple side panels
- Open Side panel
- Site-specific side panel

Here's Part 4 of the formatted content:

## Types

### GetPanelOptions
#### PROPERTIES
- **tabId** (`number`, optional)
    - If specified, the side panel options for the given tab will be returned. Otherwise, returns the default side panel options (used for any tab that doesn't have specific settings).

### OpenOptions
Chrome 116+
#### PROPERTIES
- **tabId** (`number`, optional)
    - The tab in which to open the side panel. If the corresponding tab has a tab-specific side panel, the panel will only be open for that tab. If there is not a tab-specific panel, the global panel will be open in the specified tab and any other tabs without a currently-open tab-specific panel. This will override any currently-active side panel (global or tab-specific) in the corresponding tab. At least one of this or windowId must be provided.

- **windowId** (`number`, optional)
    - The window in which to open the side panel. This is only applicable if the extension has a global (non-tab-specific) side panel or tabId is also specified. This will override any currently-active global side panel the user has open in the given window. At least one of this or tabId must be provided.

### PanelBehavior
#### PROPERTIES
- **openPanelOnActionClick** (`boolean`, optional)
    - Whether clicking the extension's icon will toggle showing the extension's entry in the side panel. Defaults to false.

### PanelOptions
#### PROPERTIES
- **enabled** (`boolean`, optional)
    - Whether the side panel should be enabled. This is optional. The default value is true.

- **path** (`string`, optional)
    - The path to the side panel HTML file to use. This must be a local resource within the extension package.

- **tabId** (`number`, optional)
    - If specified, the side panel options will only apply to the tab with this id. If omitted, these options set the default behavior (used for any tab that doesn't have specific settings). Note: if the same path is set for this tabId and the default tabId, then the panel for this tabId will be a different instance than the panel for the default tabId.

### SidePanel
#### PROPERTIES
- **default_path** (`string`)
    - Developer specified path for side panel display.

Here's Part 5 of the formatted content:

## Methods

### getOptions()
Returns the active panel configuration.

```typescript
chrome.sidePanel.getOptions(
  options: GetPanelOptions,
  callback?: function,
)
```

#### PARAMETERS
- **options** (`GetPanelOptions`)
    - Specifies the context to return the configuration for.
- **callback** (`function`, optional)
    - The callback parameter looks like: `(options: PanelOptions) => void`

#### RETURNS
`Promise<PanelOptions>`

Promises are supported in Manifest V3 and later, but callbacks are provided for backward compatibility. You cannot use both on the same function call. The promise resolves with the same type that is passed to the callback.

### getPanelBehavior()
Returns the extension's current side panel behavior.

```typescript
chrome.sidePanel.getPanelBehavior(
  callback?: function,
)
```

#### PARAMETERS
- **callback** (`function`, optional)
    - The callback parameter looks like: `(behavior: PanelBehavior) => void`

#### RETURNS
`Promise<PanelBehavior>`

### open()
Chrome 116+

Opens the side panel for the extension. This may only be called in response to a user action.

```typescript
chrome.sidePanel.open(
  options: OpenOptions,
  callback?: function,
)
```

#### PARAMETERS
- **options** (`OpenOptions`)
    - Specifies the context in which to open the side panel.
- **callback** (`function`, optional)
    - The callback parameter looks like: `() => void`

#### RETURNS
`Promise<void>`

Here's Part 6 of the formatted content (final part):

### setOptions()
Configures the side panel.

```typescript
chrome.sidePanel.setOptions(
  options: PanelOptions,
  callback?: function,
)
```

#### PARAMETERS
- **options** (`PanelOptions`)
    - The configuration options to apply to the panel.
- **callback** (`function`, optional)
    - The callback parameter looks like: `() => void`

#### RETURNS
`Promise<void>`

### setPanelBehavior()
Configures the extension's side panel behavior. This is an upsert operation.

```typescript
chrome.sidePanel.setPanelBehavior(
  behavior: PanelBehavior,
  callback?: function,
)
```

#### PARAMETERS
- **behavior** (`PanelBehavior`)
    - The new behavior to be set.
- **callback** (`function`, optional)
    - The callback parameter looks like: `() => void`

#### RETURNS
`Promise<void>`

---

> **Key point**: Remember to design your side panel as a useful companion tool for users, improving their browsing experience without unnecessary distractions.

---

*Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 4.0 License, and code samples are licensed under the Apache 2.0 License. For details, see the Google Developers Site Policies. Java is a registered trademark of Oracle and/or its affiliates.*

*Last updated 2024-10-15 UTC.*

This concludes the complete documentation of the chrome.sidePanel API. Is there any specific part you'd like me to explain in more detail?