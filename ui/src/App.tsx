/**
 * App — top-level component placeholder with theme toggle demo.
 * WHY: demonstrates tokens.css + Tailwind variable extend is wired up.
 * Background / text colors change when [data-theme] attribute is toggled,
 * confirming the CSS variable override mechanism works end-to-end.
 * Tasks 5-9 will replace this body with AppShell + routing.
 */

const THEMES = ['pop', 'dusk', 'night'] as const;
type Theme = (typeof THEMES)[number];

function setTheme(theme: Theme): void {
  if (theme === 'pop') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-bg1 text-fg1 p-sp-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-fs-h1 font-bold mb-sp-4">claude-loom UI</h1>
        <p className="text-fg2 text-fs-body mb-sp-8">
          Design token demo — change theme to see CSS variable override in action.
        </p>

        {/* Theme toggle buttons */}
        <div className="flex gap-sp-4 mb-sp-8">
          {THEMES.map((theme) => (
            <button
              key={theme}
              onClick={() => setTheme(theme)}
              className="px-sp-4 py-sp-3 rounded-ctrl bg-bg3 text-fg1 border border-border
                         hover:bg-accent hover:text-white transition-colors text-fs-sm font-semibold"
            >
              {theme}
            </button>
          ))}
        </div>

        {/* Token swatch demo */}
        <div className="grid grid-cols-3 gap-sp-4">
          <div className="p-sp-4 rounded-card bg-bg2 shadow-token">
            <p className="text-fs-xs text-fg2 mb-sp-2">bg2 / surface</p>
            <p className="text-fg1 text-fs-sm">Panel</p>
          </div>
          <div className="p-sp-4 rounded-card bg-accent text-white shadow-token">
            <p className="text-fs-xs opacity-75 mb-sp-2">accent</p>
            <p className="text-fs-sm font-semibold">CTA</p>
          </div>
          <div className="p-sp-4 rounded-card bg-bg3 border border-border shadow-token">
            <p className="text-fs-xs text-fg2 mb-sp-2">bg3 / tint</p>
            <p className="text-fg1 text-fs-sm">Detail</p>
          </div>
        </div>
      </div>
    </div>
  );
}
