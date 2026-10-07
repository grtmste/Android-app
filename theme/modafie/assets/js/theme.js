/**
 * Modafie theme behaviour. No dependencies (IntersectionObserver + rAF), ~7 KB gzipped.
 *
 * Effects are opt-in through CSS classes you can add to any Elementor widget/container
 * (Advanced → CSS Classes, or Advanced → Modafie Motion):
 *   mf-reveal  mf-hero  mf-parallax  mf-parallax-bg  mf-marquee  mf-zoom  mf-carousel  mf-tile  mf-stagger
 * Every effect is skipped for visitors with prefers-reduced-motion.
 */
(function () {
	'use strict';

	var cfg = window.modafieTheme || { i18n: {} };
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	var doc = document.documentElement;
	var raf = window.requestAnimationFrame.bind(window);
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var matchesSelf = function (el, sel) { return el.matches && el.matches(sel) ? [el] : []; };
	var within = function (sel, root) { return root === document ? $$(sel) : matchesSelf(root, sel).concat($$(sel, root)); };

	/* ------------------------------------------------------------ header */
	function initHeader() {
		var header = document.querySelector('[data-mf-header]');
		if (!header) { return; }
		var lastY = window.scrollY;
		var ticking = false;
		var update = function () {
			var y = window.scrollY;
			var h = header.offsetHeight;
			header.classList.toggle('is-scrolled', y > 80);
			var menuOpen = header.querySelector('.is-open, [aria-expanded="true"]');
			if (cfg.hideOnScroll && !menuOpen && !header.contains(document.activeElement)) {
				if (y > lastY + 4 && y > h * 2) { header.classList.add('is-hidden'); }
				else if (y < lastY - 4 || y <= h) { header.classList.remove('is-hidden'); }
			} else {
				header.classList.remove('is-hidden');
			}
			lastY = y;
			ticking = false;
		};
		window.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
		update();

		// Search panel.
		var searchBtn = header.querySelector('[data-mf-search-toggle]');
		var search = document.getElementById('mf-search');
		if (searchBtn && search) {
			searchBtn.addEventListener('click', function () {
				var open = search.hasAttribute('hidden');
				search.toggleAttribute('hidden', !open);
				searchBtn.setAttribute('aria-expanded', String(open));
				if (open) { var input = search.querySelector('input[type=search]'); if (input) { input.focus(); } }
			});
		}

		// Desktop dropdowns: keep open on keyboard focus, close on Escape / outside click.
		var nav = header.querySelector('.mf-nav');
		if (nav) {
			nav.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') {
					var li = e.target.closest('.menu-item-has-children');
					var top = li ? li.closest('.mf-nav__menu > li') || li : null;
					if (top) { top.classList.remove('is-open'); var link = top.querySelector('a'); if (link) { link.focus(); } top.blur(); }
				}
			});
			// Touch devices: first tap opens the panel, second tap follows the link.
			nav.addEventListener('click', function (e) {
				var link = e.target.closest('.mf-nav__menu > .menu-item-has-children > a');
				if (!link || !window.matchMedia('(hover: none)').matches) { return; }
				var li = link.parentElement;
				if (!li.classList.contains('is-open')) {
					e.preventDefault();
					$$('.mf-nav__menu > li.is-open', nav).forEach(function (o) { o.classList.remove('is-open'); });
					li.classList.add('is-open');
				}
			});
			document.addEventListener('click', function (e) {
				if (!nav.contains(e.target)) { $$('.mf-nav__menu > li.is-open', nav).forEach(function (o) { o.classList.remove('is-open'); }); }
			});
		}
	}

	/* ------------------------------------------------------------ off-canvas */
	function initOffcanvas() {
		var oc = document.querySelector('[data-mf-offcanvas]');
		if (!oc) { return; }
		var opener = document.querySelector('[data-mf-offcanvas-open]');
		var panel = oc.querySelector('.mf-offcanvas__panel');
		var lastFocus = null;
		var open = function () {
			lastFocus = document.activeElement;
			oc.classList.add('is-open');
			oc.setAttribute('aria-hidden', 'false');
			doc.classList.add('mf-lock');
			if (opener) { opener.setAttribute('aria-expanded', 'true'); }
			var first = panel.querySelector('a, button');
			setTimeout(function () { if (first) { first.focus(); } }, 50);
		};
		var close = function () {
			oc.classList.remove('is-open');
			oc.setAttribute('aria-hidden', 'true');
			doc.classList.remove('mf-lock');
			if (opener) { opener.setAttribute('aria-expanded', 'false'); }
			if (lastFocus) { lastFocus.focus(); }
		};
		if (opener) { opener.addEventListener('click', open); }
		$$('[data-mf-offcanvas-close]', oc).forEach(function (b) { b.addEventListener('click', close); });
		oc.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { close(); return; }
			if (e.key !== 'Tab') { return; }
			var f = $$('a[href], button:not([disabled]), input, select, textarea', panel).filter(function (x) { return x.offsetParent !== null; });
			if (!f.length) { return; }
			if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
			else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
		});
		oc.addEventListener('click', function (e) {
			var t = e.target.closest('.mf-submenu-toggle');
			if (!t) { return; }
			var li = t.parentElement;
			var isOpen = li.classList.toggle('is-open');
			t.setAttribute('aria-expanded', String(isOpen));
		});
		window.matchMedia('(min-width: 1025px)').addEventListener('change', function (m) { if (m.matches) { close(); } });
	}

	/* ------------------------------------------------------------ in-view observer */
	var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
		entries.forEach(function (en) {
			if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
		});
	}, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }) : null;
	var whenInView = function (el) { if (io) { io.observe(el); } else { el.classList.add('is-in'); } };

	/* ------------------------------------------------------------ text reveal (line mask) */
	function splitLines(target) {
		if (target.dataset.mfSplit) { return; }
		var original = target.innerHTML;
		target.dataset.mfOriginal = original;
		// Wrap words (keeps inline markup like <a>, <strong>, <br>).
		var wrapWords = function (node) {
			Array.prototype.slice.call(node.childNodes).forEach(function (child) {
				if (child.nodeType === 3) {
					var parts = child.textContent.split(/(\s+)/);
					var frag = document.createDocumentFragment();
					parts.forEach(function (p) {
						if (!p) { return; }
						if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
						var s = document.createElement('span');
						s.className = 'mf-word';
						s.style.display = 'inline-block';
						s.textContent = p;
						frag.appendChild(s);
					});
					node.replaceChild(frag, child);
				} else if (child.nodeType === 1 && child.tagName !== 'BR') {
					wrapWords(child);
				}
			});
		};
		wrapWords(target);
		var words = $$('.mf-word', target);
		if (!words.length) { return; }
		var lines = [];
		var lastTop = null;
		words.forEach(function (w) {
			var top = Math.round(w.offsetTop);
			if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
			lines[lines.length - 1].push(w.textContent);
		});
		target.innerHTML = lines.map(function (words, i) {
			var text = words.join(' ').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
			return '<span class="mf-line" aria-hidden="true"><span class="mf-line__inner" style="--mf-line-i:' + i + '">' + text + '</span></span>';
		}).join('');
		// Keep the original (with links) for assistive tech.
		var sr = document.createElement('span');
		sr.className = 'screen-reader-text';
		sr.innerHTML = original;
		target.appendChild(sr);
		target.dataset.mfSplit = '1';
	}

	function initReveal(root) {
		within('.mf-reveal, .mf-hero .elementor-widget-heading', root).forEach(function (el) {
			if (el.dataset.mfReveal) { return; }
			el.dataset.mfReveal = '1';
			if (!el.classList.contains('mf-reveal')) { el.classList.add('mf-reveal'); }
			var target = el.querySelector('.elementor-heading-title') || el.querySelector('.elementor-widget-container > *') || el;
			if (reduce.matches || target.querySelector('a')) {
				// Linked headings keep their native markup (no split) but still fade.
				el.classList.add('is-split', 'is-in');
				return;
			}
			var run = function () {
				splitLines(target);
				el.classList.add('is-split');
				// Hero copy reveals immediately; everything else when scrolled into view.
				if (el.closest('.mf-hero')) { raf(function () { raf(function () { el.classList.add('is-in'); }); }); }
				else { whenInView(el); }
			};
			if (document.fonts && document.fonts.status !== 'loaded') {
				var done = false;
				var go = function () { if (!done) { done = true; run(); } };
				document.fonts.ready.then(go);
				setTimeout(go, 1200);
			} else { run(); }
		});
	}

	/* ------------------------------------------------------------ background layers (hero zoom, parallax bg, tiles) */
	function bgOf(el) {
		var bg = window.getComputedStyle(el).backgroundImage;
		return bg && bg !== 'none' && bg.indexOf('url(') !== -1 ? bg : '';
	}
	function initLayers(root) {
		within('.mf-hero, .mf-parallax-bg, .mf-tile', root).forEach(function (el) {
			if (el.querySelector(':scope > .elementor-background-video-container')) { el.classList.add('mf-hero--video'); return; }
			var make = function () {
				var bg = bgOf(el);
				var layer = el.querySelector(':scope > .mf-bg-layer');
				if (!bg) { return false; }
				if (!layer) {
					layer = document.createElement('div');
					layer.className = 'mf-bg-layer';
					layer.setAttribute('aria-hidden', 'true');
					el.insertBefore(layer, el.firstChild);
				}
				var cs = window.getComputedStyle(el);
				layer.style.backgroundImage = bg;
				layer.style.backgroundPosition = cs.backgroundPosition;
				layer.style.backgroundSize = cs.backgroundSize === 'auto' ? 'cover' : cs.backgroundSize;
				if (el.classList.contains('mf-parallax-bg') || el.classList.contains('mf-hero')) { parallaxItems.add(el); startParallax(); }
				return true;
			};
			if (!make()) {
				// Elementor lazy-loads background images: retry when its class flips.
				var mo = new MutationObserver(function () { if (make()) { mo.disconnect(); } });
				mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
			}
		});
	}

	/* ------------------------------------------------------------ parallax */
	var parallaxItems = new Set();
	var parallaxOn = false;
	// Browsers with CSS scroll-driven animations run .mf-parallax / .mf-parallax-bg on the compositor (see theme.css).
	var cssParallax = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
	var needsJs = function (el) { return !cssParallax || el.classList.contains('mf-hero'); };
	function startParallax() {
		if (parallaxOn || reduce.matches) { return; }
		parallaxOn = true;
		var current = new Map();
		var running = false;
		// Ease each element toward its scroll target every frame (lerp), so motion stays smooth between scroll events.
		var frame = function () {
			var vh = window.innerHeight;
			var moving = false;
			parallaxItems.forEach(function (el) {
				if (!el.isConnected) { parallaxItems.delete(el); return; }
				var r = el.getBoundingClientRect();
				if (r.bottom < -200 || r.top > vh + 200) { return; }
				var strength = parseFloat(window.getComputedStyle(el).getPropertyValue('--mf-parallax')) || 0.15;
				var target = el.classList.contains('mf-hero') ? Math.max(0, -r.top) * strength : (r.top + r.height / 2 - vh / 2) * -strength;
				var max = r.height * 0.12;
				target = Math.max(-max, Math.min(max, target));
				var prev = current.has(el) ? current.get(el) : target;
				var next = prev + (target - prev) * 0.14;
				if (Math.abs(target - next) > 0.1) { moving = true; } else { next = target; }
				current.set(el, next);
				var node = el.classList.contains('mf-parallax') ? el : el.querySelector(':scope > .mf-bg-layer');
				if (!node) { return; }
				if (el.classList.contains('mf-hero')) { node.style.translate = '0 ' + next.toFixed(2) + 'px'; } else { node.style.setProperty('--mf-py', next.toFixed(2) + 'px'); }
			});
			running = moving;
			if (moving) { raf(frame); }
		};
		var kick = function () { if (!running) { running = true; raf(frame); } };
		window.addEventListener('scroll', kick, { passive: true });
		window.addEventListener('resize', kick, { passive: true });
		kick();
	}
	function initParallax(root) {
		if (reduce.matches) { return; }
		within('.mf-parallax', root).forEach(function (el) { if (needsJs(el)) { parallaxItems.add(el); } });
		if (parallaxItems.size) { startParallax(); }
	}

	/* ------------------------------------------------------------ autoplay video with a sound toggle */
	function initVideos(root) {
		within('.mf-video-sound', root).forEach(function (w) {
			var v = w.querySelector('video');
			if (!v || w.dataset.mfSound) { return; }
			w.dataset.mfSound = '1';
			v.muted = true;
			v.setAttribute('muted', '');
			v.setAttribute('playsinline', '');
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'mf-sound-btn';
			var on = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
			var off = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
			var label = function () { btn.innerHTML = (v.muted ? off : on) + '<span>' + (v.muted ? (cfg.i18n.soundOn || 'Sound on') : (cfg.i18n.soundOff || 'Sound off')) + '</span>'; btn.setAttribute('aria-pressed', String(!v.muted)); };
			btn.addEventListener('click', function () { v.muted = !v.muted; if (!v.muted && v.paused) { v.play().catch(function () {}); } label(); });
			label();
			(v.parentElement || w).appendChild(btn);
		});
		// Autoplay safety net: start muted autoplay videos when they scroll into view, pause them when they leave.
		if (!('IntersectionObserver' in window)) { return; }
		var vio = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				var v = en.target;
				if (en.isIntersecting) {
					if (v.paused) {
						var p = v.play();
						// If the browser refuses (e.g. sound was switched on), fall back to muted playback.
						if (p && p.catch) { p.catch(function () { v.muted = true; v.play().catch(function () {}); }); }
					}
				}
				else if (!v.paused && !v.closest('.elementor-background-video-container')) { v.pause(); }
			});
		}, { threshold: 0.25 });
		within('video[autoplay]', root).forEach(function (v) { if (!v.dataset.mfVio) { v.dataset.mfVio = '1'; vio.observe(v); } });
	}

	/* ------------------------------------------------------------ marquee */
	function sizeMarquee(m) {
		var track = m.querySelector('.mf-marquee__track');
		var group = m.querySelector('.mf-marquee__group');
		if (!track || !group) { return; }
		// Make sure one group is at least as wide as the viewport so the loop never shows a gap.
		var guard = 0;
		while (group.scrollWidth < m.clientWidth && guard++ < 6) {
			$$('.mf-marquee__item', group).slice(0, 50).forEach(function (it) { group.appendChild(it.cloneNode(true)); });
		}
		var groups = $$('.mf-marquee__group', track);
		if (groups[1]) { groups[1].innerHTML = group.innerHTML; }
		var speed = parseFloat(m.getAttribute('data-speed')) || 60;
		track.style.setProperty('--mf-marquee-duration', (group.scrollWidth / speed).toFixed(2) + 's');
	}
	function initMarquee(root) {
		// Class on a Heading / Text Editor widget → build the marquee DOM from its text.
		within('.mf-marquee.elementor-widget', root).forEach(function (w) {
			if (w.dataset.mfMarquee) { return; }
			w.dataset.mfMarquee = '1';
			var src = w.querySelector('.elementor-heading-title') || w.querySelector('.elementor-widget-container > *') || w.firstElementChild;
			if (!src) { return; }
			var parts = src.textContent.split(/\s*[✦•|·]\s*/).filter(Boolean);
			var tag = src.tagName.toLowerCase();
			var items = parts.map(function (p) { var s = document.createElement('span'); s.className = 'mf-marquee__item'; s.textContent = p; return s.outerHTML; }).join('');
			var wrap = document.createElement('div');
			wrap.className = 'mf-marquee mf-marquee--pause';
			wrap.setAttribute('data-speed', w.getAttribute('data-speed') || '60');
			wrap.innerHTML = '<div class="mf-marquee__track"><div class="mf-marquee__group">' + items + '</div><div class="mf-marquee__group" aria-hidden="true">' + items + '</div></div>';
			src.classList.add('screen-reader-text');
			var visual = document.createElement(tag === 'p' || tag === 'div' ? 'div' : 'div');
			visual.className = src.className.replace('screen-reader-text', '').trim();
			visual.setAttribute('aria-hidden', 'true');
			visual.appendChild(wrap);
			src.parentNode.insertBefore(visual, src.nextSibling);
			sizeMarquee(wrap);
		});
		within('.mf-marquee--auto', root).forEach(sizeMarquee);
	}

	/* ------------------------------------------------------------ carousel */
	function initCarousel(root) {
		within('.mf-carousel', root).forEach(function (rail) {
			if (rail.dataset.mfCarousel) { return; }
			rail.dataset.mfCarousel = '1';
			var slides = function () { return $$(':scope > .elementor-element, :scope > .e-con-inner > .elementor-element', rail); };
			rail.setAttribute('role', 'region');
			rail.setAttribute('aria-roledescription', 'carousel');
			if (!rail.hasAttribute('tabindex')) { rail.setAttribute('tabindex', '0'); }

			// Prev / next + progress, inserted after the rail.
			var nav = document.createElement('div');
			nav.className = 'mf-carousel-nav';
			nav.innerHTML = '<button type="button" class="mf-carousel-btn" data-dir="-1" aria-label="' + (cfg.i18n.prev || 'Previous') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
				'<button type="button" class="mf-carousel-btn" data-dir="1" aria-label="' + (cfg.i18n.next || 'Next') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
			var progress = document.createElement('div');
			progress.className = 'mf-carousel-progress';
			progress.innerHTML = '<span></span>';
			var after = document.createElement('div');
			after.className = 'mf-carousel-after';
			after.style.cssText = 'display:flex;align-items:center;gap:24px;padding-inline:var(--padding-left,0)';
			progress.style.flex = '1';
			progress.style.marginTop = '0';
			after.appendChild(progress);
			after.appendChild(nav);
			rail.parentNode.insertBefore(after, rail.nextSibling);
			after.style.marginTop = '24px';

			var step = function () {
				var s = slides();
				if (s.length < 2) { return rail.clientWidth; }
				return s[1].getBoundingClientRect().left - s[0].getBoundingClientRect().left;
			};
			var sync = function () {
				var max = rail.scrollWidth - rail.clientWidth;
				var ratio = max > 0 ? rail.clientWidth / rail.scrollWidth : 1;
				var pos = max > 0 ? rail.scrollLeft / max : 0;
				progress.firstChild.style.transform = 'translateX(' + (pos * (1 - ratio) * (100 / ratio)).toFixed(2) + '%) scaleX(1)';
				progress.firstChild.style.width = (ratio * 100).toFixed(2) + '%';
				nav.children[0].disabled = rail.scrollLeft <= 2;
				nav.children[1].disabled = rail.scrollLeft >= max - 2;
				after.style.display = max <= 2 ? 'none' : 'flex';
			};
			nav.addEventListener('click', function (e) {
				var b = e.target.closest('button');
				if (b) { rail.scrollBy({ left: step() * parseInt(b.getAttribute('data-dir'), 10), behavior: reduce.matches ? 'auto' : 'smooth' }); }
			});
			rail.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' }); }
			});
			rail.addEventListener('scroll', function () { raf(sync); }, { passive: true });
			window.addEventListener('resize', function () { raf(sync); }, { passive: true });
			sync();

			// Mouse drag with momentum (touch uses native scrolling).
			var down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, vel = 0, momentum = 0;
			rail.addEventListener('pointerdown', function (e) {
				if (e.pointerType !== 'mouse' || e.button !== 0) { return; }
				down = true; moved = false; startX = lastX = e.clientX; startLeft = rail.scrollLeft; lastT = performance.now(); vel = 0;
				cancelAnimationFrame(momentum);
			});
			window.addEventListener('pointermove', function (e) {
				if (!down) { return; }
				var dx = e.clientX - startX;
				if (!moved && Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); }
				if (!moved) { return; }
				var now = performance.now();
				vel = (e.clientX - lastX) / Math.max(1, now - lastT);
				lastX = e.clientX; lastT = now;
				rail.scrollLeft = startLeft - dx;
			});
			window.addEventListener('pointerup', function () {
				if (!down) { return; }
				down = false;
				if (!moved) { return; }
				var v = vel * 16;
				var glide = function () {
					if (Math.abs(v) < 0.5 || reduce.matches) {
						rail.classList.remove('is-dragging');
						// Snap to the nearest slide.
						var st = step();
						rail.scrollTo({ left: Math.round(rail.scrollLeft / st) * st, behavior: 'smooth' });
						return;
					}
					rail.scrollLeft -= v; v *= 0.92;
					momentum = raf(glide);
				};
				glide();
			});
			rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
			rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
		});
	}

	/* ------------------------------------------------------------ stagger */
	function initStagger(root) {
		within('.mf-stagger', root).forEach(function (c) {
			if (c.dataset.mfStagger) { return; }
			c.dataset.mfStagger = '1';
			$$(':scope > .elementor-element, :scope > .e-con-inner > .elementor-element', c).forEach(function (k, i) { k.style.setProperty('--mf-i', i); });
			if (reduce.matches) { c.classList.add('is-in'); } else { whenInView(c); }
		});
	}

	/* ------------------------------------------------------------ forms */
	function initForms(root) {
		within('[data-mf-form]', root).forEach(function (form) {
			if (form.dataset.mfBound) { return; }
			form.dataset.mfBound = '1';
			var status = form.querySelector('.mf-form__status');
			form.addEventListener('submit', function (e) {
				if (!window.fetch || !window.FormData) { return; }
				e.preventDefault();
				$$('[aria-invalid]', form).forEach(function (f) { f.removeAttribute('aria-invalid'); });
				var invalid = $$('input, select, textarea', form).filter(function (f) { return f.name && f.name.indexOf('mf_fields') === 0 && !f.checkValidity(); });
				if (invalid.length) {
					invalid.forEach(function (f) { f.setAttribute('aria-invalid', 'true'); });
					invalid[0].focus();
					status.className = 'mf-form__status is-error';
					status.textContent = invalid[0].validationMessage;
					return;
				}
				form.classList.add('is-sending');
				status.className = 'mf-form__status';
				status.textContent = cfg.i18n.sending || '…';
				fetch(cfg.ajaxUrl, { method: 'POST', body: new FormData(form), credentials: 'same-origin' })
					.then(function (r) { return r.json(); })
					.then(function (res) {
						form.classList.remove('is-sending');
						var data = res.data || {};
						if (res.success) {
							if (data.redirect) { window.location.href = data.redirect; return; }
							status.className = 'mf-form__status is-success';
							status.textContent = data.message || status.getAttribute('data-success');
							form.reset();
						} else {
							status.className = 'mf-form__status is-error';
							status.textContent = data.message || cfg.i18n.error;
							Object.keys(data.errors || {}).forEach(function (k) {
								var f = form.querySelector('[name="mf_fields[' + k + ']"]');
								if (f) { f.setAttribute('aria-invalid', 'true'); }
							});
						}
					})
					.catch(function () {
						form.classList.remove('is-sending');
						status.className = 'mf-form__status is-error';
						status.textContent = cfg.i18n.error;
					});
			});
		});
	}

	/* ------------------------------------------------------------ boot */
	function initScope(root) {
		initLayers(root);
		initReveal(root);
		initParallax(root);
		initVideos(root);
		initMarquee(root);
		initCarousel(root);
		initStagger(root);
		initForms(root);
	}

	function boot() {
		initHeader();
		initOffcanvas();
		initScope(document);
		// Re-run inside the Elementor editor whenever an element is (re)rendered.
		var hooked = false;
		var hookEditor = function () {
			if (hooked || !window.elementorFrontend || !window.elementorFrontend.hooks) { return; }
			hooked = true;
			window.elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($scope) {
				var el = $scope && $scope[0];
				if (el && window.elementorFrontend.isEditMode()) { initScope(el); }
			});
		};
		window.addEventListener('elementor/frontend/init', hookEditor);
		hookEditor();
		var resizeTimer;
		window.addEventListener('resize', function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () { $$('.mf-marquee--auto, .mf-marquee.elementor-widget .mf-marquee').forEach(sizeMarquee); }, 200);
		}, { passive: true });
	}

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
}());
