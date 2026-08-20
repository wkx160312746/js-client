; (function (window) {
    'use strict';

    function Site(siteInfo) {
        this.url = siteInfo.url;
        this.title = siteInfo.title;
        this.icon = siteInfo.icon;
    }

    var iconPrefix = "./favicons/";

    Site.prototype.render = function () {
        document.querySelector("#site").src = this.url;
        document.querySelector("#headTitle").innerHTML = this.title;
        document.querySelector("link[rel*='icon']").href = iconPrefix + this.icon;
    };

    var siteMap = {
        "baidu": { url: "https://www.baidu.com/", title: "百度一下，你就知道", icon: "favicon-baidu.ico" },
        "ts": { url: "https://www.typescriptlang.org/", title: "TypeScript: JavaScript With Syntax For Types.", icon: "favicon-ts.png" },
        "bilibili": { url: "https://www.bilibili.com/", title: "哔哩哔哩 (゜-゜)つロ 干杯~-bilibili", icon: "favicon-bilibili.ico" }
    };

    var defaultSiteName = "baidu";

    document.getElementById("switchWebsite").addEventListener("keydown", function (event) {
        if (event.keyCode === 13) {
            if (this.value) {
                event.preventDefault();
                !this.value.startsWith('http://') && !this.value.startsWith('https://') && (this.value = 'https://' + this.value)
                document.querySelector("#site").src = this.value;
            }
        }
    })


    window.defaultSite = new Site(siteMap[defaultSiteName]);
}(this));
