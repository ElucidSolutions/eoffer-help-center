/**
 * Annotate functions: annotating the dom structure for client-side
 * interactivity, search, and navigation.
 */
$(document).ready(function() {

	// remove no-js tag
	$("html").removeClass("no-js");

	// handling for IE8
	if ($("html").hasClass("ie8")) {
		// ensure all lazy images load
		$("img").each(function() {
			if (this.getAttribute("deferred-src")) {
				this.setAttribute("src", this.getAttribute("deferred-src"));
				this.removeAttribute("deferred-src");
				// console.log("loaded: " +
				// this.src);
			}
		});
		// display a notice
		window.alert("IE 8 is not supported: Please upgrade to a more recent version of Internet Explorer.");

		// do not annotate document
		return;
	}

	// handling for browsers without active console
	if (!(window.console && console.log)) {
		console = {
			log : function() {
			},
			debug : function() {
			},
			info : function() {
			},
			warn : function() {
			},
			error : function() {
			}
		};
	}

	/**
	 * Class name for anchor tags generated to wrap annotated header tags
	 * (h1,h2,h3).
	 */
	var SECTION_HEADING = "section-heading";

	var SECTION_PREFIX = "section";

	var FILTER_PREFIX = "filter";

	/** Class name for sections that should be rendered onscreen. */
	var ONSCREEN = "onscreen";

	/** Class name for active links that should be highlighted. */
	var ONTARGET = "ontarget";

	/**
	 * Class name for sections that should not be rendered offscreen, e.g.
	 * hidden.
	 */
	var OFFSCREEN = "offscreen";

	/**
	 * Class name for sections transitioning from on to off screen.
	 */
	var TRANSITION = "transition";

	var SEARCH_RESULTS_CONTAINER_ID = "search-results-container";

	var ADVANCED_SEARCH_FIELD_ID = "advancedSearchField";

	var ADVANCED_SEARCH_BUTTON_ID = "advancedSearchButton";

	var DEPTH_PREFIX = "depth";
	var SEARCH_RESULT_TEMPLATE_STYLE = "search-result-template";
	var SEARCH_HIT_TITLE_STYLE = "searchHitTitle";
	var SEARCH_HIT_PREVIEW_STYLE = "searchHitPreview";
	var SEARCH_TERM_STYLE = "searchTerm";
	var TOC_ID = "accordion";
	var NEWS_CONTAINER_ID = "news-container";

	// default home section if no anchor provided
	var homeAnchor = null;

	// contains all container sections
	var containers = [];

	// contains nodes with ONSCREEN style
	var onscreenNodes = [];

	// contains nodes targeting the current target
	var onscreenHrefs = [];

	// contains mapping of words to nodes that contain the word
	var textIndex = {};

	// ie8 compat
	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(elt /* , from */) {
			var len = this.length >>> 0;

			var from = Number(arguments[1]) || 0;
			from = (from < 0) ? Math.ceil(from) : Math.floor(from);
			if (from < 0) {
				from += len;
			}

			for (; from < len; from++) {
				if (from in this && this[from] === elt)
					return from;
			}
			return -1;
		};
	}

//	// ie8 compat
//	try {
//		if (!Element.prototype.textContent) {
//			Object.defineProperty(Element.prototype, "textContent", {
//				set : function(value) {
//					this.innerText = value;
//				},
//
//				get : function() {
//					return this.innerText;
//				}
//			});
//		}
//	} catch (e) {
//		// ignored
//		console.log("error: " + e);
//	}

	// ie8 compat
	if (typeof String.prototype.trim !== 'function') {
		String.prototype.trim = function() {
			return this.replace(/^\s+|\s+$/g, '');
		};
	}

	var indexNode = function(node) {
		var words = $(node).text();
//		if (node.textContent === undefined) {
//			words = node.innerText; // ie8 compat
//		}
		words = words.toLowerCase().split(/[^A-Za-z0-9]/);
		for (var i = 0; i < words.length; i++) {
			var word = words[i];
			var nodes = textIndex[word];
			if (nodes === undefined) {
				nodes = [];
				textIndex[word] = nodes;
			}
			try {
				if (nodes.indexOf(node) == -1) {
					nodes.push(node);
				}
			} catch (e) {
				console.log("error: " + e);
				console.log(nodes);
				textIndex[word] = [ node ]; // FFX workaround
				// FFX has a "watch" function so words indexed under
				// watch
				// throw an error that the function object doesn't have
				// an
				// 'indexOf' property.
			}
		}
	};

	var convertTitleToAnchorId = function(title) {
		if (title) {
			title = title.toLowerCase().trim();
			title = title.replace(/[^A-Za-z0-9]+/g, "-"); // replace
			// all
			// non-alphanums
			return title;
		}
	};

	var wrapInAnchorWithId = function(element, id) {
		var parent = element.parentNode;
		var anchor = document.createElement("a");
		parent.insertBefore(anchor, element);
		parent.removeChild(element);
		anchor.appendChild(element);
		anchor.setAttribute("id", id);
		anchor.setAttribute("class", SECTION_HEADING);
		return anchor;
	};

	/** Returns the nearest parent "section" for the given node. */
	var getSectionForNode = function(node) {
		var parent = node;
		while (parent !== document.body) {
			parent = parent.parentNode;
			// if a matching TOC node exists
			if (parent.matchingTOC !== undefined) {
				break;
			}
		}
		return parent;
	};

	/**
	 * Returns the container for the given node, or null if not in a container.
	 */
	var getContainerForNode = function(node) {
		var parent = node;
		while (parent !== document.body) {
			parent = parent.parentNode;
			if (containers.indexOf(parent) !== -1) {
				break;
			}
		}
		return parent;
	};

	var annotateGrandparent = function(child) {
		var node = wrapInAnchorWithId(child, convertTitleToAnchorId($(child).text()));
		if (node.parentNode !== null) {
			node = node.parentNode;
			if (node.parentNode !== null) {
				node = node.parentNode;
				if (node.className.indexOf(SECTION_PREFIX) == -1) {
					node.className = node.className + " " + OFFSCREEN + " " + SECTION_PREFIX + " " + SECTION_PREFIX + "-" + node.nodeName;
					node.matchingHeader = child;
				}
			}
		}
	};

	/**
	 * Grab events for all input text boxes.
	 */
	var commandeerSearchBoxes = function() {
		// jquery for ie8 compat wrt keyCode
		$('input[name="search"]').bind('keyup', function(e) {
			console.log(e.which);
			if (e.which == 13) {
				onSearch(e.target);
			}
		});

		// also grab button input
		var field = document.getElementById(ADVANCED_SEARCH_FIELD_ID);
		var button = document.getElementById(ADVANCED_SEARCH_BUTTON_ID);
		if (field !== null && button !== null) {
			button.onclick = function(e) {
				onSearch(field);
			};
		}

		// also grab all filter buttons (inputs with ids starting with
		// "filter-")
		var items = document.getElementsByTagName("input");
		for (var i = 0; i < items.length; i++) {
			if (items[i].id !== undefined && items[i].id.indexOf(FILTER_PREFIX + "-") === 0) {
				items[i].onclick = function(e) {
					onSearch(field);
				};
			}
		}

	};

	/**
	 * Assumes result container element called "search-results=-container".
	 * Assumes search results section called "#advanced-search".
	 */
	var onSearch = function(node) {
		console.log("onSearch: " + node.value);
		var searchResults = document.getElementById(SEARCH_RESULTS_CONTAINER_ID);
		if (searchResults) {
			while (searchResults.hasChildNodes()) {
				searchResults.removeChild(searchResults.lastChild);
			}

			// search for any unchecked checkboxes that match
			// filter-CONTAINERID
			var container;
			var excludes = [];
			for ( var c in containers) {
				container = containers[c];
				var filterElement = document.getElementById(FILTER_PREFIX + "-" + container.id);
				if (filterElement !== null) {
					console.log(filterElement);
					if (filterElement.checked === undefined || filterElement.checked !== true) {
						excludes.push(container.id);
					}
				}
			}

			var primarySearchBox = document.getElementById(ADVANCED_SEARCH_FIELD_ID);
			primarySearchBox.value = node.value;
			searchResults.removeAttribute("count");
			var i, j;

			if (node.value !== null && node.value.length > 0) {
				var tokens = node.value.toLowerCase().split(" ");
				var hits, result, headline, preview;

				var results = [];
				var union = [];

				// build initial result set
				// console.log("token: " + tokens[0]);
				hits = textIndex[tokens[0]];
				// console.log("hits: " + hits);
				if (hits !== undefined) {
					for (j = 0; j < hits.length; j++) {
						results.push(hits[j]);
						// because search terms are union'd,
						// we only need to test for exclusions on first
						// term.
						for ( var exclude in excludes) {
							container = getContainerForNode(hits[j]);
							if (container !== null && container.id === excludes[exclude]) {
								results.pop();
							}
						}
					}
				}

				// if more than one term:
				// keep only those hits in all other result sets
				for (i = 1; i < tokens.length; i++) {
					// console.log("token: " + tokens[i]);
					hits = textIndex[tokens[i]];
					if (hits !== undefined) {
						for (j = 0; j < hits.length; j++) {
							if (results.indexOf(hits[j]) !== -1) {
								union.push(hits[j]);
							}
						}
					}
					results = union;
					union = [];
				}

				// for each remaining result:
				var section;
				for (i = 0; i < results.length; i++) {
					// create a results node
					section = getSectionForNode(results[i]);
					result = document.createElement("div");
					result.className = SEARCH_RESULT_TEMPLATE_STYLE;
					headline = document.createElement("a");
					headline.className = SEARCH_HIT_TITLE_STYLE;
					preview = document.createElement("p");
					preview.className = SEARCH_HIT_PREVIEW_STYLE;
					result.appendChild(headline);
					result.appendChild(preview);

					// populate node
					preview.innerHTML = results[i].innerHTML;
					for (j = 0; j < tokens.length; j++) {
						// wrap each term occurance with highlight span;
						// case-insensitive and respecting word
						// boundaries
						preview.innerHTML = preview.innerHTML.replace(new RegExp("\\b" + tokens[j] + "\\b", "ig"), "<span class='" + SEARCH_TERM_STYLE + "'>$&</span>");
					}
					headline.innerHTML = "Search Result";
					if (section !== null && section.matchingTOC !== undefined) {
						console.log(section.matchingTOC);
						section = section.matchingTOC.lastChild;
						// if matching TOC has a valid anchor reference
						if (section.getAttribute("href") === null) {
							// if last item isn't linked, try previous
							console.log("missing href:");
							console.log(section);
							section = section.previousSibling;
						}
						if (section !== null) {
							$(headline).text( $(section).text() );
							headline.setAttribute("href", section.getAttribute("href"));
						}
					}
					searchResults.appendChild(result);
				}
				searchResults.setAttribute("count", results.length);
			}
		} else {
			console.log("WARN: No search results container found with id: " + SEARCH_RESULTS_CONTAINER_ID);
		}

		// show the search results
		navigateTo("advanced-search");
	};

	var annotateContainer = function(container) {
		var elements = container.getElementsByTagName("*");
		var items = [];
		var i;
		// Array.prototype.slice.apply(elements, [ 0 ]); //
		// http://jsperf.com/nodelist-clone/2
		for (i = 0; i < elements.length; i++) {
			items.push(elements[i]); // ie8 compat
		}
		var node;
		var name;
		for (i = 0; i < items.length; i++) {
			node = items[i];
			name = node.nodeName;
			switch (name) {
			case 'H1':
			case 'H2':
			case 'H3':
				invokeNow(function(param) {
					annotateGrandparent(param);
				}, node);
				break;
			case 'P':
				invokeLater(function(param) {
					indexNode(param);
				}, node);
				break;
			}
		}
	};

	var generateTOCItem = function(node) {
		var item = document.createElement("li");
		var anchor = document.createElement("a");
		anchor.setAttribute("href", "#" + convertTitleToAnchorId($(node).text()));
		if ($(node).text()) {
			$(anchor).text( $(node).text().trim() );
		}

		item.appendChild(anchor);
		// NOTE: using document.body as sentinel value for ie8 compat
		// (ie8 nodes otherwise have a default parent that is not null)
		document.body.appendChild(item);
		return item;
	};

	var annotateSectionDepth = function(container) {
		var node;
		var items = container.getElementsByTagName("div");
		container.matchingTOC = document.createElement("div");
		container.matchingTOC.appendChild(document.createElement("ul"));
		// container.appendChild(container.matchingTOC);

		for (var i = 0; i < items.length; i++) {
			node = items[i];
			if (node.className !== null && node.className.indexOf(SECTION_PREFIX) !== -1) {

				if (node.matchingTOC === undefined) {
					node.matchingTOC = generateTOCItem(node.matchingHeader);
				}

				// count depth
				var depth = 0;
				var parent = node;
				while (parent !== container) {
					depth++;
					parent = parent.parentNode;

					// add to table of contents hierarchy

					// if parent node does not have a TOC node
					if (parent.matchingTOC !== undefined) {

						// if this node's TOC node doesn't have a parent
						// TOC node
						// NOTE: using document.body as sentinel value
						// for ie8 compat
						// (ie8 nodes otherwise have a default parent
						// that is not null)
						if (node.matchingTOC.parentNode === document.body) {
							// if parent TOC node doesn't already have
							// subnodes
							if ("UL" != (parent.matchingTOC.lastChild.nodeName)) {
								// create a subnode
								parent.matchingTOC.appendChild(document.createElement("ul"));
								if (parent.matchingTOC.className.indexOf("has-children") === -1) {
									parent.matchingTOC.className = parent.matchingTOC.className + " has-children";
									parent.matchingTOC.className = parent.matchingTOC.className.trim();
								}
							}
							// add this node's TOC node to the parent
							// TOC node's subnodes
							parent.matchingTOC.lastChild.appendChild(node.matchingTOC);
						}
						break;
					}
				}
				node.className = node.className + " " + DEPTH_PREFIX + "-" + depth;
			}
		}
	};

	/** Sets the default home anchor if no anchor is specified */
	var setHome = function(anchor) {
		homeAnchor = anchor;
	};

	/** Convenience to navigate to a specific node. */
	var navigateTo = function(anchor) {
		location.hash = "#" + anchor;
	};

	/**
	 * Render the node for the current anchor, if any.
	 */
	var renderNodes = function() {
		if (location.hash !== null && location.hash.indexOf('#') === 0) {
			renderNode(location.hash.substring(1));
		} else {
			renderNode(null);
		}
	};

	/**
	 * Render the node specified id, if any, making only requested sections
	 * visible.
	 */
	var renderNode = function(id) {
		if (onscreenNodes.indexOf(id) === -1) {
			var i, s, node;
			// remove all active targets
			for (i = 0; i < onscreenHrefs.length; i++) {
				node = onscreenHrefs[i];
				node.className = node.className.replace(' ' + ONTARGET, '');
				// BUGFIX: initial sticky state
				node.className = node.className.replace(ONTARGET, '');
			}
			newOnscreenNodes = [];
			// highlight any anchors targeting the current id
			var anchors = document.getElementsByTagName("a");
			for (i = 0; i < anchors.length; i++) {
				node = anchors[i];
				s = node.getAttribute("href");
				if (s !== null && s.substring(1) === id) {
					node.className = node.className + ' ' + ONTARGET;
					onscreenHrefs.push(node);
				}
			}

			// default to home anchor
			if (id === null) {
				id = homeAnchor;
			}

			// move all ancestor nodes of anchor from offscreen to
			// onscreen
			if (id !== null) {
				node = document.getElementById(id);
				if (node !== null) {
					var parent = node;

					// show current and all ancestors
					while (parent !== document.body) {
						parent = parent.parentNode;
						newOnscreenNodes.push(parent);
					}

					// ALSO: show first "section" child if any
					console.log($(node).parents().filter(".section"));
					$(node).parents().filter(".section").first().each(function() {
						// find first section child, if any
						$(".section", this).first().each(function() {
							if (this != node) {
								newOnscreenNodes.push(this);
								console.log(this);
							}
						});
					});

					// remove older onscreen nodes if no longer onscreen
					var p1;
					for (i = 0; i < onscreenNodes.length; i++) {
						p1 = onscreenNodes[i];
						if (newOnscreenNodes.indexOf(p1) === -1 && p1.className.indexOf(ONSCREEN) !== -1) {
							p1.setAttribute("style", "position:absolute; top:" + p1.offsetTop + "px; left:" + p1.offsetLeft + "px;x-right:" + (p1.offsetLeft + p1.offsetWidth) + "px;bottom:" + (p1.offsetTop + p1.offsetHeight) + "px;");
							p1.className = p1.className + " " + TRANSITION;
							p1.className = p1.className.replace(ONSCREEN, OFFSCREEN);
							(function(p2) { // isolate scope by
								// wrapping a function
								setTimeout(function() {
									p2.className = p2.className.replace(" " + TRANSITION, "");
									p2.setAttribute("style", "");
								}, 500);
							})(p1);
						}
					}
					onscreenNodes = newOnscreenNodes;
					for (i = 0; i < onscreenNodes.length; i++) {
						p1 = onscreenNodes[i];
						if (p1.className.indexOf(OFFSCREEN) !== -1) {
							p1.className = p1.className + " " + TRANSITION;
							p1.className = p1.className.replace(OFFSCREEN, ONSCREEN);
							(function(p2) { // isolate scope by
								// wrapping a function
								setTimeout(function() {
									// remove TRANSITION to trigger
									// actual opacity transition
									p2.className = p2.className.replace(" " + TRANSITION, "");
									p2.setAttribute("style", "");
								}, 1);
							})(p1);
							// ensure all lazy images load
							$("img", p1).each(function() {
								if (this.getAttribute("deferred-src")) {
									this.setAttribute("src", this.getAttribute("deferred-src"));
									this.removeAttribute("deferred-src");
									// console.log("loaded: " +
									// this.src);
								}
							});
						}
						// NOTE: imgs with deferred-src attribute have
						// that attribute copied
						// into the src attribute when they appear on
						// screen (lazy loading).
					}

					// invoke later
					setTimeout(function() {
						// if we're an autogenerated anchor (not a explicit
						// anchor)
						if (node.className.indexOf("section-heading") !== -1) {
							// scroll to top
							window.scrollTo(0, 0);
						} else {
							window.scrollTo(0, Math.max(0, node.offsetTop - 10)); // padding
						}
					}, 100);
				} else {
					console.log("WARN: No such element found with id: " + id);
				}
			}
		}
	};

	/**
	 * Entry point to begin the annotation process for the specified container
	 * ids.
	 */
	var annotateContainerIds = function(containerIds) {
		var container;
		var insertTOC = document.getElementById(TOC_ID);
		containerIds.reverse(); // insert in reverse order
		var f; // scoping workaround
		for ( var containerId in containerIds) {
			container = document.getElementById(containerIds[containerId]);
			if (container !== null) {
				containers.push(container);

				invokeLater(function(param) {
					console.log(param);
					annotateContainer(param);
				}, container);

				invokeLater(function(param) {
					console.log(param);
					annotateSectionDepth(param);
				}, container);

				invokeLater(function(params) {
					console.log(params);
					params[0].matchingTOC.id = containerIds[params[1]];
					if (insertTOC !== null) {
						insertTOC.insertBefore(params[0].matchingTOC, insertTOC.firstChild);
					}
				}, [ container, containerId ]);
			}
		}
	};

	/**
	 * Add handlers for all .helpfulTracker divs containing .helpful and
	 * .unhelpful anchors.
	 */
	var trackLikeButtons = function() {
		// get the app name
		var app = window.location.href.split('/');
		try {
			app.pop();
			app = app.pop();
		} catch (e) {
			app = "unknown";
		}

		$(".helpfulTracker .helpful").bind("click", function() {
			var id = $(this).closest(".section").find("a").first().attr("id");
			if (!id) {
				id = "helpful";
			}
			console.log("helpful: " + id);
			_gaq.push([ "_trackEvent", app, "feedback", id, 1 ]);
		});
		$(".helpfulTracker .unhelpful").bind("click", function() {
			var id = $(this).closest(".section").find("a").first().attr("id");
			if (!id) {
				id = "unhelpful";
			}
			console.log("unhelpful: " + id);
			_gaq.push([ "_trackEvent", app, "feedback", id, -1 ]);
		});
	};

	/**
	 * Fetches RSS document from the specified url and populates the specified
	 * container.
	 */
	var fetchNews = function(url, container) {
		var newsBox = document.getElementById(NEWS_CONTAINER_ID);
		if (newsBox !== null) {
			$.ajax({
				url : url,
				success : function(data) {
					while (newsBox.hasChildNodes()) {
						newsBox.removeChild(newsBox.lastChild);
					}
					$(data).find("item").each(function() {
						var el = $(this);

						var linkText = "Read the full article";
						var iconStyle = "documentIcon";
						var category = el.find("category").text();
						switch (category) {
						case "Video":
							linkText = "Watch the video";
							iconStyle = "videoIcon";
							break;
						case "QA":
							iconStyle = "qaIcon";
							break;
						case "Calendar":
							iconStyle = "calendarIcon";
							break;
						case "Warning":
							linkText = "Read the full warning";
							iconStyle = "warningIcon";
							break;
						}

						var outer = document.createElement("div");
						outer.className = "featAddItem mobile-grid-50";
						newsBox.appendChild(outer);
						var inner = document.createElement("div");
						inner.className = "example-block";
						outer.appendChild(inner);
						var title = document.createElement("div");
						title.className = "featuredTitle " + iconStyle;
						$(title).text( el.find("title").text() );
						inner.appendChild(title);
						var body = document.createElement("div");
						body.className = "featuredDescription";
						inner.appendChild(body);
						var date = document.createElement("p");
						date.className = "featuredDate";
						$(date).text( el.find("pubDate").text() );
						body.appendChild(date);
						var description = document.createElement("p");
						$(description).text( el.find("description").text() );
						body.appendChild(description);
						var link = document.createElement("a");
						link.className = "featuredMore";
						link.setAttribute("href", el.find("link").text());
						$(link).text( linkText );
						body.appendChild(link);
					});
				},
				error : function(e) {
					console.log("Error: could not load news feed:");
					console.log(e);
				}
			});
		} else {
			console.log("News skipped: no news-container element found.");
		}
	};

	// register for hash changes
	//$(window).bind('hashchange', renderNodes); // jq for ie8 compat
	$(window).hashchange(renderNodes); // hashchange plugin for ie7/ie8 compat
	
	// now annotate the document
	annotateContainerIds([ "container-home", "container-intro", "container-eoffer", "container-emod", "container-contractmanagement", "container-reportsresources", "container-offers", "container-signatureprocess", "container-solicitations", "container-miscellaneous", "container-utilities" ]);

	// delay until complete:
	invokeLater(function() {

		// configure search boxes
		commandeerSearchBoxes();

		// configure like/dislike buttons
		trackLikeButtons();

		// fetch news updates
		fetchNews("news.xml");

		// set the home page
		setHome("welcome");

		// render the requested anchor if any
		renderNodes();
	});

	invokeLater(function() {
		fetchGlossary("/common/glossary.xml");
		$("#searchField").val("");
		$("#searchField").keyup(function() {
			console.log($(this).val());
			searchTable($(this).val());
		});
		installBackToTop();
		$("html").addClass("ready");
	});

	invokeLater(function() {
		$('#navTrigger').sidr();
		document.getElementById('sidr').setAttribute("style", "");
	});

	invokeLater(function() {
		$.fn.accordion.defaults.container = false;
		$("#accordion").accordion({
			initShow : "#current",
			standardExpansible : true
		});
	});

});

