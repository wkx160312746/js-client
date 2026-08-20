; (function (window) {
    'use strict';

    function Site(siteInfo) {
        this.url = siteInfo.url;
        this.title = siteInfo.title;
        this.icon = siteInfo.icon;
    }

    var iconPrefix = "./favicons/";

    function normalizeIframeUrl(value) {
        var url = (value || "").trim();
        if (!url) return null;

        if (!/^[a-z][a-z\d+.-]*:/i.test(url)) {
            url = "https://" + url;
        }

        try {
            var parsedUrl = new URL(url);
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                return null;
            }
            return parsedUrl.href;
        } catch (error) {
            return null;
        }
    }

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
    var configuredUrl = normalizeIframeUrl(config.iframeUrl) || "about:blank";
    var configuredSite = new Site({
        url: configuredUrl,
        title: config.pageTitle || "Ratel Online",
        icon: config.favicon || ""
    });
    var requestedUrl = normalizeIframeUrl(new URLSearchParams(window.location.search).get("url"));
    var initialSite = requestedUrl ? new Site({
        url: requestedUrl,
        title: "自定义网页",
        icon: ""
    }) : configuredSite;

    document.getElementById("switchWebsite").addEventListener("keydown", function (event) {
        if (event.keyCode === 13 && this.value) {
            event.preventDefault();
            var nextUrl = normalizeIframeUrl(this.value);
            if (!nextUrl) return;
            this.value = nextUrl;
            document.querySelector("#site").src = nextUrl;
        }
    });

    document.getElementById("defaultSiteButton").addEventListener("click", function () {
        configuredSite.render();
        document.getElementById("switchWebsite").value = "";

        var pageUrl = new URL(window.location.href);
        if (pageUrl.searchParams.has("url")) {
            pageUrl.searchParams.delete("url");
            window.history.replaceState(null, "", pageUrl.pathname + pageUrl.search + pageUrl.hash);
        }
    });

    window.defaultSite = initialSite;
}(this));
