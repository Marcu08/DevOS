# Dotfiles

Optional personal configuration used by the DevOS development environment. These
files are not loaded by the CLI; copy them into your home directory if you want the
same setup.

| File | Destination |
|------|-------------|
| `wezterm.lua` | `~/.wezterm.lua` (Windows: `%USERPROFILE%\.wezterm.lua`) |
| `powershell_profile.ps1` | `$PROFILE` (PowerShell 7) |
| `starship.toml` | `~/.config/starship.toml` |

The `scripts/backup.ps1` and `scripts/restore.ps1` helpers can back up and restore
the WezTerm and PowerShell files automatically.
