# Bulk Session Manager

Import `bulk-session-manager.cmost-plugin.json` from **Settings -> Plugins** and grant `state:read`, `sessions:write`, `storage`, and `ui`.

The widget provides a native text field for a comma-separated list. **Create sessions** uses the API's batch operation and leaves the current session unchanged. **Delete matching** removes exact name matches in one batch while respecting CMOSTimer's requirement that at least one session remains.

New sessions copy the current session's scrambler IDs and custom scrambler configuration. Names are trimmed and deduplicated.
