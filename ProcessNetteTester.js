$(document).ready(function () {

    var $mainLauncher = $('#main-launcher'),
        runSingleSelector = '.ajax-run-test',
        $display = $('#display'),
        $totalCounter = $display.find('span.total'),
        $counter = $display.find('span.counter'),
        total = parseInt($totalCounter.html()),
        $table = $('table.ProcessNetteTester'),
        abortText = $display.attr('data-abort-text'),
        runText = $display.attr('data-run-text'),
        stopText = $display.attr('data-stop-text'),
        restartText = $display.attr('data-restart-text'),
        retryFailedText = $display.attr('data-retry-failed-text'),
        userSettings = {},
        stopFlag = false,
        isBulk = false,
        isBulkCompleted = false,
        isScrollIntoViewSupported = document.body.scrollIntoView,
        requests = {};

    initDom();
    setupControls();
    addEvents();
    applySettings();

    function resetTable() {
        $table.find('tbody tr').each(function () {
            resetRow($(this));
        });
        resetDisplay();
    }

    function resetMainLanuncher() {
        $mainLauncher.find('em:nth-child(1)').html(runText);
        $mainLauncher.find('em:nth-child(2)').html(stopText);
    }

    function resetDisplay() {
        $display.removeAttr('class');
        $counter.html('0');
    }

    function clearDisplayAnimStyles() {
        $display.removeAttr('data-state');
        $display.removeClass('anim');
    }

    function setPass($row) {
        $row.find('td:nth-child(1) i').attr('class', 'fa fa-check-circle');
        $row.attr('data-state', 'pass');
    }

    function setFail($row) {
        $row.find('td:nth-child(1) i').attr('class', 'fa fa-warning');
        $row.attr('data-state', 'fail');

        if (userSettings.StopOnFail) {
            stopFlag = true;
            stop();
            return false;
        }
    }

    function resetRow($row, message) {
        $row.removeAttr('data-state');
        $row.removeAttr('data-has-run');
        $row.find('td:first-child i').attr('class', 'fa fa-question-circle');
        setMessage($row.find('td:nth-child(3)'), message);
        $row.find('td:nth-child(4)').html('--');
        $display.removeAttr('class');
        updateDisplay();
    }

    function setMessage($elem, message) {
        message = message || '--';
        $elem.html('<em>' + message + '</em>');
    }

    function stop($row) {
        var $pendingRows;

        if ($row && $row.attr('data-state') === 'pending') {
            abortTest($row);
        }

        if (isBulk) {
            $pendingRows = $table.find('[data-state="pending"]');
            if ($pendingRows.length) {
                $pendingRows.each(function () {
                    abortTest($(this));
                });
                stopFlag = true;
            }
        }
        clearDisplayAnimStyles();
        // stopFlag = false;
        return false;
    }

    function abortTest($row) {
        var request = requests[$row.attr('data-test-name')];
        if (request) {
            request.abort();
            delete requests[$row.attr('data-test-name')];
        }
        resetRow($row, abortText);
        $row.attr('data-state', 'aborted');
    }

    function setMainLauncherText(text1, text2) {
        $mainLauncher.find('em:nth-child(1)').html(text1);
        $mainLauncher.find('em:nth-child(2)').html(text2);
    }

    function setBulkRunCompleted() {
        isBulkCompleted = true;
        setMainLauncherText(getRestartText(), '');
    }

    function runNext() {
        var $rows,
            $row,
            pendingSelector = 'tbody tr[data-state="pending"]',
            hasNotRunSelector = 'tbody tr:not([data-has-run]):not([data-state="pass"]):not([data-state="pending"])';

        // disallow run multiple (manually run multiple when bulk is running)
        if ($(pendingSelector).length) return false;

        if (stopFlag) {
            stopFlag = true;
            stop();
            return false;
        }

        $rows = $table.find(hasNotRunSelector);

        if ($rows.length) {
            $row = $rows.first().find(runSingleSelector);

            if(isScrollIntoViewSupported) {
                if (isBulk && userSettings.AutoScroll) {
                    $row[0].scrollIntoView({
                        behavior: 'auto',
                        block: 'center'
                    });
                }
            }

            $row.trigger('runsingle');

        } else {
            // no more rows
            clearDisplayAnimStyles();
            isBulk = false;
            setBulkRunCompleted();
        }
    }

    function updateDisplay() {
        var passCount = getPassCount(),
            failCount = getFailCount();

        $counter.html(userSettings.DisplayFailedPerTotal ? failCount : passCount);

        if (failCount > 0) {
            $display.addClass('fail');
        } else {
            $display.removeClass('fail');
        }

        if (passCount === total) {
            $display.addClass('pass');
        }
    }

    function initDom() {
        $mainLauncher.css('min-width', $mainLauncher.outerWidth() + 12 + 'px');

        $table.find('tbody tr').each(function (i) {
            $(this).attr('data-test-name', $(this).find('td:first-child span').text().replace('.php', '').toLowerCase() + '__' + i);
        });
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
                $mainLauncher.get(0).click();
                return false;
            }
        });

        // main display
        $mainLauncher.on('click runbulk', function (e) {

            if (isBulkCompleted) {
                isBulkCompleted = false;
                if (userSettings.RetryFailed) {
                    $table.find('tbody tr[data-state="fail"]').removeAttr('data-has-run');
                    resetMainLanuncher();
                } else {
                    $table.find('tbody tr').removeAttr('data-has-run');
                    resetTable();
                    resetDisplay();
                    resetMainLanuncher();
                }
            }

            e = e || window.event;

            if ($display.attr('data-state')) {
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

            $display.attr('data-state', 'running');
            stopFlag = false;
            isBulk = true;

            runNext();
        });

        // single test run
        $table.on('click runsingle', runSingleSelector, function (e) {

            e = e || window.event;

            e.preventDefault();

            updateDisplay();

            var $button = $(this),
                $row = $button.parents('tr').first(),
                ajaxUrl = $button.attr('data-url');

            if ($row.attr('data-state') === 'pending') {
                abortTest($row);
                stopFlag = false;
                // stop($row);
                return false;
            }

            resetRow($row);

            if (e.metaKey || e.ctrlKey) {
                return false;
            }
            
            $row.attr('data-state', 'pending');
            $display.addClass('anim');
            $row.find('td:nth-child(1) i.fa').attr('class', 'fa fa-refresh fa-spin');

            requests[$row.attr('data-test-name')] = $.getJSON(ajaxUrl)

                .success(function (data) {

                    $row.find('td:nth-child(3)').html(data.columns[2]);
                    $row.find('td:nth-child(4)').html(data.columns[3]);

                    if (data.status === 'fail') {
                        setFail($row);
                    } else {
                        setPass($row);
                    }
                })

                .fail(function (data) {

                    setFail($row);

                    var errorMessage = (data.responseText && typeof data.responseText === 'string') ? data.responseText : 'fail',
                        missingAssertMessage = 'Error: This test forgets to execute an assertion.';

                    if (data.responseText && data.responseText.indexOf(missingAssertMessage) !== -1) {
                        errorMessage = missingAssertMessage;
                    }

                    $row.find('td:nth-child(3)').html('<pre>' + errorMessage + '</pre>');
                })

                .always(function () {

                    $row.attr('data-has-run', '1');

                    if (isBulk) {
                        runNext();
                    } else {
                        $display.removeClass('anim');
                    }

                    updateDisplay();
                    applySettings();
                })
        });
    }

    function applySettings() {

        $('#ProcessNetteTester-wrap').attr('data-hide-passed', userSettings.HidePassed ? '1' : '0');

        $counter.html(userSettings.DisplayFailedPerTotal ? getFailCount() : getPassCount());

        if (isBulkCompleted) {
            setMainLauncherText(getRestartText(), '');
        }
    }

    function getRestartText() {
        return userSettings.RetryFailed ? retryFailedText : restartText;
    }

    function getPassCount() {
        return $table.find('tr[data-state="pass"]').length;
    }

    function getFailCount() {
        return $table.find('tr[data-state="fail"]').length;
    }

    function setupControls() {

        var $controls = $('#controls');

        init();
        setEvents();

        function init() {
            $controls.find('input').each(function () {
                var $control = $(this),
                    name = $control.attr('value'),
                    storedData = localStorage.getItem($control.attr('value'));

                $control.prop('checked', storedData);

                setSetting(name, storedData);
            });
        }

        function setEvents() {
            $controls.on('change', 'input', function () {
                storeData($(this));
                applySettings();
            });
        }

        function storeData($control) {
            var name = $control.attr('value'),
                isChecked = $control.is(':checked');

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
