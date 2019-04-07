"use strict";
let instaban = false;
if (window.App !== undefined) {
    instaban = true;
}
window.App = (function () {
    // first we define the global helperfunctions and figure out what kind of settings our browser needs to use
    let storageFactory = function (storageType, prefix, exdays) {
            let haveSupport = null;
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
            function get(name) {
                let s = support() ? storageType.getItem(name) : getCookie(prefix + name);
                try {
                    return s === undefined ? null : JSON.parse(s);
                } catch (e) {
                    return null;
                }
            }
            function set(name, value) {
                value = JSON.stringify(value);
                if (support()) {
                    storageType.setItem(name, value);
                } else {
                    setCookie(prefix + name, value, exdays)
                }
            }
            function remove(name) {
                if (support()) {
                    storageType.removeItem(name);
                } else {
                    setCookie(prefix + name, '', -1);
                }
            }
            function support() {
                if (haveSupport === null) {
                    try {
                        storageType.setItem('test', '1');
                        haveSupport = (storageType.getItem('test') == '1');
                        storageType.removeItem('test');
                    } catch (e) {
                        haveSupport = false;
                    }
                }
                return haveSupport;
            }

            function noop() {}

            return {
                support,
                get,
                set,
                remove,
                generateToggleCheckbox: function(inputText, lsOption, options) {
                    options = Object.assign({defaultState: false, onchange: noop, indent: 0}, options);
                    let fetched = get(lsOption);
                    if (fetched == null) {
                        set(lsOption, options.defaultState);
                        fetched = options.defaultState;
                    }
                    let input = crel('input', {type: 'checkbox', 'data-option': lsOption});
                    input.checked = !!fetched;
                    input.addEventListener('change', function(e) {
                        set(lsOption, !!this.checked);
                        if (typeof options.onchange === 'function') options.onchange(e, !!this.checked);
                    });
                    return crel('label', {class: 'checkbox-label' + (options.indent > 0 ? ' indented' : ''), style: options.indent > 0 ? `text-indent: ${options.indent}rem` : ''}, input, inputText || '');
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
                _show: (elem, title, buttons) => {
                    //build the actual DOM for modal/backdrop
                    let modalBackdrop = crel("div", {"class": "modal-backdrop"});
                    let modalWrapper = crel("aside", {"class": "modal", "data-modal-id": ++self._counter});
                    let modalHeader = crel("header", {"class": "modal-header"},
                        crel("div", {"class": "left"}, crel("i", {"class": "fas fa-exclamation-triangle text-orange fa-1_5x fa-is-left", "style": "position: relative; top: 2px; text-shadow: #000 0 0 3px"})),
                        crel("div", {"class": "mid"}, title || "Pxls: Alert"),
                        crel("div", {"class": "right"}, crel("i", {"class": "fas fa-times modal-close-button cursor-pointer"}))
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
        // this takes care of placing pixels, the palette, the reticule and stuff associated with that
        place = (function () {
            const self = {
                elements: {
                    palette: $("#palette"),
                    cursor: $("#cursor"),
                    reticule: $("#reticule"),
                    undo: $("#undo")
                },
                undoTimeout: false,
                palette: [],
                reticule: {
                    x: 0,
                    y: 0
                },
                audio: new Audio('place.wav'),
                color: -1,
                pendingPixel: {
                    x: 0,
                    y: 0,
                    color: -1
                },
                autoreset: true,
                setAutoReset: function (v) {
                    self.autoreset = v ? true : false;
                    ls.set("auto_reset", self.autoreset);
                },
                switch: function (newColor) {
                    self.color = newColor;
                    ls.set('color', newColor);
                    $(".palette-color").removeClass("active");

                    $("body").toggleClass("show-placeable-bubble", newColor === -1);
                    if (newColor === -1) {
                        self.elements.cursor.hide();
                        self.elements.reticule.hide();
                        return;
                    }
                    if (self.scale <= 15) {
                        self.elements.cursor.show();
                    }
                    self.elements.cursor.css("background-color", self.palette[newColor]);
                    self.elements.reticule.css("background-color", self.palette[newColor]);
                    if (newColor !== -1) {
                        $($(".palette-color[data-idx=" + newColor + "],.palette-color[data-idx=-1]")).addClass("active"); //Select both the new color AND the deselect button. Signifies more that it's a deselect button rather than a "delete pixel" button
                    }
                },
                place: function (x, y) {
                    return;
                    //TODO
                    // if (!timer.cooledDown() || self.color === -1) { // nope can't place yet
                    //     return;
                    // }
                    self._place(x, y);
                },
                _place: function (x, y) {
                    self.pendingPixel.x = x;
                    self.pendingPixel.y = y;
                    self.pendingPixel.color = self.color;
                    socket.send({
                        type: "pixel",
                        x: x,
                        y: y,
                        color: self.color
                    });

                    analytics("send", "event", "Pixels", "Place");
                    if (self.autoreset) {
                        self.switch(-1);
                    }
                },
                update: function (clientX, clientY) {
                    if (clientX !== undefined) {
                        const boardPos = board.fromScreen(clientX, clientY);
                        self.reticule = {
                            x: boardPos.x |= 0,
                            y: boardPos.y |= 0
                        };
                        status.setValue(status.DefaultKeyMap['cursor-pos'], `(${self.reticule.x}, ${self.reticule.y})`);
                    }
                    if (self.color === -1) {
                        self.elements.reticule.hide();
                        self.elements.cursor.hide();
                        return;
                    }
                    const screenPos = board.toScreen(self.reticule.x, self.reticule.y),
                        scale = board.getScale();
                    self.elements.reticule.css({
                        left: screenPos.x - 1,
                        top: screenPos.y - 1,
                        width: scale - 1,
                        height: scale - 1
                    }).show();
                    self.elements.cursor.show();
                },
                setNumberedPaletteEnabled: function(shouldBeNumbered) {
                    self.elements.palette[0].classList.toggle('no-pills', !shouldBeNumbered);
                },
                setNumberedPaletteBase: function(base) {
                    base >>= 0;
                    self.elements.palette[0].querySelectorAll('.palette-number').forEach(x => x.textContent = (x.dataset['idx'] >> 0) + base);
                },
                setPalette: function (palette) {
                    self.palette = palette;
                    self.elements.palette.find(".palette-color").remove().end().append(
                        $.map(self.palette, function (p, idx) {
                            return $("<div>")
                                .attr("data-idx", idx)
                                .addClass("palette-color")
                                .addClass("ontouchstart" in window ? "touch" : "no-touch")
                                .css("background-color", self.palette[idx])
                                .append(
                                    $("<span>").addClass("palette-number").text(idx)
                                )
                                .click(function () {
                                    self.switch(idx);
                                    //TODO
                                    // if (ls.get("auto_reset") === false || timer.cooledDown()) {
                                    // }
                                });
                        })
                    );
                    self.elements.palette.prepend(
                        $("<div>")
                            .attr("data-idx", -1)
                            .addClass("palette-color no-border deselect-button")
                            .addClass("ontouchstart" in window ? "touch" : "no-touch").css("background-color", "transparent")
                            .click(function () {
                                self.switch(-1);
                            })
                    );
                },
                can_undo: false,
                undo: function (evt) {
                    evt.stopPropagation();
                    socket.send({type: 'undo'});
                    self.can_undo = false;
                    document.body.classList.remove("undo-visible");
                    self.elements.undo.removeClass("open");
                },
                init: function () {
                    self.elements.reticule.hide();
                    self.elements.cursor.hide();
                    document.body.classList.remove("undo-visible");
                    self.elements.undo.removeClass("open");
                    console.log('attaching mousemove to board: %o', board.getRenderBoard());
                    board.getRenderBoard().on("pointermove mousemove", function (evt) {
                        self.update(evt.clientX, evt.clientY);
                    });
                    $(window).on("pointermove mousemove touchstart touchmove", function (evt) {
                        let x = 0,
                            y = 0;
                        if (evt.changedTouches && evt.changedTouches[0]) {
                            x = evt.changedTouches[0].clientX;
                            y = evt.changedTouches[0].clientY;
                        } else {
                            x = evt.clientX;
                            y = evt.clientY;
                        }

                        self.elements.cursor.css("transform", "translate(" + x + "px, " + y + "px)");
                        if (self.can_undo) {
                            return;
                        }
                    }).keydown(function (evt) {
                        if (self.can_undo && (evt.key == "z" || evt.key == "Z" || evt.keyCode == 90) && evt.ctrlKey) {
                            self.undo(evt);
                        }
                    }).on("touchstart", function (evt) {
                        if (self.color === -1 || self.can_undo) {
                            return;
                        }
                    });
                    socket.on("pixel", function (data) {
                        $.map(data.pixels, function (px) {
                            board.setPixel(px.x, px.y, px.color, false);
                        });
                        board.refresh();
                        board.update(true);
                    });
                    socket.on("ACK", function (data) {
                        switch (data.ackFor) {
                            case "PLACE":
                                if (!ls.get("audio_muted")) {
                                    const clone = self.audio.cloneNode(false);
                                    clone.volume = parseFloat(ls.get("alert.volume"));
                                    clone.play();
                                }
                            case "UNDO":
                                if (uiHelper.getAvailable() === 0)
                                    uiHelper.setPlaceableText(data.ackFor === "PLACE" ? 0 : 1);
                                break;
                        }
                    });
                    socket.on("captcha_required", function (data) {
                        grecaptcha.reset();
                        grecaptcha.execute();

                        analytics("send", "event", "Captcha", "Execute")
                    });
                    socket.on("captcha_status", function (data) {
                        if (data.success) {
                            const pending = self.pendingPixel;
                            self.switch(pending.color);
                            self._place(pending.x, pending.y);

                            analytics("send", "event", "Captcha", "Accepted")
                        } else {
                            alert.show("Failed captcha verification");
                            analytics("send", "event", "Captcha", "Failed")
                        }
                    });
                    socket.on("can_undo", function (data) {
                        document.body.classList.add("undo-visible");
                        self.elements.undo.addClass("open");
                        self.can_undo = true;
                        if (self.undoTimeout !== false) clearTimeout(self.undoTimeout);
                        self.undoTimeout = setTimeout(function () {
                            document.body.classList.remove("undo-visible");
                            self.elements.undo.removeClass("open");
                            self.can_undo = false;
                            self.undoTimeout = false;
                        }, data.time * 1000);
                    });
                    self.elements.undo.click(self.undo);
                    window.recaptchaCallback = function (token) {
                        socket.send({
                            type: "captcha",
                            token: token
                        });
                        analytics("send", "event", "Captcha", "Sent")
                    };
                    self.elements.palette.on("wheel", e => {
                        if (ls.get("scrollSwitchEnabled") !== true) return;
                        let delta = e.originalEvent.deltaY * -40;
                        let newVal = (self.color + ((delta > 0 ? 1 : -1) * (ls.get("scrollSwitchDirectionInverted") === true ? -1 : 1))) % self.palette.length;
                        self.switch(newVal <= -1 ? self.palette.length - 1 : newVal);
                    });
                },
                hexToRgb: function (hex) {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                    } : null;
                },
                getPaletteRGB: function () {
                    const a = new Uint32Array(self.palette.length);
                    $.map(self.palette, function (c, i) {
                        const rgb = self.hexToRgb(c);
                        a[i] = 0xff000000 | rgb.b << 16 | rgb.g << 8 | rgb.r;
                    });
                    return a;
                }
            };
            return {
                init: self.init,
                update: self.update,
                place: self.place,
                switch: self.switch,
                setPalette: self.setPalette,
                getPaletteRGB: self.getPaletteRGB,
                setAutoReset: self.setAutoReset,
                setNumberedPaletteEnabled: self.setNumberedPaletteEnabled,
                setNumberedPaletteBase: self.setNumberedPaletteBase,
                get color() {
                    return self.color;
                }
            };
        })(),
        heatmap = (function () {
            const self = {
                elements: {
                    heatmap: $("#heatmap"),
                    heatmapLoadingBubble: $("#heatmapLoadingBubble")
                },
                ctx: null,
                id: null,
                intView: null,
                width: 0,
                height: 0,
                lazy_inited: false,
                is_shown: false,
                color: 0x005C5CCD,
                loop: function () {
                    for (let i = 0; i < self.width * self.height; i++) {
                        let opacity = self.intView[i] >> 24;
                        if (opacity) {
                            opacity--;
                            self.intView[i] = (opacity << 24) | self.color;
                        }
                    }
                    self.ctx.putImageData(self.id, 0, 0);
                    setTimeout(self.loop, self.seconds * 1000 / 256);
                },
                lazy_init: function () {
                    if (self.lazy_inited) {
                        self.elements.heatmapLoadingBubble.hide();
                        return;
                    }
                    self.elements.heatmapLoadingBubble.show();
                    self.lazy_inited = true;
                    // we use xhr directly because of jquery being weird on raw binary
                    binary_ajax("/heatmap" + "?_" + (new Date()).getTime(), function (data) {
                        self.ctx = self.elements.heatmap[0].getContext("2d");
                        self.ctx.mozImageSmoothingEnabled = self.ctx.webkitImageSmoothingEnabled = self.ctx.msImageSmoothingEnabled = self.ctx.imageSmoothingEnabled = false;
                        self.id = createImageData(self.width, self.height);

                        self.intView = new Uint32Array(self.id.data.buffer);
                        for (let i = 0; i < self.width * self.height; i++) {
                            self.intView[i] = (data[i] << 24) | self.color;
                        }
                        self.ctx.putImageData(self.id, 0, 0);
                        self.elements.heatmap.fadeIn(200);
                        self.elements.heatmapLoadingBubble.hide();
                        setTimeout(self.loop, self.seconds * 1000 / 256);
                        socket.on("pixel", function (data) {
                            self.ctx.fillStyle = "#CD5C5C";
                            $.map(data.pixels, function (px) {
                                self.ctx.fillRect(px.x, px.y, 1, 1);
                                self.intView[px.y * self.width + px.x] = 0xFF000000 | self.color;
                            });
                        });
                    });
                },
                clear: function () {
                    self._clear();
                },
                _clear: function () {
                    for (let i = 0; i < self.width * self.height; i++) {
                        self.intView[i] = 0;
                    }
                    self.ctx.putImageData(self.id, 0, 0);
                },
                setBackgroundOpacity: function (opacity) {
                    if (typeof (opacity) === "string") {
                        opacity = parseFloat(opacity);
                        if (isNaN(opacity)) opacity = 0.5;
                    }
                    if (opacity === null || opacity === undefined) opacity = 0.5;
                    if (opacity < 0 || opacity > 1) opacity = 0.5;

                    ls.set("heatmap_background_opacity", opacity);
                    self.elements.heatmap.css("background-color", "rgba(0, 0, 0, " + opacity + ")");
                },
                init: function () {
                    self.elements.heatmap.hide();
                    self.elements.heatmapLoadingBubble.hide();
                    self.setBackgroundOpacity(ls.get("heatmap_background_opacity"));
                    // $("#heatmap-opacity").val(ls.get("heatmap_background_opacity")); //heatmap_background_opacity should always be valid after a call to self.setBackgroundOpacity.
                    // $("#heatmap-opacity").on("change input", function () {
                    //     self.setBackgroundOpacity(parseFloat(this.value));
                    // });
                    // $("#hvmapClear").click(function () {
                    //     self.clear();
                    // });
                    // $(window).keydown(function (evt) {
                    //     if (evt.key == "o" || evt.key == "O" || evt.which == 79) { //O key
                    //         self.clear();
                    //     }
                    // });
                },
                show: function () {
                    self.is_shown = false;
                    self.toggle();
                },
                hide: function () {
                    self.is_shown = true;
                    self.toggle();
                },
                toggle: function () {
                    self.is_shown = !self.is_shown;
                    ls.set("heatmap", self.is_shown);
                    // $("#heatmaptoggle")[0].checked = self.is_shown;
                    if (self.lazy_inited) {
                        if (self.is_shown) {
                            this.elements.heatmap.fadeIn(200);
                        } else {
                            this.elements.heatmap.fadeOut(200);
                        }
                        return;
                    }
                    if (self.is_shown) {
                        self.lazy_init();
                    }
                },
                webinit: function (data) {
                    self.width = data.width;
                    self.height = data.height;
                    self.seconds = data.heatmapCooldown;
                    self.elements.heatmap.attr({
                        width: self.width,
                        height: self.height
                    });
                    if (ls.get("heatmap")) {
                        self.show();
                    }
                    // $("#heatmaptoggle")[0].checked = ls.get("heatmap");
                    // $("#heatmaptoggle").change(function () {
                    //     if (this.checked) {
                    //         self.show();
                    //     } else {
                    //         self.hide();
                    //     }
                    // });

                    // $(window).keydown(function (e) {
                    //     if (e.key == "h" || e.key == "H" || e.which == 72) { // h key
                    //         self.toggle();
                    //         $("#heatmaptoggle")[0].checked = ls.get("heatmap");
                    //     }
                    // });
                }
            };
            return {
                init: self.init,
                webinit: self.webinit,
                toggle: self.toggle,
                setBackgroundOpacity: self.setBackgroundOpacity,
                clear: self.clear
            };
        })(),
        // Virginmaps are like heatmaps
        virginmap = (function () {
            const self = {
                elements: {
                    virginmap: $("#virginmap"),
                    virginmapLoadingBubble: $("#virginmapLoadingBubble")
                },
                ctx: null,
                id: null,
                width: 0,
                height: 0,
                lazy_inited: false,
                is_shown: false,
                lazy_init: function () {
                    if (self.lazy_inited) {
                        self.elements.virginmapLoadingBubble.hide();
                        return;
                    }
                    self.elements.virginmapLoadingBubble.show();
                    self.lazy_inited = true;
                    // we use xhr directly because of jquery being weird on raw binary
                    binary_ajax("/virginmap" + "?_" + (new Date()).getTime(), function (data) {
                        self.ctx = self.elements.virginmap[0].getContext("2d");
                        self.ctx.mozImageSmoothingEnabled = self.ctx.webkitImageSmoothingEnabled = self.ctx.msImageSmoothingEnabled = self.ctx.imageSmoothingEnabled = false;
                        self.id = createImageData(self.width, self.height);

                        self.ctx.putImageData(self.id, 0, 0);
                        self.ctx.fillStyle = "#000000";

                        self.intView = new Uint32Array(self.id.data.buffer);
                        for (let i = 0; i < self.width * self.height; i++) {
                            const x = i % self.width;
                            const y = Math.floor(i / self.width);
                            if (data[i] === 0) {
                                self.ctx.fillRect(x, y, 1, 1);
                            }
                        }
                        self.elements.virginmap.fadeIn(200);
                        self.elements.virginmapLoadingBubble.hide();
                        socket.on("pixel", function (data) {
                            $.map(data.pixels, function (px) {
                                self.ctx.fillRect(px.x, px.y, 1, 1);
                            });
                        });
                    });
                },
                clear: function () {
                    self._clear();
                },
                _clear: function () {
                    self.ctx.putImageData(self.id, 0, 0);
                    self.ctx.fillStyle = "#00FF00";
                    self.ctx.fillRect(0, 0, self.width, self.height);
                },
                setBackgroundOpacity: function (opacity) {
                    if (typeof (opacity) === "string") {
                        opacity = parseFloat(opacity);
                        if (isNaN(opacity)) opacity = 0.5;
                    }
                    if (opacity === null || opacity === undefined) opacity = 0.5;
                    if (opacity < 0 || opacity > 1) opacity = 0.5;

                    ls.set("virginmap_background_opacity", opacity);
                    self.elements.virginmap.css("background-color", "rgba(0, 255, 0, " + opacity + ")");
                },
                init: function () {
                    self.elements.virginmap.hide();
                    self.elements.virginmapLoadingBubble.hide();
                    self.setBackgroundOpacity(ls.get("virginmap_background_opacity"));
                    $("#virginmap-opacity").val(ls.get("virginmap_background_opacity")).on("change input", function () {
                        self.setBackgroundOpacity(parseFloat(this.value));
                    });
                    $("#hvmapClear").on('click', function () {
                        self.clear();
                    });
                    $(window).keydown(function (evt) {
                        if (evt.key == "o" || evt.key == "O" || evt.which == 79) { //O key
                            self.clear();
                        }
                    });
                },
                show: function () {
                    self.is_shown = false;
                    self.toggle();
                },
                hide: function () {
                    self.is_shown = true;
                    self.toggle();
                },
                toggle: function () {
                    self.is_shown = !self.is_shown;
                    ls.set("virginmap", self.is_shown);
                    $("#virginmaptoggle")[0].checked = self.is_shown;
                    if (self.lazy_inited) {
                        if (self.is_shown) {
                            this.elements.virginmap.fadeIn(200);
                        } else {
                            this.elements.virginmap.fadeOut(200);
                        }
                        return;
                    }
                    if (self.is_shown) {
                        self.lazy_init();
                    }
                },
                webinit: function (data) {
                    self.width = data.width;
                    self.height = data.height;
                    self.seconds = data.virginmapCooldown;
                    self.elements.virginmap.attr({
                        width: self.width,
                        height: self.height
                    });
                    if (ls.get("virginmap")) {
                        self.show();
                    }
                    //TODO panels.getBodyFor('settings').querySelector('.checkbox-target').appendChild(settings.registerToggleCheckbox('virginmap-enabled'));
                    //registerToggleCheckbox -> input[type='check' data-setting='virginmap-enabled'].on('click', App.ls.toggle('virginmap-enabled'));



//                     $("#virginmaptoggle")[0].checked = ls.get("virginmap");
//                     $("#virginmaptoggle").change(function () {
//                         if (this.checked) {
//                             self.show();
//                         } else {
//                             self.hide();
//                         }
//                     });

//                     $(window).keydown(function (e) {
//                         if (e.key == "x" || e.key == "X" || e.which == 88) { // x key
//                             self.toggle();
//                             $("#virginmaptoggle")[0].checked = ls.get("virginmap");
//                         }
//                     });
                }
            };
            return {
                init: self.init,
                webinit: self.webinit,
                toggle: self.toggle,
                setBackgroundOpacity: self.setBackgroundOpacity,
                clear: self.clear
            };
        })(),
        user = (function () {
            let self = {
                elements: {
                    users: $("#online"),
                    userInfo: $("#userinfo"),
                    loginOverlay: $("#login-overlay"),
                    userMessage: $("#user-message"),
                    prompt: $("#prompt"),
                    signup: $("#signup")
                },
                role: "USER",
                pendingSignupToken: null,
                loggedIn: false,
                _data: false,
                _userinfo: false,
                getRole: function () {
                    return self.role;
                },
                signin: function () {
                    let data = ls.get("auth_respond");
                    if (!data) {
                        return;
                    }
                    ls.remove("auth_respond");
                    if (data.signup) {
                        self.pendingSignupToken = data.token;
                        self.elements.signup.fadeIn(200);
                    } else {
                        socket.reconnectSocket();
                    }
                    self.elements.prompt.fadeOut(200);
                },
                isLoggedIn: function () {
                    return self.loggedIn;
                },
                webinit: function (data) {
                    self._data = data;
                    self.elements.loginOverlay.find("a").on("click", function (evt) {
                        evt.preventDefault();
                        // self.elements.prompt.empty().append(
                        //     $("<h1>").html("Sign&nbsp;in&nbsp;with..."),
                        //     $("<ul>").append(
                        //         $.map(data.authServices, function (a) {
                        //             return $("<li>").append(
                        //                 $("<a>").attr("href", "/signin/" + a.id + "?redirect=1").text(a.name).on("click", function (evt) {
                        //                     if (window.open(this.href, "_blank")) {
                        //                         evt.preventDefault();
                        //                         return;
                        //                     }
                        //                     ls.set("auth_same_window", true);
                        //                 })
                        //             );
                        //         })
                        //     ),
                        //     $("<div>").addClass("button").text("Close").css({
                        //         position: "fixed",
                        //         bottom: 20,
                        //         right: 30,
                        //         width: 55
                        //     }).click(function () {
                        //         self.elements.prompt.fadeOut(200);
                        //     })
                        // ).fadeIn(200);
                    });
                },
                wsinit: function () {
                    if (ls.get("auth_proceed")) {
                        // we need to authenticate...
                        ls.remove("auth_proceed");
                        self.signin();
                    }
                },
                doSignup: function () {
                    if (!self.pendingSignupToken) return;

                    $.post({
                        type: "POST",
                        url: "/signup",
                        data: {
                            token: self.pendingSignupToken,
                            username: self.elements.signup.find("input").val()
                        },
                        success: function () {
                            self.elements.signup.find("#error").text("");
                            self.elements.signup.find("input").val("");
                            self.elements.signup.fadeOut(200);
                            socket.reconnectSocket();
                            self.pendingSignupToken = null;
                        },
                        error: function (data) {
                            self.elements.signup.find("#error").text(data.responseJSON.message);
                        }
                    });
                },
                init: function () {
                    $(window).on('pxls:draw.finished', () => {
                        document.querySelector('.userinfo-name').textContent = self._userinfo === false ? 'Log In/Register' : self._userinfo.username || '-snip-';
                    });
                    self.elements.userMessage.hide();
                    self.elements.signup.hide();
                    self.elements.signup.find("input").keydown(function (evt) {
                        evt.stopPropagation();
                        if (evt.key == "Enter" || evt.which === 13) {
                            self.doSignup();
                        }
                    });
                    self.elements.signup.find("#signup-button").click(self.doSignup);
                    self.elements.users.hide();
                    // self.elements.userInfo.hide();
                    self.elements.userInfo.find(".logout").click(function (evt) {
                        evt.preventDefault();
                        $.get("/logout", function () {
                            self.elements.userInfo.fadeOut(200);
                            self.elements.userMessage.fadeOut(200);
                            self.elements.loginOverlay.fadeIn(200);
                            if (window.deInitAdmin) {
                                window.deInitAdmin();
                            }
                            self.loggedIn = false;
                            socket.reconnectSocket();
                        });
                    });
                    $(window).bind("storage", function (evt) {
                        if (evt.originalEvent.key == "auth") {
                            ls.remove("auth");
                            self.signin();
                        }
                    });
                    socket.on("users", function (data) {
                        status.setValue(status.DefaultKeyMap['online-count'], data.count);
                    });
                    socket.on("session_limit", function (data) {
                        socket.close();
                        alert.show("Too many sessions open, try closing some tabs.");
                    });
                    socket.on("userinfo", function (data) {
                        let isBanned = false,
                            banelem = $("<div>").addClass("ban-alert-content");
                        self.loggedIn = true;
                        self.elements.loginOverlay.fadeOut(200);
                        self._userinfo = data;
                        document.querySelector('.userinfo-name').textContent = data.username;
                        self.elements.userInfo.find("span.name").text(data.username);
                        if (data.method == 'ip') {
                            self.elements.userInfo.hide();
                        } else {
                            self.elements.userInfo.fadeIn(200);
                        }
                        self.role = data.role;

                        if (self.role == "BANNED") {
                            isBanned = true;
                            banelem.append(
                                $("<p>").text("You are permanently banned.")
                            );
                        } else if (data.banned === true) {
                            isBanned = true;
                            banelem.append(
                                $("<p>").text(`You are temporarily banned and will not be allowed to place until ${new Date(data.banExpiry).toLocaleString()}`)
                            );
                        } else if (["TRIALMOD", "MODERATOR", "DEVELOPER", "ADMIN"].indexOf(self.role) != -1) {
                            if (window.deInitAdmin) {
                                window.deInitAdmin();
                            }
                            $.getScript("admin/admin.js").done(function () {
                                window.initAdmin({
                                    socket: socket,
                                    user: user,
                                    place: place,
                                    alert: alert,
                                    lookup: lookup
                                });
                            });
                        } else if (window.deInitAdmin) {
                            window.deInitAdmin();
                        }
                        if (isBanned) {
                            self.elements.userMessage.show().text("You can contact us using one of the links in the info menu.").fadeIn(200);
                            banelem.append(
                                $("<p>").text("If you think this was an error, please contact us using one of the links in the info tab.")
                            ).append(
                                $("<p>").append("Ban reason:")
                            ).append(
                                $("<p>").append(data.ban_reason)
                            );
                            alert.showElem(banelem);
                            if (window.deInitAdmin) {
                                window.deInitAdmin();
                            }
                        } else {
                            self.elements.userMessage.hide();
                        }

                        if (instaban) {
                            ban.shadow(5);
                        }

                        analytics("send", "event", "Auth", "Login", data.method);
                    });
                }
            };
            return {
                init: self.init,
                getRole: self.getRole,
                webinit: self.webinit,
                wsinit: self.wsinit,
                isLoggedIn: self.isLoggedIn
            };
        })(),
        board = (function () {
            let self = {
                elements: {
                    board: $("#mainCanvas"),
                    board_render: null, // populated on init based on rendering method
                    mover: $("#pan"),
                    zoomer: $("#zoom"),
                    container: $("#gameWrapper")
                },
                ctx: null,
                use_js_render: !have_image_rendering && !have_zoom_rendering,
                use_zoom: !have_image_rendering && have_zoom_rendering,
                width: 0,
                height: 0,
                scale: 1,
                id: null,
                intView: null,
                pan: {
                    x: 0,
                    y: 0
                },
                allowDrag: true,
                pannedWithKeys: false,
                rgbPalette: [],
                loaded: false,
                pixelBuffer: [],
                holdTimer: {
                    id: -1,
                    holdTimeout: 500,
                    handler: args => {
                        self.holdTimer.id = -1;
                        lookup.runLookup(args.x, args.y);
                    }
                },
                updateViewport: data => {
                    if (!isNaN(data.scale)) self.scale = parseFloat(data.scale);
                    self.centerOn(data.x, data.y);
                },
                centerOn: function (x, y) {
                    if (x != null) self.pan.x = (self.width / 2 - x);
                    if (y != null) self.pan.y = (self.height / 2 - y);
                    self.update();
                },
                replayBuffer: () => {
                    $.map(self.pixelBuffer, function (p) {
                        self.setPixel(p.x, p.y, p.c, false);
                    });
                    self.refresh();
                    self.pixelBuffer = [];
                },
                draw: (data) => {
                    self.id = createImageData(self.width, self.height);
                    self.ctx.mozImageSmoothingEnabled = self.ctx.webkitImageSmoothingEnabled = self.ctx.msImageSmoothingEnabled = self.ctx.imageSmoothingEnabled = false;

                    self.intView = new Uint32Array(self.id.data.buffer);
                    self.rgbPalette = place.getPaletteRGB();

                    for (let i = 0; i < self.width * self.height; i++) {
                        if (data[i] == 0xFF) {
                            self.intView[i] = 0x00000000; // transparent pixel!
                        } else {
                            self.intView[i] = self.rgbPalette[data[i]];
                        }
                    }

                    self.ctx.putImageData(self.id, 0, 0);
                    self.update();
                    self.loaded = true;
                    self.replayBuffer();
                    $(window).trigger('pxls:draw.finished');
                },
                initInteraction: function () {
                    // first zooming and stuff
                    let handleMove = function (evt) {
                        if (!self.allowDrag) return;
                        self.pan.x += evt.dx / self.scale;
                        self.pan.y += evt.dy / self.scale;

                        self.update();
                    };

                    interact(self.elements.container[0]).draggable({
                        inertia: true,
                        onmove: handleMove
                    }).gesturable({
                        onmove: function (evt) {
                            self.scale *= (1 + evt.ds);
                            handleMove(evt);
                        }
                    });

                    self.elements.container[0].addEventListener("wheel", function (evt) {
                        if (!self.allowDrag) return;
                        const oldScale = self.scale;
                        if (evt.deltaY > 0) {
                            self.nudgeScale(-1);
                        } else {
                            self.nudgeScale(1);
                        }

                        if (oldScale !== self.scale) {
                            const dx = evt.clientX - self.elements.container.width() / 2;
                            const dy = evt.clientY - self.elements.container.height() / 2;
                            self.pan.x -= dx / oldScale;
                            self.pan.x += dx / self.scale;
                            self.pan.y -= dy / oldScale;
                            self.pan.y += dy / self.scale;
                            self.update();
                            place.update();
                        }
                    }, { passive: true });

                    // now init the movement
                    let downX, downY, downStart;
                    self.elements.board_render.on("pointerdown mousedown", handleInputDown)
                        .on("pointermove mousemove", handleInputMove)
                        .on("pointerup mouseup touchend", handleInputUp)
                        .contextmenu(function (evt) {
                            evt.preventDefault();
                            place.switch(-1);
                        });

                    //Separated some of these events from jQuery to deal with chrome's complaints about passive event violations.
                    self.elements.board_render[0].addEventListener("touchstart", handleInputDown, { passive: false });
                    self.elements.board_render[0].addEventListener("touchmove", handleInputMove, { passive: false });

                    function handleInputDown(event) {
                        let clientX = 0,
                            clientY = 0,
                            prereq = true;
                        if (event.changedTouches && event.changedTouches[0]) {
                            clientX = event.changedTouches[0].clientX;
                            clientY = event.changedTouches[0].clientY;
                        } else {
                            clientX = event.clientX;
                            clientY = event.clientY;
                            if (event.button != null) prereq = event.button === 0; //if there are buttons, is the the left mouse button?
                        }
                        downX = clientX;
                        downY = clientY;
                        if (prereq && self.holdTimer.id === -1) {
                            self.holdTimer.id = setTimeout(self.holdTimer.handler, self.holdTimer.holdTimeout, { x: clientX, y: clientY });
                        }
                        downStart = Date.now();
                    }
                    function handleInputMove(event) {
                        if (self.holdTimer.id === -1) return;
                        let clientX = -1, clientY = -1;

                        if (event.changedTouches && event.changedTouches[0]) {
                            clientX = event.changedTouches[0].clientX;
                            clientY = event.changedTouches[0].clientY;
                        } else {
                            clientX = event.clientX;
                            clientY = event.clientY;
                        }
                        if (Math.abs(downX - clientX) > 5 || Math.abs(downY - clientY) > 5) {
                            clearTimeout(self.holdTimer.id);
                            self.holdTimer.id = -1;
                        }
                    }
                    function handleInputUp(event) {
                        if (self.holdTimer.id !== -1) {
                            clearTimeout(self.holdTimer.id);
                        }
                        if (event.shiftKey === true) return;
                        self.holdTimer.id = -1;
                        let touch = false,
                            clientX = event.clientX,
                            clientY = event.clientY,
                            downDelta = Date.now() - downStart;
                        if (event.type === 'touchend') {
                            touch = true;
                            clientX = event.changedTouches[0].clientX;
                            clientY = event.changedTouches[0].clientY;
                        }
                        const dx = Math.abs(downX - clientX),
                            dy = Math.abs(downY - clientY);
                        if ((event.button === 0 || touch) && downDelta < 500) {
                            if (!self.allowDrag && dx < 25 && dy < 25) {
                                let pos = self.fromScreen(downX, downY);
                                place.place(pos.x | 0, pos.y | 0);
                            } else if (dx < 5 && dy < 5) {
                                let pos = self.fromScreen(clientX, clientY);
                                place.place(pos.x | 0, pos.y | 0);
                            }
                        }
                        downDelta = 0;
                        if (event.button != null) {
                            // Is the button pressed the middle mouse button?
                            if (ls.get("enableMiddleMouseSelect") === true && event.button === 1 && dx < 15 && dy < 15) {
                                // If so, switch to the color at the location.
                                let { x, y } = self.fromScreen(event.clientX, event.clientY);
                                place.switch(self.getPixel(x, y));
                            }
                        }
                    }
                },
                init: function () {
                    $(window).on("pxls:queryUpdated", (evt, propName, oldValue, newValue) => {
                        switch (propName.toLowerCase()) {
                            case "x":
                            case "y":
                                board.centerOn(query.get("x") >> 0, query.get("y") >> 0);
                                break;
                            case "scale":
                                board.setScale(newValue >> 0);
                                break;
                            case "template":
                                template.queueUpdate({ template: newValue, use: newValue !== null });
                                break;
                            case "ox":
                                template.queueUpdate({ ox: newValue === null ? null : newValue >> 0 });
                                break;
                            case "oy":
                                template.queueUpdate({ oy: newValue === null ? null : newValue >> 0 });
                                break;
                            case "tw":
                                template.queueUpdate({ tw: newValue === null ? null : newValue >> 0 });
                                break;
                            case "oo":
                                let parsed = parseFloat(newValue);
                                if (!Number.isFinite(parsed)) parsed = null;
                                template.queueUpdate({ oo: parsed === null ? null : parsed });
                                break;
                        }
                    });
                    // $("#ui").hide();
                    // self.elements.container.hide();

                    if (self.use_js_render) {
                        self.elements.board_render = $('<canvas>').css({
                            width: '100vw',
                            height: '100vh',
                            margin: 0,
                            marginTop: 3 // wtf? Noticed by experimenting
                        });
                        self.elements.board.parent().append(self.elements.board_render);
                        self.elements.board.detach();
                    } else {
                        self.elements.board_render = self.elements.board;
                    }
                    self.ctx = self.elements.board[0].getContext("2d");
                    self.initInteraction();

                    $("#snapshotImageFormat").val(ls.get("snapshotImageFormat") || 'image/png').on("change input", event => {
                        ls.set("snapshotImageFormat", event.target.value);
                    });
                },
                start: function () {
                    $.get("/info", function (data) {
                        heatmap.webinit(data);
                        virginmap.webinit(data);
                        user.webinit(data);
                        self.width = data.width;
                        self.height = data.height;
                        place.setPalette(data.palette);
//                         uiHelper.setMax(data.maxStacked);
                        if (data.captchaKey) {
                            $(".g-recaptcha").attr("data-sitekey", data.captchaKey);

                            $.getScript('https://www.google.com/recaptcha/api.js');
                        }
                        self.elements.board.attr({
                            width: self.width,
                            height: self.height
                        });

                        const cx = query.get("x") || self.width / 2,
                            cy = query.get("y") || self.height / 2;
                        self.scale = query.get("scale") || self.scale;
                        self.centerOn(cx, cy);
                        socket.init();
                        binary_ajax("/boarddata" + "?_" + (new Date()).getTime(), self.draw, socket.reconnect);

                        if (self.use_js_render) {
                            $(window).on('resize', function () {
                                self.update();
                            }).trigger('resize');
                        } else {
                            $(window).on('resize', function () {
                                place.update();
                                grid.update();
                            });
                        }
                        const url = query.get("template");
                        if (url) { // we have a template!
                            template.queueUpdate({
                                use: true,
                                x: parseFloat(query.get("ox")),
                                y: parseFloat(query.get("oy")),
                                opacity: parseFloat(query.get("oo")),
                                width: parseFloat(query.get("tw")),
                                url: url
                            });
                        }
                        let spin = parseFloat(query.get("spin"));
                        if (spin) { // SPIN SPIN SPIN!!!!
                            spin = 360 / (spin * 1000);
                            let degree = 0,
                                start = null;
                            const spiiiiiin = function (timestamp) {
                                if (!start) {
                                    start = timestamp;
                                }
                                const delta = (timestamp - start);
                                degree += spin * delta;
                                degree %= 360;
                                start = timestamp;
                                self.elements.container.css("transform", "rotate(" + degree + "deg)");
                                window.requestAnimationFrame(spiiiiiin);
                            };
                            window.requestAnimationFrame(spiiiiiin);
                        }
                        let color = ls.get("color");
                        if (color != null) {
                            place.switch(parseInt(color));
                        }
                    }).fail(function () {
                        socket.reconnect();
                    });
                },
                update: function (optional) {
                    self.pan.x = Math.min(self.width / 2, Math.max(-self.width / 2, self.pan.x));
                    self.pan.y = Math.min(self.height / 2, Math.max(-self.height / 2, self.pan.y));
                    query.set({
                        x: Math.round((self.width / 2) - self.pan.x),
                        y: Math.round((self.height / 2) - self.pan.y),
                        scale: Math.round(self.scale * 100) / 100
                    }, true);
                    status.setValue(status.DefaultKeyMap['pan'], `(${Math.round((self.width / 2) - self.pan.x)}, ${Math.round((self.height / 2) - self.pan.y)})`);
                    status.setValue(status.DefaultKeyMap['scale'], Math.round(self.scale * 100) / 100);
                    if (self.use_js_render) {
                        const ctx2 = self.elements.board_render[0].getContext("2d");
                        let pxl_x = -self.pan.x + ((self.width - (window.innerWidth / self.scale)) / 2),
                            pxl_y = -self.pan.y + ((self.height - (window.innerHeight / self.scale)) / 2),
                            dx = 0,
                            dy = 0,
                            dw = 0,
                            dh = 0,
                            pxl_w = window.innerWidth / self.scale,
                            pxl_h = window.innerHeight / self.scale;

                        if (pxl_x < 0) {
                            dx = -pxl_x;
                            pxl_x = 0;
                            pxl_w -= dx;
                            dw += dx;
                        }

                        if (pxl_y < 0) {
                            dy = -pxl_y;
                            pxl_y = 0;
                            pxl_h -= dy;
                            dh += dy;
                        }

                        if (pxl_x + pxl_w > self.width) {
                            dw += pxl_w + pxl_x - self.width;
                            pxl_w = self.width - pxl_x;
                        }

                        if (pxl_y + pxl_h > self.height) {
                            dh += pxl_h + pxl_y - self.height;
                            pxl_h = self.height - pxl_y;
                        }

                        ctx2.canvas.width = window.innerWidth;
                        ctx2.canvas.height = window.innerHeight;
                        ctx2.mozImageSmoothingEnabled = ctx2.webkitImageSmoothingEnabled = ctx2.msImageSmoothingEnabled = ctx2.imageSmoothingEnabled = (Math.abs(self.scale) < 1);

                        ctx2.globalAlpha = 1;
                        ctx2.fillStyle = '#CCCCCC';
                        ctx2.fillRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
                        ctx2.drawImage(self.elements.board[0],
                            pxl_x,
                            pxl_y,
                            pxl_w,
                            pxl_h,
                            dx * self.scale,
                            dy * self.scale,
                            window.innerWidth - (dw * self.scale),
                            window.innerHeight - (dh * self.scale)
                        );

                        template.draw(ctx2, pxl_x, pxl_y);

                        place.update();
                        grid.update();
                        return true;
                    }
                    if (optional) {
                        return false;
                    }
                    if (Math.abs(self.scale) < 1) {
                        self.elements.board.removeClass("pixelate");
                    } else {
                        self.elements.board.addClass("pixelate");
                    }
                    if (self.allowDrag || (!self.allowDrag && self.pannedWithKeys)) {
                        self.elements.mover.css({
                            width: self.width,
                            height: self.height,
                            transform: "translate(" + (self.scale <= 1 ? Math.round(self.pan.x) : self.pan.x) + "px, " + (self.scale <= 1 ? Math.round(self.pan.y) : self.pan.y) + "px)"
                        });
                    }
                    if (self.use_zoom) {
                        self.elements.zoomer.css("zoom", (self.scale * 100).toString() + "%");
                    } else {
                        self.elements.zoomer.css("transform", "scale(" + self.scale + ")");
                    }

                    place.update();
//                     grid.update();
                    return true;
                },
                getScale: function () {
                    return Math.abs(self.scale);
                },
                setScale: function (scale) {
                    if (ls.get("increased_zoom") !== true && scale > 50) scale = 50;
                    else if (scale <= 0) scale = 0.5; //enforce the [0.5, 50] limit without blindly resetting to 0.5 when the user was trying to zoom in farther than 50x
                    self.scale = scale;
                    self.update();
                },
                nudgeScale: function (adj) {
                    const oldScale = Math.abs(self.scale),
                        sign = Math.sign(self.scale),
                        maxUnlocked = ls.get("increased_zoom") === true;
                    if (adj === -1) {
                        if (oldScale <= 1) {
                            self.scale = 0.5;
                        } else if (oldScale <= 2) {
                            self.scale = 1;
                        } else {
                            self.scale = Math.round(Math.max(2, oldScale / 1.25));
                        }
                    } else {
                        if (oldScale === 0.5) {
                            self.scale = 1;
                        } else if (oldScale === 1) {
                            self.scale = 2;
                        } else {
                            let modifiedScale = oldScale * 1.25;
                            if (maxUnlocked && oldScale >= 50) {
                                modifiedScale = oldScale * 1.15;
                            }
                            modifiedScale = Math.ceil(modifiedScale);
                            self.scale = maxUnlocked ? modifiedScale : Math.round(Math.min(50, modifiedScale));
                        }
                    }
                    self.scale *= sign;
                    self.update();
                },
                getPixel: function (x, y) {
                    x >>= x;
                    y >>= y;
                    const colorInt = self.intView[y * self.width + x];
                    return self.rgbPalette.indexOf(colorInt);
                },
                setPixel: function (x, y, c, refresh) {
                    if (!self.loaded) {
                        self.pixelBuffer.push({
                            x: x,
                            y: y,
                            c: c
                        });
                        return;
                    }
                    if (refresh === undefined) {
                        refresh = true;
                    }
                    if (c == -1 || c == 0xFF) {
                        self.intView[y * self.width + x] = 0x00000000;
                    } else {
                        self.intView[y * self.width + x] = self.rgbPalette[c];
                    }
                    if (refresh) {
                        self.ctx.putImageData(self.id, 0, 0);
                    }
                },
                refresh: function () {
                    if (self.loaded) {
                        self.ctx.putImageData(self.id, 0, 0);
                    }
                },
                fromScreen: function (screenX, screenY) {
                    let adjust_x = 0,
                        adjust_y = 0;
                    if (self.scale < 0) {
                        adjust_x = self.width;
                        adjust_y = self.height;
                    }
                    if (self.use_js_render) {
                        return {
                            x: -self.pan.x + ((self.width - (window.innerWidth / self.scale)) / 2) + (screenX / self.scale) + adjust_x,
                            y: -self.pan.y + ((self.height - (window.innerHeight / self.scale)) / 2) + (screenY / self.scale) + adjust_y
                        };
                    }
                    const boardBox = self.elements.board[0].getBoundingClientRect();
                    if (self.use_zoom) {
                        return {
                            x: (screenX / self.scale) - boardBox.left + adjust_x,
                            y: (screenY / self.scale) - boardBox.top + adjust_y
                        };
                    }
                    return {
                        x: ((screenX - boardBox.left) / self.scale) + adjust_x,
                        y: ((screenY - boardBox.top) / self.scale) + adjust_y
                    };
                },
                toScreen: function (boardX, boardY) {
                    if (self.scale < 0) {
                        boardX -= self.width - 1;
                        boardY -= self.height - 1;
                    }
                    if (self.use_js_render) {
                        return {
                            x: (boardX + self.pan.x - ((self.width - (window.innerWidth / self.scale)) / 2)) * self.scale,
                            y: (boardY + self.pan.y - ((self.height - (window.innerHeight / self.scale)) / 2)) * self.scale
                        };
                    }
                    const boardBox = self.elements.board[0].getBoundingClientRect();
                    if (self.use_zoom) {
                        return {
                            x: (boardX + boardBox.left) * self.scale,
                            y: (boardY + boardBox.top) * self.scale
                        };
                    }
                    return {
                        x: boardX * self.scale + boardBox.left,
                        y: boardY * self.scale + boardBox.top
                    };
                },
                save: function () {
                    const a = document.createElement("a");
                    const format = $("#snapshotImageFormat").val();

                    a.href = self.elements.board[0].toDataURL(format, 1);
                    a.download = (new Date()).toISOString().replace(/^(\d+-\d+-\d+)T(\d+):(\d+):(\d).*$/, `pxls canvas $1 $2.$3.$4.${format.split("/")[1]}`);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (typeof a.remove === "function") {
                        a.remove();
                    }
                },
                getRenderBoard: function () {
                    return self.elements.board_render;
                },
                get board() {
                    return self.elements.board;
                }
            };
            return {
                init: self.init,
                start: self.start,
                update: self.update,
                getScale: self.getScale,
                nudgeScale: self.nudgeScale,
                setScale: self.setScale,
                getPixel: self.getPixel,
                setPixel: self.setPixel,
                fromScreen: self.fromScreen,
                toScreen: self.toScreen,
                save: self.save,
                centerOn: self.centerOn,
                getRenderBoard: self.getRenderBoard,
                refresh: self.refresh,
                updateViewport: self.updateViewport,
                allowDrag: self.allowDrag,
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

                    let generalSettingsBody = panels.getBodyFor('settings').querySelector('.general-settings');
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Keep color selected', 'auto_reset', {defaultState: true}));
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Mute audio', 'audio_muted'));
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Allow zoom values greater than 50x', 'increased_zoom'));
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Enable scrolling on the palette to switch colors', 'scrollSwitchEnabled', {defaultState: true}));
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Invert scroll direction', 'scrollSwitchDirectionInverted', {indent: 1}));
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Add numbers to palette entries', 'enableNumberedPalette', {onchange: (event, newState) => {
                        place.setNumberedPaletteEnabled(!!newState);
                    }}));
                    generalSettingsBody.appendChild(ls.generateToggleCheckbox('Start at 1', 'enableNumberedPalette', {indent: 1, onchange: (event, newState) => {
                        place.setNumberedPaletteBase(!!newState ? 1 : 0);
                    }}));
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
                    Array.from(document.querySelectorAll('.panel[data-panel]')).forEach(x => {
                        if (!x.querySelector('.panel-body')) console.warn('[PANEL] Malformed Panel %o, missing body!', x.dataset.panel);
                    });
                },
                _get: name => {
                    return document.querySelector(`.panel[data-panel="${name.trim()}"]`) || false;
                }
            };
            return {
                init: self.init,
                getBodyFor: name => {
                    let panel = self._get(name);
                    if (panel !== false) return panel.querySelector('.panel-body') || crel('div');
                    console.warn('[PANEL] Attempted to get body on invalid panel %o, returning empty div.', name);
                    return crel('div');
                },
                open: name => {
                    let panel = self._get(name);
                    if (panel !== false) panel.classList.toggle('open', true);
                },
                close: name => {
                    let panel = self._get(name);
                    if (panel !== false) panel.classList.toggle('open', false);
                },
                closeAll: () => {
                    Array.from(document.querySelectorAll('.panel[data-panel]')).forEach(x => x.classList.remove('open'));
                }
            };
        })(),
        // this takes care of browser notifications
        notification = (function () {
            let self = {
                init: function () {
                    Notification.requestPermission().catch(e => {console.error(e)});
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
        })(),
        keybinds = (() => {
            let self = {
                init: () => {
                    //
                },
                save: () => {

                },
                load: () => {

                },
                deserialize: () => {
                    return JSON.stringify({});
                },
                serialize: raw => {
                    try {
                        let parsed = JSON.parse(raw);
                    } catch (e) {
                        modal.show(crel("div", crel("p", "Failed to serialize keybinds. Error:", crel("pre", e.toString()))));
                    }
                }
            };

            return {
                init: self.init,
                save: self.save,
                load: self.load,
                deserialize: self.deserialize,
                serialize: self.serialize
            };
        })(),
        status = (() => {
            let self = {
                elements: {
                    status: $('#status')
                },
                _elemCache: {},
                DefaultKeyMap: {
                    'cursor-pos': 'Cursor Position:',
                    'stack-count': 'Pixels Available:',
                    'scale': 'Zoom:',
                    'online-count': 'Online:',
                    'pan': 'Pan Position:'
                },
                init: () => {
                    self.elements.status[0].dataset['init'] = '1';
                    self.register(self.DefaultKeyMap['cursor-pos'], '(0, 0)');
                    self.register(self.DefaultKeyMap['pan'], '(0, 0)');
                    self.register(self.DefaultKeyMap['stack-count'], '0/0');
                    self.register(self.DefaultKeyMap['scale'], '1x');
                    self.register(self.DefaultKeyMap['online-count'], '0');
                },
                register: (key, initialValue, options = {}) => {
                    self.setValue(key, initialValue, options);
                },
                valueElemFor: (key) => {
                    let cached = self._elemCache[key];
                    if (!cached) {
                        cached = crel('span', {'data-for': key});
                        self._elemCache[key] = cached;
                        crel(self.elements.status[0], crel('p', {'data-key': key, 'class': 'status-line'}, key, self._elemCache[key]));
                    }
                    return cached;
                },
                hide: key => {
                    self.elements.status[0].querySelector(`[data-key="${key}"]`).classList.toggle('hide', true);
                },
                show: key => {
                    self.elements.status[0].querySelector(`[data-key="${key}"]`).classList.toggle('hide', false);
                },
                setValue: (key, value, options) => {
                    options = Object.assign({classes: '', styles: ''}, options);
                    let elem = self.valueElemFor(key);
                    elem.className = options.classes;
                    elem.setAttribute('style', options.styles);
                    elem.textContent = value;
                },
                addCustomLine: (lineElem) => {
                    if (typeof lineElem === 'string') lineElem = crel('p', lineElem);
                },
                update: () => {
                    //
                }
            };
            return {
                init: self.init,
                update: self.update,
                valueElemFor: self.valueElemFor,
                setValue: self.setValue,
                register: self.register,
                show: self.show,
                hide: self.hide,
                addCustomLine: self.addCustomLine,
                get DefaultKeyMap() {
                    return self.DefaultKeyMap;
                }
            };
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
    user.init();
    notification.init();
    heatmap.init();
    virginmap.init();
    board.init();
    socket.init();
    status.init();
    board.init();
    place.init();

    // and here we finally go...
    board.start();



    return {
        ls,
        ss,
        query,
        handlebars,
        modal,
        notification,
        socket,
        status,
        keybinds,
        ui,
        panels
    };
})();
