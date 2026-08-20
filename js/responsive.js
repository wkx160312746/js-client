; (function (window) {
    'use strict';

    var panel = document.getElementById('console');
    var closeButton = document.getElementById('gamePanelClose');
    var launcher = document.getElementById('gamePanelLauncher');

    function setPanelOpen(isOpen) {
        document.body.classList.toggle('game-panel-collapsed', !isOpen);
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        launcher.hidden = isOpen;

        if (isOpen) {
            window.setTimeout(function () {
                var input = panel.querySelector('#input');
                if (input) input.focus();
            }, 180);
        } else {
            launcher.focus();
        }
    }

    closeButton.addEventListener('click', function () {
        setPanelOpen(false);
    });

    launcher.addEventListener('click', function () {
        setPanelOpen(true);
    });

    window.GamePanelLayout = {
        collapse: function () { setPanelOpen(false); },
        expand: function () { setPanelOpen(true); },
        isOpen: function () {
            return !document.body.classList.contains('game-panel-collapsed');
        }
    };
}(this));