$(document).ready(function() {
});

var searchTable = function(inputVal) {
	var table = $('#tblData');
	table.find(':not(.header-row)').each(function(index, row) {
		var allCells = $(row).find('td');
		if (allCells.length > 0) {
			var found = false;
			allCells.each(function(index, td) {
				var regExp = new RegExp(inputVal, 'i');
				if (regExp.test($(td).text())) {
					found = true;
					return false;
				}
			});
			if (found) {
				$(row).show();
			} else {
				$(row).hide();
			}
		}
	});
	colorizeTable();
};

var colorizeTable = function() {
	$('#tblData tr:visible:even').removeClass('oddRow').addClass('evenRow');
	$('#tblData tr:visible:odd').removeClass('evenRow').addClass('oddRow');
};

var fetchGlossary = function(url) {
	var table = $('#tblData');
	var filter = table.attr("filter");
	if (table) {
		$.ajax({
			url : url,
			success : function(data) {
				// woot: works in IE *and* everything else
				table.empty().html(serializeXmlNode($(data).find("table")[0]));
				// table.empty().html($(data).find("html").html());
				// table[0].innerHTML = $(data).find("html")[0].innerHTML;

				// filter if any
				if (filter) {
					table.find("tr:not(." + filter + ")").remove();
				}

				// colorize the rows
				colorizeTable();
			},
			error : function(e) {
				console.log("Error: could not load glossary:");
				console.log(e);
			}
		});
	} else {
		console.log("Glossary skipped: no tblData element found.");
	}
};

