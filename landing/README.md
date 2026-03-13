# Landing Page

PHP landing page split into include partials.

## Files

- `index.php`: main entry page
- `includes/bootstrap.php`: shared data loading (app version + user count)
- `includes/main.php`: hero/top section
- `includes/features.php`: features section
- `includes/download.php`: download section
- `includes/contact.php`: contact section

## Dynamic Data

- Version is loaded from root `package.json` (`version` field).
- User count is loaded from the `users` table using DB credentials in `server/config.php`.

