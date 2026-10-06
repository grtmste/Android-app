/* Modafie one-click import: runs each step via admin-ajax, sequentially (media in batches). */
(function () {
	'use strict';
	var cfg = window.modafieImport;
	var btn = document.getElementById('mf-import-start');
	if (!cfg || !btn) { return; }
	var log = document.getElementById('mf-import-log');
	var result = document.getElementById('mf-import-result');
	var row = function (step) { return document.querySelector('.mf-import__steps [data-step="' + step + '"]'); };
	var say = function (text, cls) { var p = document.createElement('p'); p.textContent = text; if (cls) { p.className = cls; } log.appendChild(p); };

	function call(step, offset) {
		var body = new FormData();
		body.append('action', 'modafie_import');
		body.append('nonce', cfg.nonce);
		body.append('step', step);
		body.append('offset', String(offset || 0));
		return fetch(cfg.ajaxUrl, { method: 'POST', body: body, credentials: 'same-origin' })
			.then(function (r) { return r.text().then(function (t) { try { return JSON.parse(t); } catch (e) { throw new Error(t.replace(/<[^>]+>/g, ' ').trim().slice(0, 300) || ('HTTP ' + r.status)); } }); });
	}

	function runStep(i) {
		if (i >= cfg.steps.length) { return Promise.resolve(); }
		var step = cfg.steps[i];
		var li = row(step);
		li.className = 'is-running';
		var go = function (offset) {
			return call(step, offset).then(function (res) {
				if (!res.success) { throw new Error((res.data && res.data.message) || 'Error'); }
				var d = res.data;
				li.querySelector('.mf-import__msg').textContent = d.message || '';
				(d.warnings || []).forEach(function (w) { say(w, 'is-warning'); });
				if (d.edit) { document.getElementById('mf-import-edit').href = d.edit; }
				if (!d.done) { return go(d.next_offset || 0); }
				li.className = 'is-done';
			});
		};
		return go(0).then(function () { return runStep(i + 1); }, function (err) {
			li.className = 'is-error';
			li.querySelector('.mf-import__msg').textContent = err.message;
			throw err;
		});
	}

	btn.addEventListener('click', function () {
		if (btn.getAttribute('data-imported') === '1' && !window.confirm(cfg.i18n.confirm)) { return; }
		btn.disabled = true;
		btn.textContent = cfg.i18n.running;
		log.innerHTML = '';
		result.hidden = true;
		document.querySelectorAll('.mf-import__steps li').forEach(function (li) { li.className = ''; li.querySelector('.mf-import__msg').textContent = ''; });
		runStep(0).then(function () {
			btn.textContent = cfg.i18n.done;
			btn.setAttribute('data-imported', '1');
			result.hidden = false;
			btn.disabled = false;
		}).catch(function (err) {
			say(cfg.i18n.failed + ': ' + err.message, 'is-error');
			btn.textContent = cfg.i18n.retry;
			btn.disabled = false;
		});
	});
}());
