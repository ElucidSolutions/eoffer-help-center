$(document).ready(function() {
	$('.accordion-tabs').each(function(index) {
		$(this).children('li').first().children('a').addClass('is-active').next().addClass('is-open').show();
	});

	$('.accordion-tabs').on('click', 'li > a', function(event) {
		if (!$(this).hasClass('is-active')) {
			event.preventDefault();
			var accordionTabs = $(this).closest('.accordion-tabs');
			accordionTabs.find('.is-open').removeClass('is-open').hide();

			$(this).next().toggleClass('is-open').toggle();
			accordionTabs.find('.is-active').removeClass('is-active');
			$(this).addClass('is-active');
		} else {
			event.preventDefault();
		}
	});

	// set up search indexing

	// contains mapping of words to nodes that contain the word
	var textIndex = {};

	var indexText = function(text, clip, index) {
		var node = {
			innerHTML : text,
			clip : clip,
			index : index
		};
		var words = text.toLowerCase().split(/[^A-Za-z0-9]/);
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

	/**
	 * Grab events for all input text boxes.
	 */
	var commandeerSearchBoxes = function() {
		// jquery for ie8 compat wrt keyCode
		$('input[name="transcript-search"]').bind('keyup', function(e) {
			if (e.target.value.trim().length === 0) {
				onSearch(e.target);
			} else if (e.which == 13) {
				onSearch(e.target);
			}
		}).click(function(e) {
			e.stopPropagation();
		}).parent().click(function(e) {
			var box = $('input[name="transcript-search"]');
			box.val("");
			onSearch(box[0]);
		});

	};

	/**
	 * Assumes result container element called "container-search". Assumes
	 * search results section called "#advanced-search".
	 */
	var onSearch = function(node) {
		console.log("onSearch: " + node.value);
		var navigator = $("#navigator");
		navigator.removeClass("showing-container-search");
		var searchResults = document.getElementById("container-search");
		if (searchResults) {
			while (searchResults.hasChildNodes()) {
				searchResults.removeChild(searchResults.lastChild);
			}
			searchResults.removeAttribute("count");
			var i, j;

			if (node.value !== null && node.value.length > 0) {
				navigator.addClass("showing-container-search");
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
				for (i = 0; i < results.length; i++) {
					// create a results node
					result = document.createElement("div");
					result.className = "search-result";
					headline = document.createElement("a");
					headline.className = "search-result-title";
					preview = document.createElement("p");
					preview.className = "search-result-preview";
					result.appendChild(headline);
					result.appendChild(preview);

					// populate node
					preview.innerHTML = results[i].innerHTML;
					for (j = 0; j < tokens.length; j++) {
						// wrap each term occurance with highlight span;
						// case-insensitive and respecting word
						// boundaries
						preview.innerHTML = preview.innerHTML.replace(new RegExp("\\b" + tokens[j] + "\\b", "ig"), "<span class='" + "search-term" + "'>$&</span>");
					}
					headline.innerHTML = results[i].clip.workingTitle;
					searchResults.appendChild(result);
					headline.searchResult = results[i];
					$(headline).click(function(e) {
						onResultClick(e.target.searchResult);
					});
				}
				searchResults.setAttribute("count", results.length);
			}
		} else {
			console.log("WARN: No search results container found with id: " + "container-search");
		}

	};

	var onResultClick = function(result) {
		playClip(result.clip, result.clip.captionTimes[result.index]);
		// toggle transcript tab
		$("#navigator").removeClass("transcript").addClass("transcript");
	};

	// set up progress callbacks

	var timer = null;

	var tick = function(player, clip) {
		// console.log(player.getTime());
		$("#directory ul li").each(function() {
			$(this).removeClass("now-playing");
			if (this.clip === clip) {
				$(this).addClass("now-playing");
			}
		});
		$("#current-clip-title").text(clip.workingTitle);
		$("#current-clip-category").text(clip.workingCategory);
		updateTranscript(player.getTime());
	};
	
	var ignoreHashChanged = false;

	var start = function(clip) {
		// console.log("clip started");
		var self = this;
		if (timer !== null) {
			clearInterval(timer);
		}
		timer = setInterval(function() {
			tick(self, clip);
		}, 500);
		populateDetails(clip);
		populateTranscript(clip);
		$(".tab-transcript").click();
		ignoreHashChanged = true;
		location.hash = "#" + encodeURIComponent(clip.workingTitle);
	};

	var stop = function(clip) {
		// console.log("clip stopped");
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};

	var fetchCaptions = function(clip) {
		var clap = clip;
		$.ajax({
			url : clip.captionUrl,
			success : function(data) {
				var title;
				var time;
				var text;
				clap.workingTitle = $(data).find("head metadata title, head metadata ttm\\:title").text();
				clap.workingDesc = $(data).find("head metadata desc, head metadata ttm\\:desc").text();
				clap.workingCategory = $(data).find("head metadata category").text();
				clap.bookmarkTitles = [];
				clap.bookmarkTimes = [];
				clap.captionTitles = [];
				clap.captionTimes = [];
				$(data).find("body p").each(function() {
					time = convertToSeconds($(this).attr("begin"));
					title = $(this).attr("title");
					if (title) {
						clap.bookmarkTitles.push(title);
						clap.bookmarkTimes.push(time);
					}
					text = $(this).text();
					indexText(text, clap, clap.captionTitles.length);
					clap.captionTitles.push(text);
					clap.captionTimes.push(time);
					clap.captionDuration = Math.round(time);
				});
				populateNavigator();
			},
			error : function(e) {
				console.log("Error: could not load captions: " + clip.captionUrl);
				console.log(e);
			}
		});
	};

	var convertToSeconds = function(time) {
		var result = NaN;
		var parts = time.split(":");
		if (parts.length === 3) {
			result = Number(parts[0]) * 60 * 60 + Number(parts[1]) * 60 + Number(parts[2]);
		}
		return result;
	};

	var populateNavigator = function() {
		var directory = document.getElementById("directory");
		removeNodes(directory);
		var i = 0;
		var j = 0;
		var ul;
		var olli;
		var ulli;
		var span;
		var anchor;
		var clips = $f("player").getPlaylist();

		var category;
		var categories = [];
		var categoryToClips = {};
		for (i in clips) {
			clip = clips[i];
			category = clip.workingCategory;
			if (!category) {
				category = "Videos";
			}
			if (!categoryToClips[category]) {
				categoryToClips[category] = [];
				categories.push(category);
			}
			categoryToClips[category].push(clip);
		}

		var combinedSpan;
		var combinedDuration;
		for (j in categories) {
			category = categories[j];
			clips = categoryToClips[category];
			olli = document.createElement("li");
			anchor = document.createElement("a");
			span = document.createElement("span");
			span.setAttribute("class", "nav-title");
			$(span).text(category);
			anchor.appendChild(span);
			olli.appendChild(anchor);
			$(anchor).click(function(e) {
				$(this).parent().toggleClass("collapsed");
			});
			span = document.createElement("span");
			span.setAttribute("class", "nav-time");
			combinedSpan = span;
			olli.appendChild(span);
			directory.appendChild(olli);
			combinedDuration = 0;
			for (i in clips) {
				ul = document.createElement("ul");
				olli.appendChild(ul);
				clip = clips[i];
				combinedDuration = combinedDuration + clip.captionDuration; // clip.fullDuration;
				if (clip.workingTitle) {
					title = clip.workingTitle;
					time = clip.captionDuration; // clip.fullDuration;
					ulli = document.createElement("li");
					ulli.title = title;
					ulli.time = time;
					ulli.clip = clip;
					ul.appendChild(ulli);
					anchor = document.createElement("a");
					span = document.createElement("span");
					span.setAttribute("class", "nav-title");
					$(span).text(title);
					anchor.appendChild(span);
					ulli.appendChild(anchor);
					span = document.createElement("span");
					span.setAttribute("class", "nav-time");
					$(span).text(convertToMinutes(time));
					ulli.appendChild(span);
					$(ulli).click(function(e) {
						e.preventDefault();
						playClip(this.clip, 0, this.title);
					});
				}
				if (j == "0" && i === "0") {
					populateDetails(clip);
					populateTranscript(clip);
					$("#current-clip-title").text(clip.workingTitle);
					$("#current-clip-category").text(clip.workingCategory);
				}
			}
			$(combinedSpan).text(convertToMinutes(combinedDuration));
		}
	};

	var convertToMinutes = function(seconds) {
		var minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds - 60 * minutes);
		var result = seconds + "s";
		if (minutes > 0) {
			result = minutes + "m " + result;
		}
		return result;
	};

	var populateDetails = function(clip) {
		var details = document.getElementById("details");
		removeNodes(details);
		var e;
		e = document.createElement("p");
		e.setAttribute("class", "clip-title");
		$(e).text(clip.workingTitle);
		details.appendChild(e);
		e = document.createElement("p");
		e.setAttribute("class", "clip-desc");
		$(e).text(clip.workingDesc);
		details.appendChild(e);
	};

	var populateTranscript = function(clip) {
		var transcript = document.getElementById("transcript");
		removeNodes(transcript);
		var e;
		for ( var i in clip.captionTitles) {
			e = document.createElement("span");
			e.setAttribute("class", "caption");
			e.setAttribute("time", clip.captionTimes[i]);
			$(e).text(clip.captionTitles[i] + ' ');
			transcript.appendChild(e);
			e.clipReference = clip;
			$(e).click(function() {
				playClip(clip, Number(this.getAttribute("time")));
			});
		}
	};

	var updateTranscript = function(time) {
		time = Number(time);
		// remove existing timecode
		$("#transcript span.current").removeClass("current");
		// find latest
		var latest = null;
		$("#transcript span[time]").each(function() {
			if (Number($(this).attr("time")) <= time) {
				latest = this;
			}
		});
		if (latest !== null) {
			$(latest).addClass("current");
			scrollToView(latest);
		}
	};

	var scrollToView = function(element) {
		var scrollView = $(element).parents(".container-transcript")[0];
		var top = scrollView.scrollTop;
		var bottom = top + scrollView.clientHeight;
		if (Math.abs(element.offsetTop-top) > 18 ) {
			$(scrollView).animate({
				scrollTop : element.offsetTop - 4
			});
 		}
// 		if (element.offsetTop + element.offsetHeight > bottom) {
// 			$(scrollView).animate({
// 				scrollTop : element.offsetTop //+ element.offsetHeight - scrollView.clientHeight
// 			});
// 		}
		return true;
	};

	var removeNodes = function(container) {
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}
	};

	var playClip = function(clip, time, title) {
		console.log("playClip: " + time + " : " + title);
		console.log(clip);
		if (time === undefined) {
			time = 0;
		}
		if (title === undefined) {
			title = "";
		}

		var player = $f("player");
		player.pause();
		if (clip && player.getClip() !== clip) {
			player.play(clip.index);
		}
		// allow time to load
		if ( time ) {
			setTimeout(function() {
				player.seek(Number(time));
				player.resume();
			}, 500);
		}
	};

	var initWithPlaylist = function(playlist) {
		var player = $f("player", "flowplayer-3.2.15.swf", {
			playlist : playlist,
			plugins : {
				captions : {
					url : "flowplayer.captions-3.2.3.swf",
					// pointer to a content plugin (see below)
					captionTarget : 'content',
				},
				// configure a content plugin to look good for our purpose
				content : {
					url : "flowplayer.content-3.2.0.swf",
					bottom : 10,
					height : 80,
					width : 450,
					backgroundColor : 'transparent',
					backgroundGradient : 'none',
					border : 0,
					display : 'none',
					textDecoration : 'outline',
					style : {
						body : {
							fontSize : 24,
							fontFamily : 'Arial',
							textAlign : 'center',
							color : '#ffffff'
						}
					}
				},
			}
		});
		// scan each clip for metadata
		var clips = player.getPlaylist();
		for ( var i in clips) {
			fetchCaptions(clips[i]);
		}
		player.getCommonClip().onStart(start);
		player.getCommonClip().onPause(stop);
		player.getCommonClip().onResume(start);
		player.getCommonClip().onStop(stop);
		$('input[name="transcript-search"]').val("");
		onSearch($('input[name="transcript-search"]')[0]);
	};
	window.initWithPlaylist = initWithPlaylist;

	var hashChanged = function() {
		if (!ignoreHashChanged && location.hash !== null && location.hash.indexOf('#') === 0) {
			ignoreHashChanged = true;
			var name = decodeURIComponent(location.hash.substring(1));
			var clip;
			var clips = $f("player").getPlaylist();
			for (i in clips) {
				clip = clips[i];
				if (clip.workingTitle == name) {
					playClip(clip);
					break;
				}
			}
		}
	};

	var setup = function() {
		commandeerSearchBoxes();

		// setup transcript tab toggle
		var navigator = $("#navigator");
		$(".tab-details").click(function() {
			navigator.removeClass("transcript");
		});
		$(".tab-transcript").click(function() {
			navigator.removeClass("transcript");
			navigator.addClass("transcript");
		});

		// expansion/collapse
		$(".nav-collapse").click(function() {
			$(".container-directory ol>li").removeClass("collapsed").addClass("collapsed");
		});
		$(".nav-expand").click(function() {
			$(".container-directory ol>li").removeClass("collapsed");
		});

		// hash changes
		$(window).bind('hashchange', hashChanged); // jq for ie8 compat

	};

	setup();
});