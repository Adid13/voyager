// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////////

var VOYAGER;

(function($) {
    VOYAGER = {
        strings: {},
        content: {},
        orgs: [],
        orgsObj: {},
        categories: [],
        categoriesObj: {},

        // Currently active field
        org: null,
        category: null,
        language: null,

        categoriesDrawerOpened: false,

        init: function() {
            // Initialize local storage
            chrome.storage.local.get([
                "language"
            ], function(data) {
                if (data.hasOwnProperty("language")) {
                    VOYAGER.language = data["language"];
                } else {
                    VOYAGER.setLanguage("en");
                }
            });

            // Rendered template response handler
            window.addEventListener("message", function(event) {
                switch (event.data.templateName) {
                case "template_main":
                    VOYAGER.showMain(event.data.result);
                    break;
                case "template_navbar":
                case "template_navbar-rtl":
                    VOYAGER.showNavbar(event.data.result);
                    break;
                }
            });

            $.getJSON("/data/generated.json", function(data) {
                VOYAGER.strings = data.strings;
                VOYAGER.content = data.content;
                VOYAGER.orgs = data.orgs;
                VOYAGER.categories = data.categories;

                for (var i = 0; i < VOYAGER.orgs.length; i++) {
                    var org = VOYAGER.orgs[i];
                    VOYAGER.orgsObj[org.name] = org;
                }
                for (var i = 0; i < VOYAGER.categories.length; i++) {
                    var category = VOYAGER.categories[i];
                    VOYAGER.categoriesObj[category.name] = category;
                }

                VOYAGER.refreshUI();
            });
        },

        sendMessage: function(message) {
            document.getElementById("templates").contentWindow
                .postMessage(message, "*");
        },

        setLanguage: function(lang, callback) {
            VOYAGER.language = lang;
            chrome.storage.local.set({
                "language": VOYAGER.language
            }, callback);
        },

        getContent: function() {
            // TODO(ejpark): Implement filtering of content based on input
            // parameters
            var filteredContent = [];
            if (VOYAGER.language === undefined || VOYAGER.language === null) {
                VOYAGER.language = "en";
            }

            if (!isDefined(VOYAGER.category) && !isDefined(VOYAGER.org)) {
                VOYAGER.category = {
                    "name": "science",
                    "title": {
                        "de": "Wissenschaft",
                        "ar": "علم",
                        "en": "Science"
                    }
                };
            }

            for (var element in VOYAGER.content) {
                var content = VOYAGER.content[element];
                if (isDefined(VOYAGER.language) && !isDefined(content.lang_support[VOYAGER.language])) {
                    continue;
                }
                if (isDefined(VOYAGER.category) && content.categories.indexOf(VOYAGER.category.name) === -1) {
                    continue;
                }
                if (isDefined(VOYAGER.org) && content.org !== VOYAGER.org.name) {
                    continue;
                }
                filteredContent.push(content);
            }

            return VOYAGER.transformContent(filteredContent);
        },

        refreshUI: function() {
            var content = VOYAGER.getContent();

            // Construct map for video navigation
            var videos = content.filter(function(entry) {
                return entry.type == "video";
            });
            VOYAGER.videoNavigation = {}
            for (var i = 0; i < videos.length; i++) {
                VOYAGER.videoNavigation[videos[i].index] = {
                    left: i == 0 ? undefined : videos[i - 1].index,
                    right: i == videos.length - 1 ? undefined : videos[i + 1].index
                };
            }

            var context = {
                "layout": VOYAGER.language === "ar" ? "rtl" : "ltr",
                "lang": VOYAGER.language,
                "org": VOYAGER.org,
                "category": VOYAGER.category,
                "content_title": VOYAGER.org ? VOYAGER.org.title[VOYAGER.language] : VOYAGER.category ? VOYAGER.category.title[VOYAGER.language] : "",
                "content": content
            };

            var message = {
                command: "render",
                templateName: "template_main",
                context: context
            };
            VOYAGER.sendMessage(message);

        },

        showCategoriesDrawer: function(shouldAnimate, callback) {
            if ($("#categories_drawer").css("display") === "none") {
                if (shouldAnimate === undefined || shouldAnimate === false) {
                    $("#categories_drawer").css("display", "flex");
                    $("#main_content").css("padding-top", "242px");
                } else {
                    $("#categories_drawer").slideDown({
                        duration: "fast",
                        queue: false,
                        complete: function() {
                            $("#categories_drawer").css("display", "flex");
                            VOYAGER.categoriesDrawerOpened = true;
                            if (callback) {
                                callback();
                            }
                        }
                    });
                    $("#main_content").animate({
                        "padding-top": "242px"
                    }, {
                        duration: "fast",
                        queue: false
                    });
                }
                $("#categories_downarrow").hide();
                $("#categories_uparrow").show();
            } else if (callback) {
                callback();
            }
        },

        hideCategoriesDrawer: function(callback) {
            if ($("#categories_drawer").css("display") !== "none") {
                $("#categories_drawer").slideUp({
                    duration: "fast",
                    queue: false,
                    complete: function() {
                        VOYAGER.categoriesDrawerOpened = false;
                        if (callback) {
                            callback();
                        }
                    }
                });
                $("#main_content").animate({
                    "padding-top": "100px"
                }, {
                    duration: "fast",
                    queue: false
                });
                $("#categories_downarrow").show();
                $("#categories_uparrow").hide();
            } else if (callback) {
                callback();
            }
        },

        showOrgsDrawer: function(callback) {
            if ($("#orgs_drawer").css("display") === "none") {
                $("#orgs_drawer").slideDown({
                    duration: "fast",
                    queue: false,
                    complete: function() {
                        if (callback) {
                            callback();
                        }
                    }
                });
                $("#main_content").animate({
                    "padding-top": "242px"
                }, {
                    duration: "fast",
                    queue: false
                });
                $("#orgs_downarrow").hide();
                $("#orgs_uparrow").show();
            } else if (callback) {
                callback();
            }
        },

        hideOrgsDrawer: function(callback) {
            if ($("#orgs_drawer").css("display") !== "none") {
                $("#orgs_drawer").slideUp({
                    duration: "fast",
                    queue: false,
                    complete: function() {
                        if (callback) {
                            callback();
                        }
                    }
                });
                $("#main_content").animate({
                    "padding-top": "100px"
                }, {
                    duration: "fast",
                    queue: false
                });
                $("#orgs_downarrow").show();
                $("#orgs_uparrow").hide();
            } else if (callback) {
                callback();
            }
        },

        showNavbar: function(rendered) {
            $("#main_navbar").html(rendered);

            // Dropdown click handler
            $("#orgs_label").on("click", function(e) {
                VOYAGER.hideCategoriesDrawer(function() {
                    if ($("#orgs_drawer").css("display") != "none") {
                        VOYAGER.hideOrgsDrawer();
                    } else {
                        VOYAGER.showOrgsDrawer();
                    }
                });
            });

            $("#categories_label").on("click", function(e) {
                VOYAGER.hideOrgsDrawer(function() {
                    if ($("#categories_drawer").css("display") != "none") {
                        VOYAGER.hideCategoriesDrawer();
                    } else {
                        VOYAGER.showCategoriesDrawer(true);
                    }
                });
            });

            $(".home-label").on("click", function(e) {
                VOYAGER.org = null;
                VOYAGER.category = null;
                VOYAGER.refreshUI();
            });

            // Language click handler
            $(".lang").on("click", function(e) {
                // Strip off "lang_" prefix from id
                VOYAGER.setLanguage(e.target.id.substring(5), function() {
                    VOYAGER.refreshUI();
                });
            });

            // Organization drawer click handler
            $(".org").on("click", function(e) {
                delete VOYAGER.category;
                var nodeId = $(e.target).closest('.org').attr('id');
                // Strip off "org_" prefix from id
                var orgId = nodeId.substring(nodeId.indexOf("_") + 1);
                VOYAGER.org = VOYAGER.orgsObj[orgId];
                VOYAGER.refreshUI();
            });

            // Category drawer click handler
            $(".category").on("click", function(e) {
                delete VOYAGER.org;
                var nodeId = $(e.target).closest('.category').attr('id');
                // Strip off "category_" prefix from id
                var categoryId = nodeId.substring(nodeId.indexOf("_") + 1);
                VOYAGER.category = VOYAGER.categoriesObj[categoryId];
                VOYAGER.refreshUI();
            });

            // Keep the categories drawer open if it was previously open
            if (VOYAGER.categoriesDrawerOpened) {
                VOYAGER.showCategoriesDrawer(false);
            }
        },

        showMain: function(rendered) {
            $("#content").html(rendered);

            // Load all the images
            $("img.load-image").each(function() {
                VOYAGER.loadImage($(this).attr('id'));
            });

            // Organize the loaded images into two columns
            $("#cards-container img").on('load', function() {
                $("#cards-container").masonry({
                    itemSelector: ".card",
                    columnWidth: ".card-sizer",
                    gutter: 20,
                    columns: 2
                });
            });

            // Register link handlers
            VOYAGER.registerVideoLinkHandlers();
            VOYAGER.registerWebLinkHandlers();

            var context = {
                "strings": VOYAGER.strings[VOYAGER.language],
                "lang": VOYAGER.language,
                "orgs": getCopyWithActive(VOYAGER.orgs, VOYAGER.org),
                "categories": getCopyWithActive(VOYAGER.categories, VOYAGER.category),
                "org_filter": VOYAGER.org ? "active" : "",
                "category_filter": VOYAGER.category ? "active" : ""
            };

            var templateName = "template_navbar";

            // Check if we need to render content RTL (right-to-left)
            if (VOYAGER.language === "ar") {
                templateName = "template_navbar-rtl";
                $("html").attr("dir", "rtl");
            } else {
                $("html").attr("dir", "ltr");
            }

            var message = {
                command: "render",
                templateName: templateName,
                context: context
            };
            VOYAGER.sendMessage(message);
        },

        transformContent: function(content) {
            for (var i = 0; i < content.length; i++) {
                if (content[i].type == "video") {
                    content[i].youtube_id = VOYAGER.extractYoutubeId(content[i].url[VOYAGER.language]);
                }
                content[i].index = i;
            }
            return content;
        },

        extractYoutubeId: function(url) {
            var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            var match = url.match(regExp);

            if (match && match[2].length == 11) {
            return match[2];
            } else {
            return 'error';
            }
        },

        loadImage: function(imgId) {
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.onload = function() {
                document.getElementById(imgId).src = window.URL.createObjectURL(xhr.response);
            }
            xhr.open('GET', $("#" + imgId).attr('data-src'), true);
            xhr.send();
        },

        registerVideoLinkHandlers: function() {
            $(document).on("click", ".video-link", function(e) {
                var modal = $(".video-modal");
                var modalContent = $(".video-modal-content-inner");

                modalContent.empty();
                modalContent.append('<div class="close">×</div>');
                modalContent.append('<webview id="embedded-video" src="'
                    + $(this).attr("data-url") + '"></webview>');

                // Display metadata
                var id = $(this).attr('data-index');
                modalContent.append($("#card-" + id + " .metadata").clone());

                // Give permissions to embedded webview
                var webview = document.getElementById('embedded-video');
                webview.addEventListener('permissionrequest', function(e) {
                  if ( e.permission === 'fullscreen' ) {
                    e.request.allow();
                  } else {
                    console.log('Denied permission ' + e.permission + ' requested by webview');
                    e.request.deny();
                  }
                });
                webview.addEventListener('newwindow', function(e) {
                  e.preventDefault();
                  window.open(e.targetUrl, "_blank");
                });

                // Render left and right arrows
                var navigation = VOYAGER.videoNavigation[$(this).attr("data-index")];
                ["left", "right"].forEach(function(direction) {
                    var arrow = modal.find("." + direction);
                    if (navigation[direction] != undefined) {
                        var navigationElement = $("#feature-img-" + navigation[direction]);
                        arrow.attr('data-index', navigationElement.attr('data-index'));
                        arrow.attr('data-url', navigationElement.attr('data-url'));
                        arrow.addClass('video-link');
                        arrow.find("svg").css("visibility", "visible");
                    } else {
                        arrow.removeClass('video-link');
                        arrow.find("svg").css("visibility", "hidden");
                    }
                });

                // Register key bindings
                $(document).off('keydown', VOYAGER.videoKeyHandler).on('keydown', VOYAGER.videoKeyHandler);

                // Show the modal
                modal.show();
            });

            $(document).on("click", ".video-modal .left, .video-modal .right", function(e) {
                e.stopPropagation();
            });

            $(document).on("click", ".video-modal", function(e) {
                $(document).off('keydown', VOYAGER.videoKeyHandler);
                $(".video-modal-content-inner").empty();
                $(".video-modal").hide();
            });
        },

        registerWebLinkHandlers: function() {
            $(document).on("click", ".web-link", function(e) {
                var modalContent = $(".web-modal .content");
                modalContent.empty();
                modalContent.append('<div class="close">×</div>');
                modalContent.append('<webview id="embedded-webpage" src="'
                    + $(this).attr("data-url") + '"></webview>');

                // Give permissions to embedded webview
                var webview = document.getElementById('embedded-webpage');
                webview.addEventListener('newwindow', function(e) {
                  e.preventDefault();
                  window.open(e.targetUrl, "_blank");
                });

                $("html").css("overflow-y", "hidden");
                $(".web-modal").show();
            });

            $(document).on("click", ".web-modal .top-bar .back", function(e) {
                $(".web-modal").hide();
                $("html").css("overflow-y", "auto");
            });
        },

        videoKeyHandler: function(e) {
            if (e.which == 8 || e.which == 27) { // backspace or escape key
                $(".video-modal .close").click();
                e.preventDefault();
                return false;
            } else if (e.which == 37) { // left key
                $(".video-modal .left").click();
                e.preventDefault();
                return false;
            } else if (e.which == 39) { // right key
                $(".video-modal .right").click();
                e.preventDefault();
                return false;
            }
            return true;
        }
    };

    function isDefined(variable) {
        return (typeof variable !== 'undefined') && variable;
    }

    function getCopyWithActive(oldArray, selected) {
        var newArr = [];
        for (var i = 0, length = oldArray.length; i < length; i++) {
            var newElement = jQuery.extend(true, {}, oldArray[i]);
            if (selected && newElement.name == selected.name) {
                newElement.active = "active";
            }
            newArr.push(newElement);
        }
        return newArr;
    }

})(jQuery);

jQuery(function($) {
    $("#templates").load(function() {
        VOYAGER.init();
    });
});