var serializeXmlNode = function(xmlNode) {
    if (typeof window.XMLSerializer != "undefined") {
        return (new window.XMLSerializer()).serializeToString(xmlNode);
    } else if (typeof xmlNode.xml != "undefined") {
        return xmlNode.xml;
    }
    return "";
};

var installBackToTop = function(url) {
	var element = $("<div class='scroll-to-top'><span></span></div>");
	$("body").append(element);
	element.click(function() {
		$('html,body').animate({
			scrollTop : 0
		});
	});
	$(window).on("scroll", null, function() {
		if ($(window).scrollTop() > 200) {
			$("body").addClass("show-scroll-to-top");
		} else {
			$("body").removeClass("show-scroll-to-top");
		}
	});
};

/* Event queue management */

var invokeQueue = [];
var argQueue = [];
var invokeLater = function(fn, arg) {
	if (fn) {
		invokeQueue.push(fn);
		argQueue.push(arg);
	}
	setTimeout(function() {
		if (invokeQueue.length > 0) {
			var f = invokeQueue.splice(0, 1)[0];
			var a = argQueue.splice(0, 1)[0];
			if (f) {
				f(a);
				invokeLater();
			} else {
				console.log(f);
			}
		}
	}, 100);
	// above milliseconds to trade loadtime for responsiveness
};
var invokeNow = function(fn, arg) {
	return fn(arg);
};



