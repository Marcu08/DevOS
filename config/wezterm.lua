local wezterm = require 'wezterm'

local config = {}

config.default_prog = { "C:\\Program Files\\PowerShell\\7\\pwsh.exe" }
config.default_cwd = os.getenv("HOME") or os.getenv("USERPROFILE")

config.font = wezterm.font_with_fallback({
  "JetBrainsMono Nerd Font",
})
config.font_size = 13.0
config.line_height = 1.15

config.colors = {
  foreground = "#E6E6E6",
  background = "#0A0A0F",
  cursor_bg = "#00FFF7",
  cursor_fg = "#0A0A0F",
  selection_bg = "#FF2E97",
  ansi = {
    "#000000", "#FF2E97", "#39FF14", "#FFD300",
    "#00FFF7", "#8A2BE2", "#00BFFF", "#CCCCCC"
  },
}

config.window_background_opacity = 0.92
config.window_decorations = "RESIZE"
config.hide_tab_bar_if_only_one_tab = true
config.window_padding = { left = 10, right = 10, top = 8, bottom = 8 }
config.max_fps = 120

config.keys = {
  {
    key = "A",
    mods = "CTRL|SHIFT",
    action = wezterm.action.SpawnCommandInNewTab {
      args = { "opencode" }
    }
  },
  {
    key = "D",
    mods = "CTRL|SHIFT",
    action = wezterm.action.SplitHorizontal { domain = "CurrentPaneDomain" }
  },
}

return config
