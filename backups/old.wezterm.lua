local wezterm = require 'wezterm'

local config = {}

-- =========================
-- SHELL
-- =========================
config.default_prog = { "C:\\Program Files\\PowerShell\\7\\pwsh.exe" }
config.default_cwd = "C:\\Users\\marzu\\OneDrive\\Desktop"

-- =========================
-- FONT
-- =========================
config.font = wezterm.font_with_fallback({
  "JetBrainsMono Nerd Font",
})
config.font_size = 13.0
config.line_height = 1.15

-- =========================
-- COLORS
-- =========================
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

-- =========================
-- WINDOW
-- =========================
config.window_background_opacity = 0.92
config.window_decorations = "RESIZE"
config.hide_tab_bar_if_only_one_tab = true

config.window_padding = {
  left = 10,
  right = 10,
  top = 8,
  bottom = 8,
}

config.max_fps = 120

-- =========================
-- STARTUP
-- =========================
wezterm.on("gui-startup", function()
  wezterm.mux.spawn_window({})
end)

-- =========================
-- KEYS (UNICO BLOCCO)
-- =========================
config.keys = {

  -- WORKSPACES
  {
    key = "1",
    mods = "CTRL|ALT",
    action = wezterm.action.SwitchToWorkspace {
      name = "wms",
      spawn = { cwd = "C:\\Users\\marzu\\OneDrive\\Desktop\\wms" },
    },
  },

  {
    key = "2",
    mods = "CTRL|ALT",
    action = wezterm.action.SwitchToWorkspace {
      name = "portfolio",
      spawn = { cwd = "C:\\Users\\marzu\\OneDrive\\Desktop\\Portfolio_foto" },
    },
  },

  {
    key = "3",
    mods = "CTRL|ALT",
    action = wezterm.action.SwitchToWorkspace {
      name = "team",
      spawn = { cwd = "C:\\Users\\marzu\\OneDrive\\Desktop\\Team_Fab_Luperini\\public_html" },
    },
  },

  -- SPLITS
  {
    key = "d",
    mods = "CTRL|SHIFT",
    action = wezterm.action.SplitHorizontal { domain = "CurrentPaneDomain" }
  },
  {
    key = "D",
    mods = "CTRL|SHIFT",
    action = wezterm.action.SplitVertical { domain = "CurrentPaneDomain" }
  },

  -- FULLSCREEN
  {
    key = "F11",
    action = wezterm.action.ToggleFullScreen
  },

  -- COPY / PASTE
  {
    key = "C",
    mods = "CTRL|SHIFT",
    action = wezterm.action.CopyTo "Clipboard"
  },
  {
    key = "V",
    mods = "CTRL|SHIFT",
    action = wezterm.action.PasteFrom "Clipboard"
  },

  -- OPENCODE
  {
    key = "a",
    mods = "CTRL|SHIFT",
    action = wezterm.action.SpawnCommandInNewTab {
      args = { "opencode", "." }
    }
  },

  -- AGENT v1
  {
    key = "A",
    mods = "CTRL|SHIFT",
    action = wezterm.action_callback(function(window, pane, line)
      if line then
        local cwd = pane:get_current_working_dir().file_path

        window:perform_action(
          wezterm.action.SpawnCommandInNewTab {
            args = {
              "node",
              "C:\\Users\\marzu\\agent\\agent.js",
              line
            },
            cwd = cwd
          },
          pane
        )
      end
    end)
  },

  -- AGENT v2
  {
    key = "L",
    mods = "CTRL|SHIFT",
    action = wezterm.action.SpawnCommandInNewTab {
      args = {
        "node",
        "C:\\Users\\marzu\\agent\\agent-v2.js",
        "improve current project"
      }
    }
  },
}

return config