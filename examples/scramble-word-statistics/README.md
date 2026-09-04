# Scramble Word Statistics

Import `scramble-word-statistics.cmost-plugin.json` from **Settings -> Plugins** and grant `state:read`, `storage`, and `ui`.

The widget follows the current session by default. Its native session selector can pin it to another session or return to the current session. Its native text field accepts a comma-separated word list, which is trimmed, deduplicated, and persisted. The default list is `BLUB, UwU, FUR`.

For every solve, the plugin flattens the scramble sequence, removes whitespace, and preserves capitalization. It reports total overlapping occurrences, the number and percentage of solves containing each word at least once, and a native progress bar for that percentage.

The widget refreshes on session changes, session mutations, and solve add/update/delete events.