//Script: jQuery hashchange event
//
// *Version: 1.3, Last updated: 7/21/2010*
// 
// Project Home - http://benalman.com/projects/jquery-hashchange-plugin/
// GitHub       - http://github.com/cowboy/jquery-hashchange/
// Source       - http://github.com/cowboy/jquery-hashchange/raw/master/jquery.ba-hashchange.js
// (Minified)   - http://github.com/cowboy/jquery-hashchange/raw/master/jquery.ba-hashchange.min.js (0.8kb gzipped)
// 
// About: License
// 
// Copyright (c) 2010 "Cowboy" Ben Alman,
// Dual licensed under the MIT and GPL licenses.
// http://benalman.com/about/license/
// 
// About: Examples
// 
// These working examples, complete with fully commented code, illustrate a few
// ways in which this plugin can be used.
// 
// hashchange event - http://benalman.com/code/projects/jquery-hashchange/examples/hashchange/
// document.domain - http://benalman.com/code/projects/jquery-hashchange/examples/document_domain/
// 
// About: Support and Testing
// 
// Information about what version or versions of jQuery this plugin has been
// tested with, what browsers it has been tested in, and where the unit tests
// reside (so you can test it yourself).
// 
// jQuery Versions - 1.2.6, 1.3.2, 1.4.1, 1.4.2
// Browsers Tested - Internet Explorer 6-8, Firefox 2-4, Chrome 5-6, Safari 3.2-5,
//                   Opera 9.6-10.60, iPhone 3.1, Android 1.6-2.2, BlackBerry 4.6-5.
// Unit Tests      - http://benalman.com/code/projects/jquery-hashchange/unit/
// 
// About: Known issues
// 
// While this jQuery hashchange event implementation is quite stable and
// robust, there are a few unfortunate browser bugs surrounding expected
// hashchange event-based behaviors, independent of any JavaScript
// window.onhashchange abstraction. See the following examples for more
// information:
// 
// Chrome: Back Button - http://benalman.com/code/projects/jquery-hashchange/examples/bug-chrome-back-button/
// Firefox: Remote XMLHttpRequest - http://benalman.com/code/projects/jquery-hashchange/examples/bug-firefox-remote-xhr/
// WebKit: Back Button in an Iframe - http://benalman.com/code/projects/jquery-hashchange/examples/bug-webkit-hash-iframe/
// Safari: Back Button from a different domain - http://benalman.com/code/projects/jquery-hashchange/examples/bug-safari-back-from-diff-domain/
// 
// Also note that should a browser natively support the window.onhashchange 
// event, but not report that it does, the fallback polling loop will be used.
// 
// About: Release History
// 
// 1.3   - (7/21/2010) Reorganized IE6/7 Iframe code to make it more
//         "removable" for mobile-only development. Added IE6/7 document.title
//         support. Attempted to make Iframe as hidden as possible by using
//         techniques from http://www.paciellogroup.com/blog/?p=604. Added 
//         support for the "shortcut" format $(window).hashchange( fn ) and
//         $(window).hashchange() like jQuery provides for built-in events.
//         Renamed jQuery.hashchangeDelay to <jQuery.fn.hashchange.delay> and
//         lowered its default value to 50. Added <jQuery.fn.hashchange.domain>
//         and <jQuery.fn.hashchange.src> properties plus document-domain.html
//         file to address access denied issues when setting document.domain in
//         IE6/7.
// 1.2   - (2/11/2010) Fixed a bug where coming back to a page using this plugin
//         from a page on another domain would cause an error in Safari 4. Also,
//         IE6/7 Iframe is now inserted after the body (this actually works),
//         which prevents the page from scrolling when the event is first bound.
//         Event can also now be bound before DOM ready, but it won't be usable
//         before then in IE6/7.
// 1.1   - (1/21/2010) Incorporated document.documentMode test to fix IE8 bug
//         where browser version is incorrectly reported as 8.0, despite
//         inclusion of the X-UA-Compatible IE=EmulateIE7 meta tag.
// 1.0   - (1/9/2010) Initial Release. Broke out the jQuery BBQ event.special
//         window.onhashchange functionality into a separate plugin for users
//         who want just the basic event & back button support, without all the
//         extra awesomeness that BBQ provides. This plugin will be included as
//         part of jQuery BBQ, but also be available separately.

