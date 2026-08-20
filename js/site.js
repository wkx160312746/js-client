; (function (window) {
    'use strict';

    function Site(siteInfo) {
        this.url = siteInfo.url;
        this.title = siteInfo.title;
        this.icon = siteInfo.icon;
    }

    var iconPrefix = "./favicons/";

    Site.prototype.render = function () {
        var iframe = document.querySelector("#site");
        iframe.src = this.url;
        iframe.title = this.title;
        document.querySelector("#headTitle").textContent = this.title;
        if (this.icon) {
            document.querySelector("link[rel*='icon']").href = iconPrefix + this.icon;
        }
    };

    var config = window.SiteConfig || {};
    var configuredSite = new Site({
        url: config.iframeUrl || "about:blank",
        title: config.pageTitle || "Ratel Online",
        icon: config.favicon || ""
    });

    document.getElementById("switchWebsite").addEventListener("keydown", function (event) {
        if (event.keyCode === 13 && this.value) {
            event.preventDefault();
            if (!this.value.startsWith('http://') && !this.value.startsWith('https://')) {
                this.value = 'https://' + this.value;
            }
            document.querySelector("#site").src = this.value;
        }
    });

    window.defaultSite = configuredSite;
}(this));
