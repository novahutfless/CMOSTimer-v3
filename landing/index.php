<?php require __DIR__ . '/includes/bootstrap.php'; ?>
<?php
$allowedPages = ['main', 'features', 'download', 'contact'];
$page = isset($_GET['page']) && is_string($_GET['page']) ? strtolower($_GET['page']) : 'main';
if (!in_array($page, $allowedPages, true)) {
    $page = 'main';
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CMOSTimer</title>
    <link rel="icon" type="image/png" sizes="32x32" href="../icons/favicon-32x32.png">
    <link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/uikit/3.0.0-rc.10/css/uikit.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/uikit/3.0.0-rc.10/js/uikit.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/uikit/3.0.0-rc.10/js/uikit-icons.min.js"></script>
</head>
<body>
    <div id="offcanvas" uk-offcanvas="overlay: true">
        <div class="uk-offcanvas-bar">
            <ul class="uk-nav uk-nav-default">
                <li class="<?= $page === 'main' ? 'uk-active' : ''; ?>"><a href="?page=main" uk-toggle>Home</a></li>
                <li class="<?= $page === 'features' ? 'uk-active' : ''; ?>"><a href="?page=features" uk-toggle>Features</a></li>
                <li class="<?= $page === 'download' ? 'uk-active' : ''; ?>"><a href="?page=download" uk-toggle>Download</a></li>
                <li class="<?= $page === 'contact' ? 'uk-active' : ''; ?>"><a href="?page=contact" uk-toggle>Contact</a></li>
            </ul>
        </div>
    </div>

    <div class="uk-section-secondary tm-section-texture">
        <div uk-sticky="media: 960" class="uk-navbar-container tm-navbar-container uk-navbar-transparent">
            <div class="uk-container uk-container-expand">
                <nav class="uk-navbar">
                    <div class="uk-navbar-left">
                        <a href="?page=main" class="uk-navbar-item uk-logo">CMOSTimer</a>
                    </div>
                    <div class="uk-navbar-right">
                        <ul class="uk-navbar-nav uk-visible@m">
                            <li class="<?= $page === 'features' ? 'uk-active' : ''; ?>"><a href="?page=features">Features</a></li>
                            <li class="<?= $page === 'contact' ? 'uk-active' : ''; ?>"><a href="?page=contact">Contact</a></li>
                        </ul>
                        <div class="uk-navbar-item uk-visible@m">
                            <a href="?page=download" class="uk-button uk-button-default tm-button-default">Download</a>
                        </div>
                        <a uk-navbar-toggle-icon href="#offcanvas" uk-toggle class="uk-navbar-toggle uk-hidden@m"></a>
                    </div>
                </nav>
            </div>
        </div>
        <div class="uk-sticky-placeholder" style="height: 80px; margin: 0;"></div>
    </div>

    <?php include __DIR__ . '/includes/' . $page . '.php'; ?>

    <footer class="uk-section-small uk-section-secondary">
        <div class="uk-container uk-text-center">
            <ul class="uk-subnav uk-flex-center uk-margin-remove-bottom">
                <li><span>Version <?= htmlspecialchars($appVersion, ENT_QUOTES, 'UTF-8'); ?></span></li>
                <li>
                    <span>
                        <span class="uk-margin-small-right" uk-icon="icon: users"></span>
                        <span id="user-count" data-count="<?= $userCount ?? 0; ?>">0</span> Users
                    </span>
                </li>
            </ul>
        </div>
    </footer>

    <script>
        (function () {
            var el = document.getElementById('user-count');
            if (!el) return;
            var target = parseInt(el.getAttribute('data-count') || '0', 10);
            if (!Number.isFinite(target) || target < 0) target = 0;
            if (target === 0) {
                el.textContent = '0';
                return;
            }

            var duration = 900;
            var startTs = performance.now();
            function tick(now) {
                var progress = Math.min((now - startTs) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var value = Math.floor(target * eased);
                el.textContent = value.toLocaleString();
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        })();
    </script>
</body>
</html>