(function($,window,undefined){
  '$:nomunge'; // Used by YUI compressor.
  
  // Reused string.
  var str_hashchange = 'hashchange',
    
    // Method / object references.
    doc = document,
    fake_onhashchange,
    special = $.event.special,
    
    // Does the browser support window.onhashchange? Note that IE8 running in
    // IE7 compatibility mode reports true for 'onhashchange' in window, even
    // though the event isn't supported, so also test document.documentMode.
    doc_mode = doc.documentMode,
    supports_onhashchange = 'on' + str_hashchange in window && ( doc_mode === undefined || doc_mode > 7 );
  
  // Get location.hash (or what you'd expect location.hash to be) sans any
  // leading #. Thanks for making this necessary, Firefox!
  function get_fragment( url ) {
    url = url || location.href;
    return '#' + url.replace( /^[^#]*#?(.*)$/, '$1' );
  };
  
  // Method: jQuery.fn.hashchange
  // 
  // Bind a handler to the window.onhashchange event or trigger all bound
  // window.onhashchange event handlers. This behavior is consistent with
  // jQuery's built-in event handlers.
  // 
  // Usage:
  // 
  // > jQuery(window).hashchange( [ handler ] );
  // 
  // Arguments:
  // 
  //  handler - (Function) Optional handler to be bound to the hashchange
  //    event. This is a "shortcut" for the more verbose form:
  //    jQuery(window).bind( 'hashchange', handler ). If handler is omitted,
  //    all bound window.onhashchange event handlers will be triggered. This
  //    is a shortcut for the more verbose
  //    jQuery(window).trigger( 'hashchange' ). These forms are described in
  //    the <hashchange event> section.
  // 
  // Returns:
  // 
  //  (jQuery) The initial jQuery collection of elements.
  
  // Allow the "shortcut" format $(elem).hashchange( fn ) for binding and
  // $(elem).hashchange() for triggering, like jQuery does for built-in events.
  $.fn[ str_hashchange ] = function( fn ) {
    return fn ? this.bind( str_hashchange, fn ) : this.trigger( str_hashchange );
  };
  
  // Property: jQuery.fn.hashchange.delay
  // 
  // The numeric interval (in milliseconds) at which the <hashchange event>
  // polling loop executes. Defaults to 50.
  
  // Property: jQuery.fn.hashchange.domain
  // 
  // If you're setting document.domain in your JavaScript, and you want hash
  // history to work in IE6/7, not only must this property be set, but you must
  // also set document.domain BEFORE jQuery is loaded into the page. This
  // property is only applicable if you are supporting IE6/7 (or IE8 operating
  // in "IE7 compatibility" mode).
  // 
  // In addition, the <jQuery.fn.hashchange.src> property must be set to the
  // path of the included "document-domain.html" file, which can be renamed or
  // modified if necessary (note that the document.domain specified must be the
  // same in both your main JavaScript as well as in this file).
  // 
  // Usage:
  // 
  // jQuery.fn.hashchange.domain = document.domain;
  
  // Property: jQuery.fn.hashchange.src
  // 
  // If, for some reason, you need to specify an Iframe src file (for example,
  // when setting document.domain as in <jQuery.fn.hashchange.domain>), you can
  // do so using this property. Note that when using this property, history
  // won't be recorded in IE6/7 until the Iframe src file loads. This property
  // is only applicable if you are supporting IE6/7 (or IE8 operating in "IE7
  // compatibility" mode).
  // 
  // Usage:
  // 
  // jQuery.fn.hashchange.src = 'path/to/file.html';
  
  $.fn[ str_hashchange ].delay = 200;
  /*
  $.fn[ str_hashchange ].domain = null;
  $.fn[ str_hashchange ].src = null;
  */
  
  // Event: hashchange event
  // 
  // Fired when location.hash changes. In browsers that support it, the native
  // HTML5 window.onhashchange event is used, otherwise a polling loop is
  // initialized, running every <jQuery.fn.hashchange.delay> milliseconds to
  // see if the hash has changed. In IE6/7 (and IE8 operating in "IE7
  // compatibility" mode), a hidden Iframe is created to allow the back button
  // and hash-based history to work.
  // 
  // Usage as described in <jQuery.fn.hashchange>:
  // 
  // > // Bind an event handler.
  // > jQuery(window).hashchange( function(e) {
  // >   var hash = location.hash;
  // >   ...
  // > });
  // > 
  // > // Manually trigger the event handler.
  // > jQuery(window).hashchange();
  // 
  // A more verbose usage that allows for event namespacing:
  // 
  // > // Bind an event handler.
  // > jQuery(window).bind( 'hashchange', function(e) {
  // >   var hash = location.hash;
  // >   ...
  // > });
  // > 
  // > // Manually trigger the event handler.
  // > jQuery(window).trigger( 'hashchange' );
  // 
  // Additional Notes:
  // 
  // * The polling loop and Iframe are not created until at least one handler
  //   is actually bound to the 'hashchange' event.
  // * If you need the bound handler(s) to execute immediately, in cases where
  //   a location.hash exists on page load, via bookmark or page refresh for
  //   example, use jQuery(window).hashchange() or the more verbose 
  //   jQuery(window).trigger( 'hashchange' ).
  // * The event can be bound before DOM ready, but since it won't be usable
  //   before then in IE6/7 (due to the necessary Iframe), recommended usage is
  //   to bind it inside a DOM ready handler.
  
  // Override existing $.event.special.hashchange methods (allowing this plugin
  // to be defined after jQuery BBQ in BBQ's source code).
  special[ str_hashchange ] = $.extend( special[ str_hashchange ], {
    
    // Called only when the first 'hashchange' event is bound to window.
    setup: function() {
      // If window.onhashchange is supported natively, there's nothing to do..
      if ( supports_onhashchange ) { return false; }
      
      // Otherwise, we need to create our own. And we don't want to call this
      // until the user binds to the event, just in case they never do, since it
      // will create a polling loop and possibly even a hidden Iframe.
      $( fake_onhashchange.start );
    },
    
    // Called only when the last 'hashchange' event is unbound from window.
    teardown: function() {
      // If window.onhashchange is supported natively, there's nothing to do..
      if ( supports_onhashchange ) { return false; }
      
      // Otherwise, we need to stop ours (if possible).
      $( fake_onhashchange.stop );
    }
    
  });
  
  // fake_onhashchange does all the work of triggering the window.onhashchange
  // event for browsers that don't natively support it, including creating a
  // polling loop to watch for hash changes and in IE 6/7 creating a hidden
  // Iframe to enable back and forward.
  fake_onhashchange = (function(){
    var self = {},
      timeout_id,
      
      // Remember the initial hash so it doesn't get triggered immediately.
      last_hash = get_fragment(),
      
      fn_retval = function(val){ return val; },
      history_set = fn_retval,
      history_get = fn_retval;
    
    // Start the polling loop.
    self.start = function() {
      timeout_id || poll();
    };
    
    // Stop the polling loop.
    self.stop = function() {
      timeout_id && clearTimeout( timeout_id );
      timeout_id = undefined;
    };
    
    // This polling loop checks every $.fn.hashchange.delay milliseconds to see
    // if location.hash has changed, and triggers the 'hashchange' event on
    // window when necessary.
    function poll() {
      var hash = get_fragment(),
        history_hash = history_get( last_hash );
      
      if ( hash !== last_hash ) {
        history_set( last_hash = hash, history_hash );
        
        $(window).trigger( str_hashchange );
        
      } else if ( history_hash !== last_hash ) {
        location.href = location.href.replace( /#.*/, '' ) + history_hash;
      }
      
      timeout_id = setTimeout( poll, $.fn[ str_hashchange ].delay );
    };
    
    // vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
    // vvvvvvvvvvvvvvvvvvv REMOVE IF NOT SUPPORTING IE6/7/8 vvvvvvvvvvvvvvvvvvv
    // vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
    window.navigator.userAgent.indexOf("MSIE ") > 0 && !supports_onhashchange && (function(){
      // Not only do IE6/7 need the "magical" Iframe treatment, but so does IE8
      // when running in "IE7 compatibility" mode.
      
      var iframe,
        iframe_src;
      
      // When the event is bound and polling starts in IE 6/7, create a hidden
      // Iframe for history handling.
      self.start = function(){
        if ( !iframe ) {
          iframe_src = $.fn[ str_hashchange ].src;
          iframe_src = iframe_src && iframe_src + get_fragment();
          
          // Create hidden Iframe. Attempt to make Iframe as hidden as possible
          // by using techniques from http://www.paciellogroup.com/blog/?p=604.
          iframe = $('<iframe tabindex="-1" title="empty"/>').hide()
            
            // When Iframe has completely loaded, initialize the history and
            // start polling.
            .one( 'load', function(){
              iframe_src || history_set( get_fragment() );
              poll();
            })
            
            // Load Iframe src if specified, otherwise nothing.
            .attr( 'src', iframe_src || 'javascript:0' )
            
            // Append Iframe after the end of the body to prevent unnecessary
            // initial page scrolling (yes, this works).
            .insertAfter( 'body' )[0].contentWindow;
          
          // Whenever `document.title` changes, update the Iframe's title to
          // prettify the back/next history menu entries. Since IE sometimes
          // errors with "Unspecified error" the very first time this is set
          // (yes, very useful) wrap this with a try/catch block.
          doc.onpropertychange = function(){
            try {
              if ( event.propertyName === 'title' ) {
                iframe.document.title = doc.title;
              }
            } catch(e) {}
          };
          
        }
      };
      
      // Override the "stop" method since an IE6/7 Iframe was created. Even
      // if there are no longer any bound event handlers, the polling loop
      // is still necessary for back/next to work at all!
      self.stop = fn_retval;
      
      // Get history by looking at the hidden Iframe's location.hash.
      history_get = function() {
        return get_fragment( iframe.location.href );
      };
      
      // Set a new history item by opening and then closing the Iframe
      // document, *then* setting its location.hash. If document.domain has
      // been set, update that as well.
      history_set = function( hash, history_hash ) {
        var iframe_doc = iframe.document,
          domain = $.fn[ str_hashchange ].domain;
        
        if ( hash !== history_hash ) {
          // Update Iframe with any initial `document.title` that might be set.
          iframe_doc.title = doc.title;
          
          // Opening the Iframe's document after it has been closed is what
          // actually adds a history entry.
          iframe_doc.open();
          
          // Set document.domain for the Iframe document as well, if necessary.
          domain && iframe_doc.write( '<script>document.domain="' + domain + '"</script>' );
          
          iframe_doc.close();
          
          // Update the Iframe's hash, for great justice.
          iframe.location.hash = hash;
        }
      };
      
    })();
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // ^^^^^^^^^^^^^^^^^^^ REMOVE IF NOT SUPPORTING IE6/7/8 ^^^^^^^^^^^^^^^^^^^
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    
    return self;
  })();
  
})(jQuery,this);
