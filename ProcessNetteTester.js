document.addEventListener('DOMContentLoaded', function () {

    var $mainLauncher = document.getElementById('main-launcher'),
        testButtonSelector = '.test-button',
        $display = document.getElementById('display'),
        $counter = $display.querySelector('span.counter'),
        total = parseInt($display.querySelector('span.total').innerHTML),
        $table = document.getElementById('pnt-table'),
        abortText = $display.getAttribute('data-abort-text'),
        totalText = $display.getAttribute('data-total-text'),
        runText = $display.getAttribute('data-run-text'),
        stopText = $display.getAttribute('data-stop-text'),
        restartText = $display.getAttribute('data-restart-text'),
        retryFailedText = $display.getAttribute('data-retry-failed-text'),
        isScrollIntoViewSupported = document.body.scrollIntoView,
        $passedItems = document.getElementsByClassName('pass'),
        $failedItems = document.getElementsByClassName('fail'),
        $pendingItems = document.getElementsByClassName('pending'),
        missingAssertMessage = 'Error: This test forgets to execute an assertion.',
        userSettings = {},
        requests = {},
        stopFlag = false,
        isBulk = false,
        isBulkCompleted = false;

    initDom();
    setupControls();
    addEvents();
    applySettings();

    function setRowState($row, state) {
        $row.className = state;
    }

    function getRowState($row) {
        return $row.className;
    }

    function resetTable() {
        var $rows = $table.querySelectorAll('tbody tr');

        for (var i = 0; i < $rows.length; i++) {
            resetRow($rows[i]);
        }

        resetDisplay();
    }

    function resetMainLauncherText() {
        setMainLauncherText(runText, stopText);
    }

    function resetDisplay() {
        $display.className = '';
        $counter.innerHTML = 0;
    }

    function clearDisplayAnimStyles() {
        $display.removeAttribute('data-state');
        $display.classList.remove('anim');
    }

    function setPass($row) {
        $row.querySelector('td:nth-child(1) i').className = 'fa fa-check-circle';
        setRowState($row, 'pass');
    }

    function setFail($row) {
        $row.querySelector('td:nth-child(1) i').className = 'fa fa-warning';
        setRowState($row, 'fail');


        if (userSettings.StopOnFail) {
            stopFlag = true;
            stop();
            return false;
        }
    }

    function resetRow($row, message) {
        setRowState($row, '');
        $row.removeAttribute('data-has-run');
        $row.querySelector('td:first-child i').setAttribute('class', 'fa fa-question-circle');
        setMessage($row.querySelector('td:nth-child(3)'), message);
        $row.querySelector('td:nth-child(4)').innerHTML = '--';
        $display.removeAttribute('class');
        updateDisplay();
    }

    function setMessage($elem, message) {
        message = message || '--';
        $elem.innerHTML = '<em>' + message + '</em>';
    }

    function stop($row) {
        var $pendingRows;

        if ($row && getRowState($row) === 'pending') {
            abortTest($row);
        }

        if (isBulk) {
            $pendingRows = $($pendingItems);

            if ($pendingRows.length) {
                for (var i = 0; i < $pendingRows.length; i++) {
                    abortTest($pendingRows[i]);
                }
                stopFlag = true;
            }
        }
        clearDisplayAnimStyles();
        // stopFlag = false;
        return false;
    }

    function abortTest($row) {
        var testName = $row.getAttribute('data-test-name'),
            req = requests[testName];

        if (req) {
            req.abort();
            delete requests[testName];
        }
        resetRow($row, abortText);
        setRowState($row, 'aborted');

    }

    function setMainLauncherText(text1, text2) {
        $mainLauncher.querySelector('em:nth-child(1)').innerHTML = text1;
        $mainLauncher.querySelector('em:nth-child(2)').innerHTML = text2;
    }

    function setBulkRunCompleted() {
        isBulkCompleted = true;
        setMainLauncherText(getRestartText(), '');
        showTotalTime();
    }

    function showTotalTime() {
        var totalTime = 0,
            $timeCells = $table.querySelectorAll('tbody tr td:last-child');

        for (var i = 0; i < $timeCells.length; i++) {
            var time = parseFloat($timeCells[i].innerText);
            if (!isNaN(time)) {
                totalTime += time;
            }
        }

        $display.setAttribute('data-total-value', totalText.replace('%f', totalTime.toFixed(4)));
    }

    function hideTotalTime() {
        $display.removeAttribute('data-total-value');
    }

    function runNext() {
        var $row,
            pendingSelector = 'tbody tr.pending',
            hasNotRunSelector = 'tbody tr:not([data-has-run]):not(.pass):not(.pending)',
            $btn;

        // disallow run multiple (manually run multiple when bulk is running)
        if ($(pendingSelector).length) return false;

        if (stopFlag) {
            stopFlag = true;
            stop();
            return false;
        }

        $row = $table.querySelector(hasNotRunSelector);

        if ($row) {
            $btn = $row.querySelector(testButtonSelector);

            if (isScrollIntoViewSupported) {
                if (isBulk && userSettings.AutoScroll) {
                    $btn.scrollIntoView({
                        behavior: 'auto',
                        block: 'center'
                    });
                }
            }

            $btn.click();

        } else {
            // no more rows
            clearDisplayAnimStyles();
            isBulk = false;
            setBulkRunCompleted();
        }
    }

    function updateDisplay() {

        $counter.innerHTML = userSettings.DisplayFailedPerTotal ? $failedItems.length : $passedItems.length;

        if ($failedItems.length > 0) {
            $display.classList.add('has-failed');
        } else {
            $display.classList.remove('has-failed');
        }

        if ($passedItems.length === total) {
            $display.classList.add('all-pass');
            setMainLauncherText(getRestartText(), '');
            showTotalTime();
        }
    }

    function initDom() {
        var $rows = $table.querySelectorAll('tbody tr');

        for (var i = 0; i < $rows.length; i++) {
            var $row = $rows[i];
            $row.setAttribute('data-test-name', $row.querySelector('td:first-child span').innerText.replace('.php', '').toLowerCase() + '__' + i);
        }
    }

    function addEvents() {

        // start/stop with space key
        $(document).on('keydown', function (e) {
            e = e || window.event;

            var keyCode = e.keyCode || e.charCode || e.which,
                target = e.target;

            if ($(target).is('input, textarea')) {
                return true;
            }

            if (keyCode === 32) {
                $mainLauncher.click();
                return false;
            }
        });

        // main display
        $mainLauncher.addEventListener('click', function (e) {

            var itemSelector,
                $rows;

            hideTotalTime();

            if (isBulkCompleted) {

                isBulkCompleted = false;
                itemSelector = userSettings.RetryFailed ? 'tbody tr.fail' : 'tbody tr';
                $rows = $table.querySelectorAll(itemSelector);

                for (var i = 0; i < $rows.length; i++) {
                    $rows[i].removeAttribute('data-has-run');
                }

                resetMainLauncherText();

                if (!userSettings.RetryFailed) {
                    resetTable();
                    resetDisplay();
                }
            }

            e = e || window.event;

            if ($display.getAttribute('data-state')) {
                stopFlag = true;
                stop();
                isBulk = false;
                return false;
            }

            if (e.metaKey || e.ctrlKey) {
                resetTable();
                resetDisplay();
                return false;
            }

            $display.setAttribute('data-state', 'running');
            stopFlag = false;
            isBulk = true;

            runNext();
        });

        // run single test
        // todo rewrite to pure js

        $table.addEventListener("click", filterEventHandler(testButtonSelector, function (e) {
            e = e || window.event;
            e.preventDefault();

            var $button = e.filterdTarget,
                $row = $button.parentElement.parentElement,
                ajaxUrl = $button.getAttribute('data-url'),
                state = getRowState($row),
                testName = $row.getAttribute('data-test-name'),
                request,
                data;

            resetRow($row);
            hideTotalTime();
            updateDisplay();
            resetMainLauncherText();

            if (state === 'pending') {
                abortTest($row);
                stopFlag = false;
                // stop($row);
                return false;
            }

            if (e.metaKey || e.ctrlKey) {
                if (isBulkCompleted) {
                    isBulkCompleted = false;
                }
                return false;
            }

            setRowState($row, 'pending');
            $display.classList.add('anim');
            $row.querySelector('td:nth-child(1) i.fa').className = 'fa fa-refresh fa-spin';

            request = new XMLHttpRequest();
            request.open('GET', ajaxUrl, true);

            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            request.onreadystatechange = function () {
                
                var DONE = 4,
                    OK = 200;

                if (request.readyState === DONE)

                    if (request.status === OK) {

                        try {
                            
                            // check if response is json
                            data = JSON.parse(request.responseText);

                            $row.querySelector('td:nth-child(3)').innerHTML = data.columns[2];
                            $row.querySelector('td:nth-child(4)').innerHTML = data.columns[3];

                            data.status === 'pass' ? setPass($row) : setFail($row);
                        }

                        catch (ex) {

                            var msg = 'Error',
                                cleanMessage;

                            setFail($row);
                            
                            if (request.responseText && typeof request.responseText === 'string') {
                                
                                cleanMessage = request.responseText.replace(missingAssertMessage, '').trim();

                                if(cleanMessage === '') {
                                    msg = missingAssertMessage;
                                    
                                } else {
                                    try {
                                        data = JSON.parse(cleanMessage);
                                        // status is "pass" because Tester probably overrides the exception
                                        msg = data.status === 'pass' ? missingAssertMessage : data.columns[2];
                                    } catch(unused) {
                                        msg = request.responseText;
                                    }
                                }
                            }

                            $row.querySelector('td:nth-child(3)').innerHTML = '<pre>' + msg + '</pre>';
                        }

                        finally {
                            
                            $row.setAttribute('data-has-run', '1');

                            if (isBulk) {
                                runNext();
                            } else {
                                $display.classList.remove('anim');
                            }

                            updateDisplay();
                            applySettings();
                        }
                        // } else {
                        // server error or aborted
                    }
            };

            request.send();

            requests[testName] = request;
        }));
    }

    function applySettings() {

        document.getElementById('ProcessNetteTester-wrap').setAttribute('data-hide-passed', userSettings.HidePassed ? '1' : '0');

        $counter.innerHTML = userSettings.DisplayFailedPerTotal ? $failedItems.length : $passedItems.length;

        if (isBulkCompleted) {
            setMainLauncherText(getRestartText(), '');
        }
    }

    function getRestartText() {
        return userSettings.RetryFailed ? retryFailedText : restartText;
    }

    function setupControls() {

        var $controls = document.getElementById('controls');

        init();
        setEvents();

        function init() {

            var $inputs = $controls.querySelectorAll('input');

            for (var i = 0; i < $inputs.length; i++) {
                var $input = $inputs[i],
                    name = $input.getAttribute('value'),
                    storedData = localStorage.getItem($input.getAttribute('value'));

                $input.checked = !!storedData;

                setSetting(name, storedData);
            }
        }

        function setEvents() {
            $controls.addEventListener('change', filterEventHandler('input', function (e) {
                storeData(e.filterdTarget);
                applySettings();
            }));
        }

        function storeData($input) {
            var name = $input.getAttribute('value'),
                isChecked = $input.checked;

            if (isChecked) {
                localStorage.setItem(name, 1);
            } else {
                localStorage.removeItem(name);
            }

            setSetting(name, isChecked);
        }

        function setSetting(name, data) {
            name = name.replace('tester', '');

            if (data) {
                userSettings[name] = true;
            } else {
                delete userSettings[name];
            }
        }
    }
});

// jQuery .on() equivalent
var filterEventHandler = function (selector, callback) {
    return (!callback || !callback.call) ? null : function (e) {
        var target = e.target || e.srcElement || null;
        while (target && target.parentElement && target.parentElement.querySelectorAll) {
            var elms = target.parentElement.querySelectorAll(selector);
            for (var i = 0; i < elms.length; i++) {
                if (elms[i] === target) {
                    e.filterdTarget = elms[i];
                    callback.call(elms[i], e);
                    return;
                }
            }
            target = target.parentElement;
        }
    };
};