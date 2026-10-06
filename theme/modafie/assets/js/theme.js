/**
 * Modafie theme behaviour.
 *
 * Dependency-free (IntersectionObserver + rAF). Every effect is opt-in via a CSS class
 * that can be added to any Elementor widget/container under Advanced → CSS Classes:
 *
 *   mf-reveal      line-by-line masked text reveal (headings, text)
 *   mf-hero-zoom   slow zoom on the element's background image
 *   mf-parallax    parallax on a background image or an Image widget
 *   mf-marquee     infinite ticker (add mf-marquee--slow / --fast / --reverse)
 *   mf-carousel    horizontal rail with drag + momentum, arrows and progress
 *   mf-fade-up     fade + rise when scrolled into view
 *   mf-stagger     children fade up one after another
 *   (mf-hover-zoom, mf-btn-fill, mf-btn-slide are CSS-only)
 *
 * All motion is skipped when the visitor prefers reduced motion.
 */
(function () {
	'use strict';

	var doc = document;
	var root = doc.documentElement;
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var isEditor = function () {
		return doc.body.classList.contains('elementor-editor-active') || /elementor-preview/.test(location.search);
	};

	root.classList.add('mf-js');
	if (reduceMotion) {
		root.classList.add('mf-reduce-motion');
	}

	/* ------------------------------------------------------------------ utils */
	function once(el, key) {
		if (el.dataset['mf' + key]) {
			return false;
		}
		el.dataset['mf' + key] = '1';
		return true;
	}
	function debounce(fn, ms) {
		var t;
		return function () {
			clearTimeout(t);
			t = setTimeout(fn, ms);
		};
	}
	function inViewObserver(cb, opts) {
		if (!('IntersectionObserver' in window)) {
			return {
				observe: function (el) {
					cb(el);
				}
			};
		}
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) {
					io.unobserve(e.target);
					cb(e.target);
				}
			});
		}, opts || { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
		return io;
	}
	function contentRoot(el) {
		return el.querySelector(':scope > .elementor-widget-container') || el;
	}

	/* ------------------------------------------------------------------ header */
	function initHeader() {
		var header = doc.getElementById('masthead');
		if (!header || !once(header, 'header')) {
			return;
		}
		var behavior = header.getAttribute('data-behavior');
		var lastY = window.scrollY;
		var ticking = false;
		var setHeight = function () {
			root.style.setProperty('--mf-header-h', header.offsetHeight + 'px');
		};
		setHeight();
		window.addEventListener('resize', debounce(setHeight, 150));

		function update() {
			var y = Math.max(0, window.scrollY);
			header.classList.toggle('is-scrolled', y > 8);
			if (behavior === 'smart') {
				var menuOpen = header.contains(doc.activeElement) && doc.activeElement !== doc.body;
				// offsetTop of a sticky element follows the scroll, so measure from what sits above it.
				var bar = doc.querySelector('.mf-announcement');
				var threshold = (bar ? bar.offsetHeight : 0) + header.offsetHeight + 80;
				if (y > lastY + 4 && y > threshold && !menuOpen && !header.classList.contains('has-open-panel')) {
					header.classList.add('is-hidden');
				} else if (y < lastY - 4 || y <= threshold) {
					header.classList.remove('is-hidden');
				}
			}
			lastY = y;
			ticking = false;
		}
		window.addEventListener('scroll', function () {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		}, { passive: true });
		update();

		// Dropdowns / mega menu: keyboard + touch support (hover handled in CSS).
		header.querySelectorAll('.mf-menu > .menu-item-has-children > a').forEach(function (link) {
			var li = link.parentElement;
			var close = function () {
				li.classList.remove('is-open');
				link.setAttribute('aria-expanded', 'false');
				header.classList.remove('has-open-panel');
			};
			link.addEventListener('click', function (e) {
				var touch = window.matchMedia('(hover: none)').matches;
				if (touch && !li.classList.contains('is-open')) {
					e.preventDefault();
					header.querySelectorAll('.mf-menu > .is-open').forEach(function (o) {
						o.classList.remove('is-open');
					});
					li.classList.add('is-open');
					link.setAttribute('aria-expanded', 'true');
					header.classList.add('has-open-panel');
				}
			});
			li.addEventListener('mouseenter', function () {
				link.setAttribute('aria-expanded', 'true');
			});
			li.addEventListener('mouseleave', function () {
				close();
			});
			li.addEventListener('focusout', function (e) {
				if (!li.contains(e.relatedTarget)) {
					close();
				}
			});
			li.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') {
					close();
					link.focus();
				}
			});
		});

		// Search panel.
		var searchBtn = header.querySelector('.mf-search-toggle');
		var searchPanel = doc.getElementById('mf-search');
		if (searchBtn && searchPanel) {
			searchBtn.addEventListener('click', function () {
				var open = searchPanel.hasAttribute('hidden');
				searchPanel.toggleAttribute('hidden', !open);
				searchBtn.setAttribute('aria-expanded', String(open));
				header.classList.toggle('has-open-panel', open);
				if (open) {
					var input = searchPanel.querySelector('input[type=search]');
					if (input) {
						input.focus();
					}
				}
			});
			searchPanel.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') {
					searchPanel.setAttribute('hidden', '');
					searchBtn.setAttribute('aria-expanded', 'false');
					header.classList.remove('has-open-panel');
					searchBtn.focus();
				}
			});
		}
	}

	/* --------------------------------------------------------------- offcanvas */
	function initOffcanvas() {
		var panel = doc.getElementById('mf-offcanvas');
		var toggle = doc.querySelector('.mf-header__toggle');
		if (!panel || !toggle || !once(panel, 'offcanvas')) {
			return;
		}
		var dialog = panel.querySelector('.mf-offcanvas__panel');
		var lastFocus = null;

		function open() {
			lastFocus = doc.activeElement;
			panel.removeAttribute('hidden');
			requestAnimationFrame(function () {
				panel.classList.add('is-open');
			});
			toggle.setAttribute('aria-expanded', 'true');
			doc.body.classList.add('mf-lock');
			var first = dialog.querySelector('a, button');
			if (first) {
				first.focus();
			}
		}
		function close() {
			panel.classList.remove('is-open');
			toggle.setAttribute('aria-expanded', 'false');
			doc.body.classList.remove('mf-lock');
			setTimeout(function () {
				panel.setAttribute('hidden', '');
			}, reduceMotion ? 0 : 320);
			if (lastFocus) {
				lastFocus.focus();
			}
		}
		toggle.addEventListener('click', open);
		panel.querySelectorAll('[data-mf-close]').forEach(function (b) {
			b.addEventListener('click', close);
		});
		panel.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				close();
			}
			if (e.key === 'Tab') {
				var f = dialog.querySelectorAll('a[href], button:not([disabled]), input');
				var visible = Array.prototype.filter.call(f, function (x) {
					return x.offsetParent !== null;
				});
				if (!visible.length) {
					return;
				}
				var first = visible[0];
				var last = visible[visible.length - 1];
				if (e.shiftKey && doc.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && doc.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		});
		// Accordion sub-menus.
		panel.querySelectorAll('.menu-item-has-children').forEach(function (li, i) {
			var sub = li.querySelector(':scope > .sub-menu');
			if (!sub) {
				return;
			}
			sub.id = sub.id || 'mf-sub-' + i;
			var btn = doc.createElement('button');
			btn.type = 'button';
			btn.className = 'mf-sub-toggle';
			btn.setAttribute('aria-expanded', 'false');
			btn.setAttribute('aria-controls', sub.id);
			btn.innerHTML = '<span class="screen-reader-text">Toggle sub-menu</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
			li.insertBefore(btn, sub);
			btn.addEventListener('click', function () {
				var openNow = btn.getAttribute('aria-expanded') !== 'true';
				btn.setAttribute('aria-expanded', String(openNow));
				li.classList.toggle('is-open', openNow);
			});
		});
		window.addEventListener('resize', debounce(function () {
			if (window.innerWidth > 1024 && panel.classList.contains('is-open')) {
				close();
			}
		}, 200));
	}

	/* ------------------------------------------------------------ text reveal */
	function splitWords(target) {
		var words = [];
		var walk = function (node) {
			Array.prototype.slice.call(node.childNodes).forEach(function (child) {
				if (child.nodeType === 3) {
					var parts = child.textContent.split(/(\s+)/);
					var frag = doc.createDocumentFragment();
					parts.forEach(function (p) {
						if (!p) {
							return;
						}
						if (/^\s+$/.test(p)) {
							frag.appendChild(doc.createTextNode(' '));
							return;
						}
						var w = doc.createElement('span');
						w.className = 'mf-w';
						var inner = doc.createElement('span');
						inner.className = 'mf-w__i';
						inner.textContent = p;
						w.appendChild(inner);
						frag.appendChild(w);
						words.push(w);
					});
					node.replaceChild(frag, child);
				} else if (child.nodeType === 1 && child.tagName !== 'BR') {
					walk(child);
				}
			});
		};
		walk(target);
		return words;
	}
	function initReveal(scope) {
		var els = scope.querySelectorAll('.mf-reveal');
		if (!els.length) {
			return;
		}
		var io = inViewObserver(function (el) {
			el.classList.add('is-revealed');
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
		els.forEach(function (el) {
			if (!once(el, 'reveal')) {
				return;
			}
			// Never split text inside the editor: inline editing would save the spans.
			if (reduceMotion || isEditor()) {
				el.classList.add('is-revealed');
				return;
			}
			var target = el.querySelector('.elementor-heading-title') || contentRoot(el);
			var words = splitWords(target);
			// Group words into lines by their vertical position; stagger per line.
			var line = -1;
			var lastTop = null;
			words.forEach(function (w) {
				var top = w.offsetTop;
				if (lastTop === null || Math.abs(top - lastTop) > 4) {
					line++;
					lastTop = top;
				}
				w.style.setProperty('--mf-line', line);
			});
			el.classList.add('mf-reveal--ready');
			io.observe(el);
		});
	}

	/* ------------------------------------------------- background image layer */
	function bgLayer(el, cls) {
		var existing = el.querySelector(':scope > .mf-bg-layer');
		if (existing) {
			return existing;
		}
		var layer = doc.createElement('div');
		layer.className = 'mf-bg-layer ' + cls;
		layer.setAttribute('aria-hidden', 'true');
		var sync = function () {
			var cs = getComputedStyle(el);
			if (cs.backgroundImage && cs.backgroundImage !== 'none') {
				layer.style.backgroundImage = cs.backgroundImage;
				layer.style.backgroundPosition = cs.backgroundPosition;
				layer.style.backgroundSize = cs.backgroundSize === 'auto' ? 'cover' : cs.backgroundSize;
				layer.style.backgroundRepeat = 'no-repeat';
				return true;
			}
			return false;
		};
		el.classList.add('mf-has-layer');
		el.insertBefore(layer, el.firstChild);
		if (!sync()) {
			// Elementor may lazy-load the background; wait for it.
			var mo = new MutationObserver(function () {
				if (sync()) {
					mo.disconnect();
				}
			});
			mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
		}
		window.addEventListener('resize', debounce(sync, 250));
		return layer;
	}

	function initHeroZoom(scope) {
		scope.querySelectorAll('.mf-hero-zoom').forEach(function (el) {
			if (!once(el, 'zoom') || reduceMotion) {
				return;
			}
			var img = el.matches('.elementor-widget-image') ? el.querySelector('img') : null;
			if (img) {
				img.classList.add('mf-zoom-target');
			} else {
				bgLayer(el, 'mf-zoom-target');
			}
			requestAnimationFrame(function () {
				el.classList.add('is-zooming');
			});
		});
	}

	// Background-image containers with mf-hover-zoom get a layer so the zoom is a cheap transform.
	function initHoverZoom(scope) {
		scope.querySelectorAll('.e-con.mf-hover-zoom').forEach(function (el) {
			if (!once(el, 'hoverzoom') || el.querySelector(':scope > .mf-bg-layer')) {
				return;
			}
			if (getComputedStyle(el).backgroundImage !== 'none' || el.classList.contains('e-lazyloaded') === false) {
				bgLayer(el, '');
			}
		});
	}

	var parallaxItems = [];
	var parallaxTicking = false;
	function updateParallax() {
		var vh = window.innerHeight;
		parallaxItems.forEach(function (item) {
			var r = item.host.getBoundingClientRect();
			if (r.bottom < -100 || r.top > vh + 100) {
				return;
			}
			// progress: -1 (entering bottom) … 1 (leaving top)
			var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
			item.target.style.transform = 'translate3d(0,' + (p * item.strength * -1).toFixed(2) + '%,0) scale(' + item.scale + ')';
		});
		parallaxTicking = false;
	}
	function initParallax(scope) {
		if (reduceMotion) {
			return;
		}
		scope.querySelectorAll('.mf-parallax').forEach(function (el) {
			if (!once(el, 'parallax')) {
				return;
			}
			var strength = el.classList.contains('mf-parallax--strong') ? 14 : 8;
			var img = el.querySelector('img');
			var target;
			if (el.matches('.elementor-widget-image, .elementor-widget-image-box') && img) {
				var wrap = img.parentElement.tagName === 'A' ? img.parentElement : img.parentElement;
				wrap.classList.add('mf-parallax-clip');
				target = img;
			} else {
				target = bgLayer(el, 'mf-parallax-layer');
			}
			parallaxItems.push({ host: el, target: target, strength: strength, scale: target.tagName === 'IMG' ? 1.2 : 1 });
		});
		if (parallaxItems.length && !initParallax.bound) {
			initParallax.bound = true;
			var onScroll = function () {
				if (!parallaxTicking) {
					parallaxTicking = true;
					requestAnimationFrame(updateParallax);
				}
			};
			window.addEventListener('scroll', onScroll, { passive: true });
			window.addEventListener('resize', onScroll);
		}
		updateParallax();
	}

	/* ----------------------------------------------------------------- marquee */
	function initMarquee(scope) {
		var els = scope.matches && scope.matches('.mf-marquee') ? [scope] : [];
		els = els.concat(Array.prototype.slice.call(scope.querySelectorAll('.mf-marquee')));
		els.forEach(function (el) {
			if (isEditor() || !once(el, 'marquee')) {
				return; // static in the editor so inline text editing keeps working
			}
			var host = contentRoot(el);
			var source = doc.createElement('div');
			source.className = 'mf-marquee__item';
			while (host.firstChild) {
				source.appendChild(host.firstChild);
			}
			var track = doc.createElement('div');
			track.className = 'mf-marquee__track';
			var group = doc.createElement('div');
			group.className = 'mf-marquee__group';
			group.appendChild(source);
			track.appendChild(group);
			host.appendChild(track);
			host.classList.add('mf-marquee__viewport');

			var build = function () {
				// Fill one group to at least the viewport width, then duplicate it.
				while (group.children.length > 1) {
					group.removeChild(group.lastChild);
				}
				Array.prototype.slice.call(track.children, 1).forEach(function (n) {
					track.removeChild(n);
				});
				var w = source.getBoundingClientRect().width || 1;
				var need = Math.min(30, Math.ceil(Math.max(window.innerWidth, host.clientWidth) / w));
				for (var i = 1; i < need; i++) {
					var c = source.cloneNode(true);
					c.setAttribute('aria-hidden', 'true');
					group.appendChild(c);
				}
				var clone = group.cloneNode(true);
				clone.setAttribute('aria-hidden', 'true');
				Array.prototype.forEach.call(clone.querySelectorAll('a,button'), function (a) {
					a.setAttribute('tabindex', '-1');
				});
				track.appendChild(clone);
				var speed = el.classList.contains('mf-marquee--fast') ? 120 : el.classList.contains('mf-marquee--slow') ? 35 : 70; // px/s
				track.style.setProperty('--mf-marquee-duration', (group.getBoundingClientRect().width / speed).toFixed(2) + 's');
				el.classList.add('mf-marquee--ready');
			};
			if (doc.fonts && doc.fonts.ready) {
				doc.fonts.ready.then(build);
			} else {
				build();
			}
			window.addEventListener('resize', debounce(build, 300));
		});
	}

	/* ------------------------------------------------- announcement rotation */
	function initAnnouncement() {
		var bar = doc.querySelector('.mf-announcement--rotate');
		if (!bar || !once(bar, 'announce')) {
			return;
		}
		var items = bar.querySelectorAll('.mf-announcement__item');
		if (items.length < 2) {
			return;
		}
		var i = 0;
		var paused = false;
		bar.addEventListener('mouseenter', function () {
			paused = true;
		});
		bar.addEventListener('mouseleave', function () {
			paused = false;
		});
		bar.addEventListener('focusin', function () {
			paused = true;
		});
		bar.addEventListener('focusout', function () {
			paused = false;
		});
		setInterval(function () {
			if (paused || doc.hidden) {
				return;
			}
			items[i].classList.remove('is-active');
			i = (i + 1) % items.length;
			items[i].classList.add('is-active');
		}, 4500);
	}

	/* ---------------------------------------------------------------- carousel */
	function initCarousel(scope) {
		scope.querySelectorAll('.mf-carousel').forEach(function (el) {
			if (!once(el, 'carousel')) {
				return;
			}
			var track = el.querySelector(':scope > .e-con-inner') || el;
			track.classList.add('mf-carousel__track');
			var editor = isEditor();

			// Arrows + progress (front end only; never restructure the editor DOM).
			if (!editor) {
				var nav = doc.createElement('div');
				nav.className = 'mf-carousel-nav';
				nav.innerHTML =
					'<div class="mf-carousel-progress" aria-hidden="true"><span></span></div>' +
					'<button type="button" class="mf-carousel-btn mf-carousel-prev" aria-label="Previous"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>' +
					'<button type="button" class="mf-carousel-btn mf-carousel-next" aria-label="Next"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>';
				el.parentNode.insertBefore(nav, el.nextSibling);
				var bar = nav.querySelector('.mf-carousel-progress span');
				var step = function (dir) {
					var card = track.firstElementChild;
					var w = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth * 0.8;
					track.scrollBy({ left: dir * w * Math.max(1, Math.floor(track.clientWidth / w)), behavior: reduceMotion ? 'auto' : 'smooth' });
				};
				nav.querySelector('.mf-carousel-prev').addEventListener('click', function () {
					step(-1);
				});
				nav.querySelector('.mf-carousel-next').addEventListener('click', function () {
					step(1);
				});
				var progress = function () {
					var max = track.scrollWidth - track.clientWidth;
					var ratio = track.clientWidth / Math.max(track.scrollWidth, 1);
					bar.style.width = (ratio * 100).toFixed(2) + '%';
					bar.style.transform = 'translateX(' + (max > 0 ? (track.scrollLeft / max) * ((1 / ratio) - 1) * 100 : 0).toFixed(2) + '%)';
					nav.classList.toggle('is-static', max <= 2);
				};
				track.addEventListener('scroll', progress, { passive: true });
				window.addEventListener('resize', debounce(progress, 150));
				progress();
			}

			// Mouse drag with momentum (touch uses native scrolling).
			var down = false;
			var startX = 0;
			var startScroll = 0;
			var lastX = 0;
			var lastT = 0;
			var velocity = 0;
			var moved = false;
			var raf = null;
			track.addEventListener('pointerdown', function (e) {
				if (e.pointerType !== 'mouse' || e.button !== 0 || editor) {
					return;
				}
				down = true;
				moved = false;
				startX = lastX = e.clientX;
				startScroll = track.scrollLeft;
				lastT = performance.now();
				velocity = 0;
				cancelAnimationFrame(raf);
			});
			window.addEventListener('pointermove', function (e) {
				if (!down) {
					return;
				}
				var dx = e.clientX - startX;
				if (!moved && Math.abs(dx) > 5) {
					moved = true;
					track.classList.add('is-dragging');
				}
				if (moved) {
					track.scrollLeft = startScroll - dx;
					var now = performance.now();
					velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
					lastX = e.clientX;
					lastT = now;
				}
			});
			var end = function () {
				if (!down) {
					return;
				}
				down = false;
				if (!moved) {
					return;
				}
				var v = velocity * 16; // px per frame
				var glide = function () {
					v *= 0.94;
					track.scrollLeft -= v;
					if (Math.abs(v) > 0.5 && !reduceMotion) {
						raf = requestAnimationFrame(glide);
					} else {
						track.classList.remove('is-dragging'); // re-enables snap
					}
				};
				raf = requestAnimationFrame(glide);
			};
			window.addEventListener('pointerup', end);
			window.addEventListener('pointercancel', end);
			track.addEventListener('click', function (e) {
				if (moved) {
					e.preventDefault();
					e.stopPropagation();
					moved = false;
				}
			}, true);
			track.addEventListener('dragstart', function (e) {
				e.preventDefault();
			});
		});
	}

	/* ------------------------------------------------------ fade-up & stagger */
	function initFade(scope) {
		var io = inViewObserver(function (el) {
			el.classList.add('is-inview');
		});
		scope.querySelectorAll('.mf-fade-up, .mf-stagger').forEach(function (el) {
			if (!once(el, 'fade')) {
				return;
			}
			if (el.classList.contains('mf-stagger')) {
				var kids = (el.querySelector(':scope > .e-con-inner') || el).children;
				Array.prototype.forEach.call(kids, function (k, i) {
					k.style.setProperty('--mf-i', i);
				});
			}
			if (reduceMotion || isEditor()) {
				el.classList.add('is-inview');
			} else {
				io.observe(el);
			}
		});
	}

	/* -------------------------------------------------------------------- forms */
	function initForms(scope) {
		scope.querySelectorAll('form.mf-form').forEach(function (form) {
			if (!once(form, 'form')) {
				return;
			}
			var hp = doc.createElement('input');
			hp.type = 'text';
			hp.name = 'mf_hp';
			hp.tabIndex = -1;
			hp.autocomplete = 'off';
			hp.className = 'mf-hp';
			hp.setAttribute('aria-hidden', 'true');
			var ts = doc.createElement('input');
			ts.type = 'hidden';
			ts.name = 'mf_ts';
			ts.value = String(Date.now());
			form.appendChild(hp);
			form.appendChild(ts);
		});
		var state = new URLSearchParams(location.search).get('mf_form');
		var form = scope.querySelector('form.mf-form');
		if (state && form && !doc.getElementById('mf-form-notice')) {
			var msg = {
				sent: 'Thank you, we received your message.',
				invalid: 'Please enter a valid email address.',
				limit: 'Too many submissions. Please try again in a few minutes.',
				error: 'Something went wrong. Please try again.'
			};
			var n = doc.createElement('p');
			n.id = 'mf-form-notice';
			n.className = 'mf-form__notice mf-form__notice--' + (state === 'sent' ? 'success' : 'error');
			n.setAttribute('role', 'status');
			n.textContent = form.getAttribute('data-msg-' + state) || msg[state] || msg.error;
			form.parentNode.insertBefore(n, form);
		}
	}

	/* --------------------------------------------------------------------- boot */
	function initScope(scope) {
		initReveal(scope);
		initHeroZoom(scope);
		initParallax(scope);
		initHoverZoom(scope);
		initMarquee(scope);
		initCarousel(scope);
		initFade(scope);
		initForms(scope);
	}

	function boot() {
		initHeader();
		initOffcanvas();
		initAnnouncement();
		initScope(doc);
	}

	// Enqueued at the end of <body>: everything above is parsed, so start right away.
	// A second pass after DOMContentLoaded picks up anything printed later (idempotent).
	if (doc.body) {
		boot();
	}
	if (doc.readyState === 'loading') {
		doc.addEventListener('DOMContentLoaded', boot);
	}

	// Elementor editor preview: re-run on every (re)rendered element.
	window.addEventListener('elementor/frontend/init', function () {
		if (!window.elementorFrontend || !window.elementorFrontend.hooks) {
			return;
		}
		window.elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($scope) {
			var el = $scope && $scope[0];
			if (el && el.parentNode) {
				initScope(el.parentNode);
			}
		});
	});
})();
