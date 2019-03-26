"use strict";
let instaban = false;
if (window.App !== undefined) {
    instaban = true;
}
window.App = (function () {
    // first we define the global helperfunctions and figure out what kind of settings our browser needs to use
    let storageFactory = function (storageType, prefix, exdays) {
            const getCookie = function (c_name) {
                    let i, x, y, ARRcookies = document.cookie.split(";");
                    for (i = 0; i < ARRcookies.length; i++) {
                        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
                        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
                        x = x.replace(/^\s+|\s+$/g, "");
                        if (x == c_name) {
                            return unescape(y);
                        }
                    }
                },
                setCookie = function (c_name, value, exdays) {
                    let exdate = new Date(),
                        c_value = encodeURIComponent(value);
                    exdate.setDate(exdate.getDate() + exdays);
                    c_value += ((exdays === null) ? '' : '; expires=' + exdate.toUTCString());
                    document.cookie = c_name + '=' + c_value;
                };
            return {
                haveSupport: null,
                support: function () {
                    if (this.haveSupport === null) {
                        try {
                            storageType.setItem('test', '1');
                            this.haveSupport = (storageType.getItem('test') == '1');
                            storageType.removeItem('test');
                        } catch (e) {
                            this.haveSupport = false;
                        }
                    }
                    return this.haveSupport;
                },
                get: function (name) {
                    let s = this.support() ? storageType.getItem(name) : getCookie(prefix + name);
                    try {
                        return s === undefined ? null : JSON.parse(s);
                    } catch (e) {
                        return null;
                    }
                },
                set: function (name, value) {
                    value = JSON.stringify(value);
                    if (this.support()) {
                        storageType.setItem(name, value);
                    } else {
                        setCookie(prefix + name, value, exdays)
                    }
                },
                remove: function (name) {
                    if (this.support()) {
                        storageType.removeItem(name);
                    } else {
                        setCookie(prefix + name, '', -1);
                    }
                }
            };
        },
        binary_ajax = function (url, fn, failfn) {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function (event) {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        if (xhr.response) {
                            let data = new Uint8Array(xhr.response);
                            fn(data);
                        }
                    } else if (failfn) {
                        failfn();
                    }
                }
            };
            xhr.send(null);
        },
        createImageData = function (w, h) {
            try {
                return new ImageData(w, h);
            } catch (e) {
                let imgCanv = document.createElement('canvas');
                imgCanv.width = w;
                imgCanv.height = h;
                return imgCanv.getContext('2d').getImageData(0, 0, w, h);
            }
        },
        analytics = function () {
            if (window.ga) {
                window.ga.apply(this, arguments);
            }
        },
        nua = navigator.userAgent,
        have_image_rendering = (function () {
            let checkImageRendering = function (prefix, crisp, pixelated, optimize_contrast) {
                let d = document.createElement('div');
                if (crisp) {
                    d.style.imageRendering = prefix + 'crisp-edges';
                    if (d.style.imageRendering === prefix + 'crisp-edges') {
                        return true;
                    }
                }
                if (pixelated) {
                    d.style.imageRendering = prefix + 'pixelated';
                    if (d.style.imageRendering === prefix + 'pixelated') {
                        return true;
                    }
                }
                if (optimize_contrast) {
                    d.style.imageRendering = prefix + 'optimize-contrast';
                    if (d.style.imageRendering === prefix + 'optimize-contrast') {
                        return true;
                    }
                }
                return false;
            };
            return checkImageRendering('', true, true, false) || checkImageRendering('-o-', true, false, false) || checkImageRendering('-moz-', true, false, false) || checkImageRendering('-webkit-', true, false, true);
        })(),
        have_zoom_rendering = false,
        ios_safari = (nua.match(/(iPod|iPhone|iPad)/i) && nua.match(/AppleWebKit/i)),
        desktop_safari = (nua.match(/safari/i) && !nua.match(/chrome/i)),
        ms_edge = nua.indexOf('Edge') > -1;
    if (ios_safari) {
        let iOS = parseFloat(
            ('' + (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0, ''])[1])
                .replace('undefined', '3_2').replace('_', '.').replace('_', '')
        ) || false;
        have_image_rendering = false;
        if (iOS >= 11) {
            have_zoom_rendering = true;
        }
    } else if (desktop_safari) {
        have_image_rendering = false;
        have_zoom_rendering = true;
    }
    if (ms_edge) {
        have_image_rendering = false;
    }
    let ls = storageFactory(localStorage, 'ls_', 99),
        ss = storageFactory(sessionStorage, 'ss_', null),
        query = (function () {
            let self = {
                params: {},
                initialized: false,
                _trigger: function (propName, oldValue, newValue) {
                    $(window).trigger("pxls:queryUpdated", [propName, oldValue, newValue]); //window.on("queryUpdated", (event, propName, oldValue, newValue) => {...});
                    //this will cause issues if you're not paying attention. always check for `newValue` to be null in the event of a deleted key.
                },
                _update: function (fromEvent) {
                    let toSplit = window.location.hash.substring(1);
                    if (window.location.search.length > 0)
                        toSplit += ("&" + window.location.search.substring(1));

                    let _varsTemp = toSplit.split("&"),
                        vars = {};
                    _varsTemp.forEach(val => {
                        let split = val.split("="),
                            key = split.shift().toLowerCase();
                        if (!key.length) return;
                        vars[key] = split.shift();
                    });

                    let varKeys = Object.keys(vars);
                    for (let i = 0; i < varKeys.length; i++) {
                        let key = varKeys[i],
                            value = vars[key];
                        if (fromEvent === true) {
                            if (!self.params.hasOwnProperty(key) || self.params[key] !== vars[key]) {
                                let oldValue = self.params[key];
                                self.params[key] = vars[key] == null ? null : vars[key].toString();
                                self._trigger(key, oldValue, value); //if value == null || !value.length, shouldn't we be removing?
                            } else {
                            }
                        } else if (!self.params.hasOwnProperty(key)) {
                            self.params[key] = vars[key];
                        }
                    }

                    if (fromEvent === true) {
                        //Filter out removed params (removed from URL, but still present in self.params)
                        //Get self.params keys, filter out any that don't exist in varKeys, and for each remaining value, call `self.remove` on it.
                        Object.keys(self.params).filter(x => !varKeys.includes(x)).forEach(value => self.remove(value));
                    }

                    if (window.location.search.substring(1)) {
                        window.location = window.location.pathname + "#" + self.getStr();
                    }
                },
                setIfDifferent: function () {
                    //setIfDifferent({oo: 0.3, template: "https://i.trg0d.com/gpq0786uCk4"}, [silent=false]);
                    //setIfDifferent("template", "https://i.trg0d.com/gpq0786uCk4", [silent=false]);

                    let workWith = {},
                        silent = false;
                    if ((typeof arguments[0]) === "string") {
                        let key = arguments[0],
                            silent = arguments[2];
                        workWith[key] = arguments[1];
                    } else if ((typeof arguments[0]) === "object") {
                        workWith = arguments[0];
                        silent = arguments[1];
                    }
                    silent = silent == null ? false : silent === true; //set the default value if necessary or coerce to bool.
                    let KVPs = Object.entries(workWith);
                    for (let i = 0; i < KVPs.length; i++) {
                        let k = KVPs[i][0],
                            v = KVPs[i][1].toString();
                        if (self.get(k) === v)
                            continue;
                        self.set(k, v, silent);
                    }
                },
                init: function () {
                    if (ss.get("url_params")) {
                        window.location.hash = ss.get("url_params");
                        ss.remove("url_params");
                    } else {
                        self._update();

                        if ("replaceState" in window.history) {
                            // We disable this if `replaceState` is missing because this will call _update every time the `window.location.hash` is set programatically.
                            // Simply scrolling around the map would constantly call `board.centerOn` because x/y would be modified.
                            window.onhashchange = function () {
                                self._update(true);
                            };
                        }
                    }

                    $(window).on("message", function (evt) {
                        //TODO

                        // evt = evt.originalEvent;
                        // if (evt.data && evt.data.type && evt.data.data) {
                        //     let data = evt.data;
                        //     switch (data.type.toUpperCase().trim()) {
                        //         case "TEMPLATE_UPDATE":
                        //             template.queueUpdate(data.data);
                        //             break;
                        //         case "VIEWPORT_UPDATE":
                        //             board.updateViewport(data.data);
                        //             break;
                        //         default:
                        //             console.warn("Unknown data type: %o", data.type);
                        //             break;
                        //     }
                        // }
                    });
                },
                has: function (key) {
                    return self.get(key) != null;
                },
                getStr: function () {
                    let params = [];
                    for (let p in self.params) {
                        if (self.params.hasOwnProperty(p)) {
                            let s = encodeURIComponent(p);
                            if (self.params[p] !== null) {
                                let decoded = decodeURIComponent(self.params[p]),
                                    toSet = self.params[p];
                                if (decoded === toSet)
                                    toSet = encodeURIComponent(toSet); //ensure already URL-encoded values don't get re-encoded. if decoded === toSet, then it's already in an un-encoded form, and we can encode "safely".
                                s += "=" + toSet;
                            }
                            params.push(s);
                        }
                    }
                    return params.join("&");
                },
                update: function () {
                    let s = self.getStr();
                    if (window.history.replaceState) {
                        window.history.replaceState(null, null, '#' + s);
                    } else {
                        window.location.hash = s;
                    }
                },
                set: function (n, v, silent) {
                    let oldValue = self.params[n];
                    self.params[n] = v.toString();
                    if (silent !== true) self._trigger(n, oldValue, v.toString());
                    self.lazy_update();
                },
                get: function (n) {
                    return self.params[n];
                },
                remove: function (n, silent) {
                    delete self.params[n];
                    self.lazy_update();

                    if (silent !== true)
                        self._trigger(n, self.params[n], null);
                },
                timer: null,
                lazy_update: function () {
                    if (self.timer !== null) {
                        clearTimeout(self.timer);
                    }
                    self.timer = setTimeout(function () {
                        self.timer = null;
                        self.update();
                    }, 200);
                }
            };
            return {
                init: self.init,
                get: self.get,
                set: self.setIfDifferent,
                has: self.has,
                update: self.update,
                remove: self.remove,
                lazy_update: self.lazy_update
            };
        })(),
        socket = (function () {
            const self = {
                ws: null,
                ws_constructor: WebSocket,
                hooks: [],
                wps: WebSocket.prototype.send, // make sure we have backups of those....
                wpc: WebSocket.prototype.close,
                wsURL: '',
                setWSUrl: function(wsurl) {
                    self.wsURL = wsurl;
                },
                reconnect: function () {
                    $("#reconnecting").show();
                    setTimeout(function () {
                        $.get(window.location.pathname + "?_" + (new Date()).getTime(), function () {
                            window.location.reload();
                        }).fail(function () {
                            console.log("Server still down...");
                            self.reconnect();
                        });
                    }, 3000);
                },
                reconnectSocket: function () {
                    self.ws.onclose = function () { };
                    self.connectSocket();
                },
                connectSocket: function () {
                    self.ws = new self.ws_constructor(self.wsURL);
                    self.ws.onmessage = function (msg) {
                        let data = JSON.parse(msg.data);
                        self.hooks.forEach(hook => hook.type === data.type && hook.fn(data));
                    };
                    self.ws.onclose = function () {
                        self.reconnect();
                    };
                },
                init: function () {
                    if (self.ws !== null) {
                        return; // already inited!
                    }
                    let l = window.location,
                        url = ((l.protocol === "https:") ? "wss://" : "ws://") + l.host + l.pathname + "ws";
                    self.setWSUrl(url);
                    self.on("userinfo", ui.userinfo);
                    self.connectSocket();

                    $(window).on("beforeunload", function () {
                        self.ws.onclose = function () { };
                        self.close();
                    });

                    $("#board-container").show();
                    $("#ui").show();
                    $("#loading").fadeOut(500);
                    // user.wsinit();
                },
                on: function (type, fn) {
                    self.hooks.push({
                        type: type,
                        fn: fn
                    });
                },
                close: function () {
                    self.ws.close = self.wpc;
                    self.ws.close();
                },
                send: function (s) {
                    self.ws.send = self.wps;
                    if (typeof s == "string") {
                        self.ws.send(s);
                    } else {
                        self.ws.send(JSON.stringify(s));
                    }
                }
            };
            return {
                init: self.init,
                on: self.on,
                send: self.send,
                close: self.close,
                reconnect: self.reconnect,
                reconnectSocket: self.reconnectSocket,
                setWSURL: self.setWSUrl
            };
        })(),
        handlebars = (function() {
            let self = {
                init: function() {
                    //
                }
            };
            return {
                init: self.init
            }
        })(),
        modal = (function() {
            let self = {
                noop: () => {},
                _modals: [],
                _counter: 0,
                showText: text => {
                    self._show(crel("p", text));
                },
                showElem: elem => {
                    self._show(elem);
                },
                show: (obj) => {
                    if (obj instanceof HTMLElement) {
                        return self.showElem(obj);
                    } else return self.showText(obj);
                },
                _show: (elem, buttons) => {
                    console.log('Building modal for %o and buttons %o', elem, buttons);
                    //build the actual DOM for modal/backdrop
                    let modalBackdrop = crel("div", {"class": "modal-backdrop"});
                    let modalWrapper = crel("aside", {"class": "modal", "data-modal-id": ++self._counter});
                    let modalHeader = crel("header", {"class": "modal-header"},
                        crel("div", {"class": "right"},
                            crel("i", {"class": "fas fa-times modal-close-button cursor-pointer"})
                        )
                    );
                    let modalBody = crel("div", {"class": "modal-body"}, elem);
                    let modalFooter = crel("footer", {"class": "modal-footer"},
                        crel("div", {"class": "modal-footer-buttons"},
                            self.buttons(buttons)
                        )
                    );

                    //close modal if backdrop clicked
                    modalBackdrop.addEventListener("click", self._handleClose);

                    //append everything to the wrapper
                    crel(modalWrapper, modalHeader, modalBody, modalFooter);

                    //Add close handlers for every modal-close-button
                    Array.from(modalWrapper.querySelectorAll(".modal-close-button")).forEach(btn => {
                        btn.addEventListener("click", self._handleClose);
                    });

                    self._modals.push(modalWrapper);

                    if (!document.querySelector('.modal-backdrop')) {
                        document.body.append(modalBackdrop);
                    }
                    document.body.append(modalWrapper);
                    document.body.classList.add('modal-open');
                },
                buttons: (buttons=[], addOK = true) => {
                    if (buttons == null) buttons = [];
                    if (!Array.isArray(buttons)) buttons = [buttons];
                    if (addOK) {
                        buttons.push(self._button("OK", self._handleClose));
                    }
                    return buttons;
                },
                _button: (text, onclick) => {
                    if (typeof(onclick) !== "function") onclick = self.noop;
                    const toRet = crel("button", {"class": "button modal-button modal-close-button"}, text);
                    toRet.addEventListener("click", onclick);
                    return toRet;
                },
                _handleClose: e => {
                    console.debug('_handleClose(%o);', e);
                    if (!e.target) return console.warn('[MODAL:CLOSE] No target? Evt: %o', e);

                    let closestModal = e.target.closest('.modal') || self._modals[self._modals.length-1];
                    if (!closestModal) { //...? did our backdrop not get cleared? oh well, do some checks and reset as necessary.
                        if (!self._modals.length) {
                            self._maybeCleanupBackdrop();
                        } else {
                            let ghostModals = document.querySelectorAll('.modal');
                            if (ghostModals && ghostModals.length) {
                                console.warn('[MODAL:CLOSE] Ghost modals detected! Removing the following and resetting: %o', ghostModals);
                                Array.from(ghostModals).forEach(x => x.remove());
                                self._maybeCleanupBackdrop();
                                document.body.classList.remove('modal-open');
                            }
                        }
                        return console.warn('[MODAL:CLOSE] No closable modals found. Evt: %o, Modals: %o (from selector: %o)', e, self._modals, document.querySelectorAll('.modal'));
                    }

                    //Remove modal from internal array, and if it was the last modal, clean up classes/backdrop.
                    let _i = self._modals.findIndex(x => x.dataset['modalId'] === closestModal.dataset['modalId']);
                    self._modals[_i].remove();
                    self._modals.splice(_i, 1);
                    if (!self._modals.length) {
                        self._maybeCleanupBackdrop();
                        document.body.classList.remove('modal-open');
                    }
                },
                _maybeCleanupBackdrop: () => {
                    let backdrop = document.querySelector('.modal-backdrop');
                    backdrop && backdrop.remove();
                }
            };
            return {
                show: self.show,
                showElem: self.showElem,
                showText: self.showText,
                buttons: self.buttons
            };
        })(),
        polyfill = (function() {
            let self = {
                Element: {
                    Closest: () => {
                        console.debug('[POLY] Element#Closest');
                        if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

                        if (!Element.prototype.closest)
                            Element.prototype.closest = function(s) {
                                let el = this;

                                do {
                                    if (el.matches(s)) return el;
                                    el = el.parentElement || el.parentNode;
                                } while (el !== null && el.nodeType === 1);
                                return null;
                            };
                    }
                }
            };
            function recurseMaybe(x) {
                let _type = typeof x;
                switch(typeof x) {
                    case 'function': {
                        return x();
                    }
                    case 'object': {
                        Object.values(x).forEach(z => recurseMaybe(z));
                        break;
                    }
                }
            }
            return {
                fill: () => {
                    Object.values(self).forEach(val => {
                        recurseMaybe(val);
                    });
                }
            }
        })(),
        ui = (function() {
            let self = {
                elements: {
                    username: $(".userinfo-name")
                },
                userinfo: function(info) {
                    self.elements.username.removeClass("not-authed").text(info.username || "");
                },
                init: () => {
                    $.get('info.html').then(data => {
                        document.getElementById('info-target').innerHTML = data;
                    }).catch(e => {
                        document.getElementById('info-target').textContent = 'Failed to fetch info';
                    });
                }
            };
            return {
                userinfo: self.userinfo,
                init: self.init
            };
        })(),
        panels = (function() {
            let self = {
                init: () => {
                    Array.from(document.querySelectorAll(".panel-trigger")).forEach(panelTrigger => {
                        panelTrigger.addEventListener("click", e => {
                            if (!e.target) return console.debug('[PANELS:TRIGGER] No target?');
                            let closestTrigger = e.target.closest('.panel-trigger');
                            if (closestTrigger) {
                                let _panelDescriptor = closestTrigger.dataset['panel'];
                                if (_panelDescriptor && _panelDescriptor.trim()) {
                                    let targetPanel = document.querySelector(`.panel[data-panel="${_panelDescriptor.trim()}"]`);
                                    if (targetPanel) {
                                        Array.from(document.querySelectorAll('.panel')).forEach(x => x.classList.remove('open')); //Close other open panels
                                        targetPanel.classList.add('open');
                                    } else console.debug('[PANELS:TRIGGER] Bad descriptor? Got: %o', _panelDescriptor);
                                } else console.debug('[PANELS:TRIGGER] No descriptor? Elem: %o', closestTrigger);
                            } else console.debug('[PANELS:TRIGGER] No trigger?');
                        });
                    });
                    Array.from(document.querySelectorAll('.panel-closer')).forEach(panelClose => {
                        panelClose.addEventListener('click', e => {
                            if (!e.target) return console.debug('[PANELS:CLOSER] No target?');
                            let closestPanel = e.target.closest('.panel');
                            if (closestPanel) {
                                closestPanel.classList.toggle('open');
                            } else console.debug('[PANELS:CLOSER] No panel?');
                        });
                    });
                }
            };
            return {
                init: self.init
            };
        })(),
        // this takes care of browser notifications
        notification = (function () {
            let self = {
                init: function () {
                    try {
                        Notification.requestPermission().catch(e => {/*noop*/});
                    } catch (e) {
                        console.log('Notifications not available');
                    }
                },
                show: function (s) {
                    try {
                        let n = new Notification("pxls.space", {
                            body: s,
                            icon: "favicon.ico"
                        });
                        n.onclick = function () {
                            parent.focus();
                            window.focus();
                            this.close();
                        };
                    } catch (e) {
                        console.log("No notifications available!");
                    }
                }
            };
            return {
                init: self.init,
                show: self.show
            }
        })();
    // init progress

    // query.init();
    // board.init();
    // heatmap.init();
    // virginmap.init();
    // drawer.init();
    // lookup.init();
    // template.init();
    // ban.init();
    // grid.init();
    // place.init();
    // info.init();
    // alert.init();
    // timer.init();
    // uiHelper.init();
    // coords.init();
    // user.init();
    // notification.init();

    polyfill.fill();
    panels.init();
    ui.init();

    // and here we finally go...
    // board.start();



    return {
        ls,
        ss,
        query,
        handlebars,
        modal,
        notification,
        socket
    };
})();
