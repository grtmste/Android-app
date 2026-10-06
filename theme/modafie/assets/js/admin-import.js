/* global modafieImport */
(function () {
	'use strict';
	var btn = document.getElementById('modafie-import');
	if (!btn || !window.modafieImport) {
		return;
	}
	var cfg = window.modafieImport;
	var list = document.getElementById('modafie-steps');
	var log = document.getElementById('modafie-log');
	var bar = document.querySelector('.modafie-progress span');

	function row(step) {
		return list.querySelector('[data-step="' + step + '"]');
	}
	function write(msg, isError) {
		log.classList.add('is-visible');
		var line = document.createElement('div');
		line.textContent = msg;
		if (isError) {
			line.style.color = '#d63638';
		}
		log.appendChild(line);
		log.scrollTop = log.scrollHeight;
	}
	function post(step, offset) {
		var data = new FormData();
		data.append('action', 'modafie_import');
		data.append('nonce', cfg.nonce);
		data.append('step', step);
		data.append('offset', String(offset || 0));
		var reset = document.getElementById('modafie-reset');
		if (reset && reset.checked) {
			data.append('reset', '1');
		}
		return fetch(cfg.ajaxUrl, { method: 'POST', body: data, credentials: 'same-origin' }).then(function (r) {
			return r.text().then(function (text) {
				var json;
				try {
					json = JSON.parse(text.slice(text.indexOf('{')));
				} catch (e) {
					throw new Error('Unexpected server response (HTTP ' + r.status + '): ' + text.replace(/<[^>]+>/g, ' ').slice(0, 300));
				}
				if (!json.success) {
					throw new Error((json.data && json.data.message) || 'Request failed');
				}
				return json.data;
			});
		});
	}

	function runStep(index) {
		var steps = cfg.steps;
		if (index >= steps.length) {
			return Promise.resolve();
		}
		var step = steps[index];
		var li = row(step);
		li.classList.add('is-running');
		var detail = li.querySelector('.modafie-step-detail');

		function loop(offset) {
			return post(step, offset).then(function (res) {
				detail.textContent = res.message || '';
				(res.log || []).forEach(function (l) {
					write(l);
				});
				var stepProgress = res.progress !== undefined ? res.progress : 1;
				bar.style.width = (((index + (res.done ? 1 : stepProgress)) / steps.length) * 100).toFixed(1) + '%';
				if (!res.done) {
					return loop(res.offset);
				}
				li.classList.remove('is-running');
				li.classList.add('is-done');
				if (res.view) {
					document.getElementById('modafie-view').href = res.view;
				}
				if (res.edit) {
					document.getElementById('modafie-edit').href = res.edit;
				}
				return runStep(index + 1);
			});
		}
		return loop(0).catch(function (err) {
			li.classList.remove('is-running');
			li.classList.add('is-error');
			detail.textContent = err.message;
			write(step + ': ' + err.message, true);
			throw err;
		});
	}

	btn.addEventListener('click', function () {
		if (!window.confirm(cfg.i18n.confirm)) {
			return;
		}
		btn.disabled = true;
		btn.textContent = cfg.i18n.running;
		list.querySelectorAll('li').forEach(function (li) {
			li.classList.remove('is-done', 'is-error', 'is-running');
		});
		bar.style.width = '0';
		runStep(0)
			.then(function () {
				bar.style.width = '100%';
				btn.textContent = cfg.i18n.done;
				document.getElementById('modafie-done').hidden = false;
				document.body.classList.add('modafie-import-complete');
			})
			.catch(function () {
				btn.disabled = false;
				btn.textContent = cfg.i18n.failed;
			});
	});
})();
