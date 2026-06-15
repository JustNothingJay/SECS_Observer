(function () {
    'use strict';

    var paths = {
        snapshot: 'governance/catalog/data/corpus_snapshot.json',
        stageReport: 'governance/reports/stage_gate_report.json',
        requestLog: 'governance/catalog/data/request_log.json',
        falsification: 'governance/catalog/data/falsification_register.json',
        resolution: 'governance/catalog/data/resolution_register.json',
        citations: 'governance/catalog/data/citation_catalog.json'
    };

    var state = {
        citations: [],
        apiAvailable: false
    };

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(value) {
        if (!value) return 'unknown';
        var date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function shortHash(value, count) {
        if (!value) return 'n/a';
        return String(value).slice(0, count || 12);
    }

    function setChip(el, text, cls) {
        if (!el) return;
        el.className = 'console-status-chip' + (cls ? ' ' + cls : '');
        el.textContent = text;
    }

    function fetchJson(path) {
        return fetch(path, { cache: 'no-store' }).then(function (response) {
            if (!response.ok) {
                throw new Error(path + ' returned ' + response.status);
            }
            return response.json();
        });
    }

    function postJson(path, payload) {
        return fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(data.error || ('request failed: ' + response.status));
                }
                return data;
            });
        });
    }

    function renderSummary(snapshot, stageReport, requestLog, falsification, resolution) {
        var counts = snapshot && snapshot.counts ? snapshot.counts : {};
        $('summary-grid').innerHTML = [
            statCard('papers', String(counts.paper_total || 0), 'active catalog'),
            statCard('citations', String(counts.citation_total || 0), String(counts.external_citation_total || 0) + ' external'),
            statCard('requests', String((requestLog.entries || []).length), 'identity-free ledger'),
            statCard('challenges', String((falsification.entries || []).length), (resolution.issues || []).length + ' open issues')
        ].join('');

        $('snapshot-meta').innerHTML = [
            kvItem('snapshot id', escapeHtml(snapshot.snapshot_id || 'unknown')),
            kvItem('sealed at', escapeHtml(formatDate(snapshot.as_of_utc))),
            kvItem('profile version', escapeHtml(snapshot.profile_version || 'unknown')),
            kvItem('snapshot hash', escapeHtml(shortHash(snapshot.hash, 18))),
            kvItem('doi total', escapeHtml(String(counts.doi_total || 0))),
            kvItem('internal refs', escapeHtml(String(counts.internal_reference_total || 0)))
        ].join('');

        setChip($('snapshot-status'), counts.paper_total + ' papers · ' + counts.citation_total + ' citations', 'pass');
        setChip($('gate-track'), stageReport.track || 'unknown', stageReport.pass ? 'pass' : 'failed');
        setChip($('request-total'), String((requestLog.entries || []).length) + ' entries', 'audit_only');
        var challengeEntries = falsification.entries || [];
        var openChallenges = challengeEntries.filter(function (entry) {
            return entry.status === 'logged' || entry.status === 'acknowledged' || entry.status === 'substantiated';
        }).length;
        setChip($('challenge-total'), String(challengeEntries.length) + ' challenges', openChallenges ? 'logged' : 'pass');
        setChip($('citation-total'), String((state.citations || []).length) + ' citations', 'pass');
        setChip($('issue-total'), String((resolution.issues || []).length) + ' open issues', (resolution.issues || []).length ? 'blocked' : 'pass');
    }

    function statCard(label, value, meta) {
        return '<div class="console-stat-card">' +
            '<div class="console-stat-label">' + label + '</div>' +
            '<div class="console-stat-value">' + value + '</div>' +
            '<div class="console-stat-meta">' + meta + '</div>' +
            '</div>';
    }

    function kvItem(label, value) {
        return '<div class="console-kv-item">' +
            '<span class="console-kv-label">' + label + '</span>' +
            '<span class="console-kv-value">' + value + '</span>' +
            '</div>';
    }

    function renderGates(stageReport) {
        var gates = stageReport && stageReport.gates ? stageReport.gates : [];
        if (!gates.length) {
            $('gate-grid').innerHTML = '<div class="console-empty">No gate report is available.</div>';
            return;
        }
        $('gate-grid').innerHTML = gates.map(function (gate) {
            var stdout = gate.result && gate.result.stdout ? gate.result.stdout.trim().replace(/\n/g, ' · ') : 'no output';
            return '<div class="console-gate-row">' +
                '<div>' +
                    '<div class="console-gate-name">' + escapeHtml(gate.gate) + '</div>' +
                    '<div class="console-gate-detail">' + escapeHtml(stdout) + '</div>' +
                '</div>' +
                '<span class="console-status-chip ' + (gate.passed ? 'pass' : 'failed') + '">' + (gate.passed ? 'pass' : 'fail') + '</span>' +
            '</div>';
        }).join('');
    }

    function renderRequestLog(requestLog) {
        var entries = (requestLog && requestLog.entries ? requestLog.entries : []).slice().reverse();
        if (!entries.length) {
            $('request-list').innerHTML = '<div class="console-empty">No anonymous request entries have been logged yet.</div>';
            return;
        }
        $('request-list').innerHTML = entries.slice(0, 6).map(function (entry) {
            return '<div class="console-list-item">' +
                '<div class="console-list-head">' +
                    '<div>' +
                        '<h4 class="console-list-title">' + escapeHtml(entry.request_id) + '</h4>' +
                        '<div class="console-list-subtitle">snapshot ' + escapeHtml(entry.snapshot_id) + ' · ' + escapeHtml(formatDate(entry.logged_utc)) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="console-inline-meta">' +
                    listChip(entry.release_status) +
                    pill('intent ' + entry.intent_type) +
                    pill('mode ' + entry.request_mode) +
                    pill('hash ' + shortHash(entry.request_hash, 14)) +
                    pill('identity-free') +
                '</div>' +
            '</div>';
        }).join('');
    }

    function renderChallenges(falsification) {
        var entries = (falsification && falsification.entries ? falsification.entries : []).slice().reverse();
        if (!entries.length) {
            $('challenge-list').innerHTML = '<div class="console-empty">No public falsification challenges are logged yet.</div>';
            return;
        }
        $('challenge-list').innerHTML = entries.slice(0, 6).map(function (entry) {
            var footer = '';
            if (entry.resolution_note) {
                footer = '<div class="console-list-subtitle" style="margin-top:12px;"><strong>Resolution:</strong> ' + escapeHtml(entry.resolution_note) + '</div>';
            } else if (entry.action_plan) {
                footer = '<div class="console-list-subtitle" style="margin-top:12px;"><strong>Action plan:</strong> ' + escapeHtml(entry.action_plan) + '</div>';
            } else if (entry.status === 'logged') {
                footer = '<div class="console-list-subtitle" style="margin-top:12px;">Awaiting replay review — run instructions, then resolve via <span class="console-mono">falsification_resolver.py</span>.</div>';
            }
            return '<div class="console-list-item">' +
                '<div class="console-list-head">' +
                    '<div>' +
                        '<h4 class="console-list-title">' + escapeHtml(entry.challenge_summary) + '</h4>' +
                        '<div class="console-list-subtitle">' + escapeHtml(entry.challenge_id) + ' · target ' + escapeHtml(entry.target_type) + ' / ' + escapeHtml(entry.target_id) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="console-list-subtitle">' + escapeHtml(entry.expected_failure_condition) + '</div>' +
                '<div class="console-inline-meta">' +
                    listChip(entry.status) +
                    listChip(entry.action_status, formatStatusLabel(entry.action_status)) +
                    pill(entry.falsification_mode) +
                    pill(entry.public_replayable ? 'public replay' : 'private') +
                    pill(entry.testable ? 'testable' : 'untestable') +
                '</div>' +
                footer +
            '</div>';
        }).join('');
    }

    function pill(text) {
        return '<span class="console-pill">' + escapeHtml(text) + '</span>';
    }

    function formatStatusLabel(status) {
        var labels = {
            audit_only: 'audit',
            released: 'released',
            logged: 'open',
            acknowledged: 'ack',
            substantiated: 'substantiated',
            rejected_with_reason: 'rejected',
            corrected: 'corrected',
            not_started: 'pending',
            planned: 'planned',
            in_progress: 'active',
            completed: 'done',
            waived_with_rationale: 'waived'
        };
        return labels[status] || String(status).replace(/_/g, ' ');
    }

    function listChip(status, label) {
        return '<span class="console-list-chip ' + escapeHtml(status) + '">' + escapeHtml(label || formatStatusLabel(status)) + '</span>';
    }

    function renderCitations(citationCatalog) {
        var citations = citationCatalog && citationCatalog.citations ? citationCatalog.citations.slice() : [];
        citations.sort(function (a, b) {
            return (b.evidence_refs ? b.evidence_refs.length : 0) - (a.evidence_refs ? a.evidence_refs.length : 0);
        });
        state.citations = citations;

        if (!citations.length) {
            $('citation-list').innerHTML = '<div class="console-empty">No citations are available for audit pull.</div>';
            $('citation-detail').innerHTML = '<div class="console-empty">Select a citation to inspect evidence provenance.</div>';
            return;
        }

        $('citation-list').innerHTML = citations.slice(0, 10).map(function (citation, index) {
            return '<button class="console-citation-button' + (index === 0 ? ' active' : '') + '" data-citation-id="' + escapeHtml(citation.citation_id) + '">' +
                '<strong>' + escapeHtml(citation.title) + '</strong>' +
                '<span>' + escapeHtml(citation.origin + ' · ' + citation.status + ' · ' + (citation.evidence_refs || []).length + ' evidence refs') + '</span>' +
                '<span>' + escapeHtml((citation.cited_by || []).length + ' citing records') + '</span>' +
            '</button>';
        }).join('');

        $('citation-list').addEventListener('click', function (event) {
            var button = event.target.closest('.console-citation-button');
            if (!button) return;
            var buttons = $('citation-list').querySelectorAll('.console-citation-button');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('active');
            }
            button.classList.add('active');
            renderCitationDetail(button.getAttribute('data-citation-id'));
        });

        setChip($('citation-total'), String(citations.length) + ' citations', 'pass');
        renderCitationDetail(citations[0].citation_id);
    }

    function renderCitationDetail(citationId) {
        var citation = null;
        for (var i = 0; i < state.citations.length; i++) {
            if (state.citations[i].citation_id === citationId) {
                citation = state.citations[i];
                break;
            }
        }
        if (!citation) {
            $('citation-detail').innerHTML = '<div class="console-empty">Citation detail is unavailable.</div>';
            return;
        }

        $('citation-detail').innerHTML = '<div class="console-list-head">' +
            '<div>' +
                '<h4 class="console-list-title">' + escapeHtml(citation.title) + '</h4>' +
                '<div class="console-list-subtitle">' + escapeHtml(citation.citation_id) + (citation.doi ? ' · ' + escapeHtml(citation.doi) : '') + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="console-inline-meta">' +
            listChip(citation.status) +
            pill('origin ' + citation.origin) +
            pill('cited by ' + (citation.cited_by || []).length) +
            pill('refs ' + (citation.evidence_refs || []).length) +
        '</div>' +
        '<div class="console-evidence-list">' + (citation.evidence_refs || []).slice(0, 8).map(function (ref) {
            return '<div class="console-evidence-item">' +
                '<div class="console-list-subtitle"><span class="console-mono">' + escapeHtml(ref.chunk_id) + '</span> · ' + escapeHtml(ref.section) + '</div>' +
                '<div class="console-list-subtitle">' + escapeHtml(ref.source_path) + '</div>' +
                '<div class="console-inline-meta">' +
                    pill('offset ' + ref.offset_start + '-' + ref.offset_end) +
                    pill(ref.extraction_method) +
                '</div>' +
                '<div class="console-list-subtitle" style="margin-top:8px;">' + escapeHtml(ref.matched_text) + '</div>' +
            '</div>';
        }).join('') + '</div>';
    }

    function renderError(error) {
        var message = 'Unable to load the governed artifacts from this page. ' +
            'If you are opening the site directly from the filesystem, serve it through a local static server or view it through the deployed site. ' +
            'Technical detail: ' + error.message;
        $('summary-grid').innerHTML = '<div class="console-error">' + escapeHtml(message) + '</div>';
        $('gate-grid').innerHTML = '<div class="console-error">Artifact loading halted before gate rendering.</div>';
        $('request-list').innerHTML = '<div class="console-error">Artifact loading halted before request rendering.</div>';
        $('challenge-list').innerHTML = '<div class="console-error">Artifact loading halted before challenge rendering.</div>';
        $('citation-list').innerHTML = '<div class="console-error">Artifact loading halted before citation rendering.</div>';
        $('citation-detail').innerHTML = '<div class="console-error">Artifact loading halted before detail rendering.</div>';
    }

    function setQueryMode(apiAvailable) {
        state.apiAvailable = apiAvailable;
        setChip($('query-status'), apiAvailable ? 'server ready' : 'read only', apiAvailable ? 'pass' : 'audit_only');
        var button = $('query-submit');
        if (button) {
            button.disabled = !apiAvailable;
            button.style.opacity = apiAvailable ? '1' : '0.6';
            button.style.cursor = apiAvailable ? 'pointer' : 'not-allowed';
        }
    }

    function detectApiAvailability() {
        if (window.location.protocol.indexOf('http') !== 0) {
            return Promise.resolve(false);
        }
        return fetchJson('/api/health').then(function () {
            return true;
        }).catch(function () {
            return false;
        });
    }

    function renderQueryResult(result) {
        var candidateRows = (result.candidates || []).slice(0, 5).map(function (candidate) {
            return '<div class="console-evidence-item">' +
                '<div class="console-list-subtitle"><span class="console-mono">' + escapeHtml(candidate.chunk_id) + '</span> · ' + escapeHtml(candidate.section) + '</div>' +
                '<div class="console-list-subtitle">' + escapeHtml(candidate.source_path) + '</div>' +
                '<div class="console-inline-meta">' +
                    pill('score ' + candidate.score) +
                    pill('offset ' + candidate.span_start + '-' + candidate.span_end) +
                '</div>' +
                '<div class="console-list-subtitle" style="margin-top:8px;">' + escapeHtml(candidate.excerpt || '') + '</div>' +
            '</div>';
        }).join('');

        $('query-result').innerHTML = '<div class="console-list-head">' +
            '<div>' +
                '<h4 class="console-list-title">' + escapeHtml(result.response.answer_text) + '</h4>' +
                '<div class="console-list-subtitle">' + escapeHtml(result.trace_id) + ' · request ' + escapeHtml(result.request_id) + '</div>' +
            '</div>' +
            '<span class="console-status-chip ' + (result.response.released ? 'released' : 'blocked') + '">' + (result.response.released ? 'released' : 'blocked') + '</span>' +
        '</div>' +
        '<div class="console-inline-meta">' +
            pill('confidence ' + result.response.confidence_band) +
            pill('top_k ' + result.retrieval.top_k) +
            pill('governance refs ' + (result.audit_pull.governance_refs || []).length) +
        '</div>' +
        '<div class="console-list-subtitle" style="margin-top:14px;">Falsifiability:</div>' +
        '<div class="console-inline-meta">' + (result.reasoning.falsifiability || []).map(pill).join('') + '</div>' +
        '<div class="console-list-subtitle" style="margin-top:16px;">Top evidence candidates</div>' +
        '<div class="console-evidence-list">' + (candidateRows || '<div class="console-empty">No evidence candidates were released.</div>') + '</div>';

        setChip($('result-status'), result.response.released ? 'answer released' : 'answer blocked', result.response.released ? 'released' : 'blocked');
    }

    function bindQuerySubmission() {
        var button = $('query-submit');
        if (!button) return;
        button.addEventListener('click', function () {
            if (!state.apiAvailable) {
                $('query-result').innerHTML = '<div class="console-error">The local governed runtime server is not running. Start it with <span class="console-mono">py -3 governance/tools/governed_runtime_server.py</span> and reload this page through the served URL.</div>';
                return;
            }
            var rawQuery = $('query-input').value.trim();
            if (!rawQuery) {
                $('query-result').innerHTML = '<div class="console-error">A query is required before the governed lifecycle can run.</div>';
                return;
            }
            setChip($('result-status'), 'running', 'audit_only');
            $('query-result').innerHTML = '<div class="console-loading">Running governed query lifecycle...</div>';
            postJson('/api/query', {
                raw_query: rawQuery,
                intent_type: $('intent-select').value
            }).then(function (result) {
                renderQueryResult(result);
            }).catch(function (error) {
                $('query-result').innerHTML = '<div class="console-error">Governed query failed: ' + escapeHtml(error.message) + '</div>';
                setChip($('result-status'), 'failed', 'failed');
            });
        });
    }

    Promise.all([
        fetchJson(paths.snapshot),
        fetchJson(paths.stageReport),
        fetchJson(paths.requestLog),
        fetchJson(paths.falsification),
        fetchJson(paths.resolution),
        fetchJson(paths.citations),
        detectApiAvailability()
    ]).then(function (results) {
        renderSummary(results[0], results[1], results[2], results[3], results[4]);
        renderGates(results[1]);
        renderRequestLog(results[2]);
        renderChallenges(results[3]);
        renderCitations(results[5]);
        setQueryMode(results[6]);
        bindQuerySubmission();
    }).catch(renderError);
})();