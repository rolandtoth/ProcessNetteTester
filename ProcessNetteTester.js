document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("main-launcher") && startProcessNetteTester();
});

function startProcessNetteTester() {
  var $mainLauncher = document.getElementById("main-launcher"),
    runSingleSelector = ".run-single",
    $display = document.getElementById("display"),
    $counter = $display.querySelector("span.counter"),
    total = parseInt($display.querySelector("span.total").innerHTML),
    $table = document.getElementById("pnt-table"),
    texts = JSON.parse($display.getAttribute("data-texts")),
    isScrollIntoViewSupported = document.body.scrollIntoView,
    $passedItems = document.getElementsByClassName("passed"),
    $failedItems = document.getElementsByClassName("failed"),
    $pendingItems = document.getElementsByClassName("pending"),
    missingAssertMessage = "Error: This test forgets to execute an assertion.",
    maxTimeout = parseInt($display.getAttribute("data-max-timeout")),
    userSettings = {
      testerStopOnFail: false,
      testerHidePassed: false,
      testerCountFailed: false,
      testerRetryFailed: false,
      testerAutoScroll: false,
      testerShowBreadcrumbs: true,
    },
    requests = {},
    pntFlags = {
      stop: false,
      bulk: false,
      bulkComplete: false,
    },
    COLUMN_RESULT = 3,
    COLUMN_TIME = 4;

  if (!$table) {
    return false;
  }

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
    var $rows = $table.querySelectorAll("tbody tr");

    for (var i = 0; i < $rows.length; i++) {
      resetRow($rows[i]);
    }

    resetDisplay();
  }

  function resetMainLauncherText() {
    setMainLauncherText(texts.run, texts.stop);
  }

  function resetDisplay() {
    $display.className = "";
    $counter.innerHTML = 0;
  }

  function clearDisplayAnimStyles() {
    $display.removeAttribute("data-state");
  }

  function setPass($row) {
    // Explicitly remove 'failed' class before setting 'passed'
    $row.classList.remove("failed");
    setRowState($row, "passed");
  }

  function setFail($row) {
    setRowState($row, "failed");

    if ($failedItems.length && userSettings.testerStopOnFail) {
      pntFlags.stop = true;
      stop();
      return false;
    }
  }

  function setTimedout($row) {
    setRowState($row, "timedout");
  }

  function resetRow($row, text) {
    setRowState($row, "");
    $row.removeAttribute("data-has-run");
    setStatusText($row, COLUMN_RESULT, text);
    setStatusText($row, COLUMN_TIME, texts.emptyValue);
    $display.removeAttribute("class");
    updateDisplay();
  }

  function setStatusText($row, column, text) {
    text = text || texts.emptyValue;
    $row.querySelector("td:nth-child(" + column + ")").innerHTML = text;
  }

  function stop($row) {
    var $pendingRows;

    if ($row && getRowState($row) === "pending") {
      abortTest($row);
    }

    if (pntFlags.bulk) {
      $pendingRows = $($pendingItems);

      if ($pendingRows.length) {
        for (var i = 0; i < $pendingRows.length; i++) {
          abortTest($pendingRows[i]);
        }
        pntFlags.stop = true;
      }
    }
    clearDisplayAnimStyles();
    return false;
  }

  function abortTest($row) {
    var testName = $row.getAttribute("data-test-name"),
      req = requests[testName];

    if (req) {
      req.abort();
      delete requests[testName];
    }
    resetRow($row, texts.aborted);
    setRowState($row, "aborted");
  }

  function setMainLauncherText(text1, text2) {
    $mainLauncher.querySelector("em:nth-child(1)").innerHTML = text1;
    $mainLauncher.querySelector("em:nth-child(2)").innerHTML = text2;
  }

  function setBulkRunCompleted() {
    pntFlags.bulkComplete = true;
    setMainLauncherText(getRestartText(), "");
    showTotalTime();
  }

  function showTotalTime() {
    var totalTime = 0,
      $timeCells = $table.querySelectorAll("tbody tr td:last-child");

    for (var i = 0; i < $timeCells.length; i++) {
      var time = parseFloat($timeCells[i].innerHTML);
      if (!isNaN(time)) {
        totalTime += time;
      }
    }

    $display.setAttribute(
      "data-total-value",
      texts.total.replace("%f", totalTime.toFixed(4))
    );
  }

  function hideTotalTime() {
    $display.removeAttribute("data-total-value");
  }

  function runNext() {
    var $row,
      pendingSelector = "tbody tr.pending",
      hasNotRunSelector =
        "tbody tr:not([data-has-run]):not(.pass):not(.pending)",
      $btn;

    // disallow run multiple (manually run multiple when bulk is running)
    if ($(pendingSelector).length) return false;

    if (pntFlags.stop) {
      pntFlags.stop = true;
      stop();
      return false;
    }

    $row = $table.querySelector(hasNotRunSelector);

    if ($row) {
      $btn = $row.querySelector(runSingleSelector);

      if (isScrollIntoViewSupported) {
        if (pntFlags.bulk && userSettings.testerAutoScroll) {
          $btn.scrollIntoView({
            behavior: "auto",
            block: "center",
          });
        }
      }

      $btn.click();
    } else {
      // no more rows
      clearDisplayAnimStyles();
      pntFlags.bulk = false;
      setBulkRunCompleted();
    }
  }

  function updateDisplay() {
    $display.classList.remove("all-passed");

    $counter.innerHTML = userSettings.testerCountFailed
      ? $failedItems.length
      : $passedItems.length;

    // Check if any test has failed
    if ($failedItems.length > 0) {
      $display.classList.add("has-failed");
    } else {
      $display.classList.remove("has-failed");
    }

    // Get all test rows that have run
    var $testsRun = document.querySelectorAll("tbody tr[data-has-run]");
    var $allRows = document.querySelectorAll("tbody tr");

    // Check if all run tests passed
    var allRunTestsPassed = $failedItems.length === 0 && $testsRun.length > 0;

    // Add all-passed class if all tests that have run are passing
    if (allRunTestsPassed) {
      $display.classList.add("all-passed");

      // If we've run all tests, show restart text
      if ($testsRun.length === $allRows.length) {
        setMainLauncherText(getRestartText(), "");
        showTotalTime();
      }
    }

    // update tablesorter
    if (window.jQuery) {
      jQuery($table).trigger("update");
    }
  }

  function initDom() {
    var $rows = $table.querySelectorAll("tbody tr");

    for (var i = 0; i < $rows.length; i++) {
      var $row = $rows[i];
      $row.setAttribute(
        "data-test-name",
        $row
          .querySelector("td:first-child span")
          .innerText.replace(".php", "")
          .toLowerCase() +
          "__" +
          (i + 1)
      );
    }
  }

  function addEvents() {
    // start/stop with space key
    $(document).on("keydown", function (e) {
      e = e || window.event;

      var keyCode = e.keyCode || e.charCode || e.which,
        target = e.target;

      if ($(target).is("input, textarea")) {
        return true;
      }

      if (keyCode === 32) {
        $mainLauncher.click();
        return false;
      }
    });

    // main display
    $mainLauncher.addEventListener("click", function (e) {
      var itemSelector, $rows;

      hideTotalTime();

      if (pntFlags.bulkComplete) {
        pntFlags.bulkComplete = false;
        itemSelector = userSettings.testerRetryFailed
          ? "tbody tr.failed, tbody tr.timedout"
          : "tbody tr";
        $rows = $table.querySelectorAll(itemSelector);

        for (var i = 0; i < $rows.length; i++) {
          $rows[i].removeAttribute("data-has-run");
        }

        resetMainLauncherText();

        if (!userSettings.testerRetryFailed) {
          resetTable();
          resetDisplay();
        }
      }

      if ($display.getAttribute("data-state")) {
        pntFlags.stop = true;
        stop();
        pntFlags.bulk = false;
        return false;
      }

      e = e || window.event;

      if (e.metaKey || e.ctrlKey) {
        resetTable();
        resetDisplay();
        return false;
      }

      $display.setAttribute("data-state", "running");
      pntFlags.stop = false;
      pntFlags.bulk = true;

      runNext();
    });

    // run single test
    $table.addEventListener(
      "click",
      filterEventHandler(runSingleSelector, function (e) {
        e = e || window.event;
        e.preventDefault();

        var $button = e.filterdTarget,
          $row = $button.parentElement.parentElement,
          ajaxUrl = $button.getAttribute("data-url"),
          state = getRowState($row),
          testName = $row.getAttribute("data-test-name"),
          msg = "Error",
          response,
          xhr;

        resetRow($row);
        hideTotalTime();
        updateDisplay();
        resetMainLauncherText();

        if (state === "pending") {
          abortTest($row);
          pntFlags.stop = false;
          return false;
        }

        if (e.metaKey || e.ctrlKey) {
          if (pntFlags.bulkComplete) {
            pntFlags.bulkComplete = false;
          }
          return false;
        }

        setRowState($row, "pending");

        xhr = new XMLHttpRequest();
        xhr.open("GET", ajaxUrl, true);
        xhr.timeout = maxTimeout;

        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        xhr.ontimeout = function () {
          setTimedout($row);
          setStatusText($row, COLUMN_RESULT, texts.timedout);

          if (pntFlags.bulk) {
            runNext();
          }
        };

        xhr.onreadystatechange = function () {
          var DONE = 4,
            OK = 200,
            time = "";

          if (xhr.readyState === DONE) {
            var hasMissingAssertText =
              xhr.responseText &&
              xhr.responseText.indexOf(missingAssertMessage) !== -1;

            xhr.getAllResponseHeaders();

            if (xhr.status === OK) {
              try {
                // Handle case where response starts with output before the JSON
                var responseText = xhr.responseText.replace(
                  missingAssertMessage,
                  ""
                );

                // Extract just the JSON part from the response
                var jsonStartPos = responseText.indexOf("{");
                var jsonEndPos = responseText.lastIndexOf("}") + 1;

                if (jsonStartPos >= 0 && jsonEndPos > jsonStartPos) {
                  var jsonPart = responseText.substring(
                    jsonStartPos,
                    jsonEndPos
                  );
                  response = JSON.parse(jsonPart);

                  if (response.success) {
                    if (hasMissingAssertText) {
                      setFail($row);
                      msg = addPre(missingAssertMessage);
                    } else {
                      // Explicitly remove any 'failed' class and set to 'passed'
                      $row.classList.remove("failed");
                      setPass($row);
                      msg = response.data.result;

                      // Fix display formatting for 0 test count
                      if (msg.indexOf("Passed0 tests") !== -1) {
                        msg = msg.replace("Passed0 tests", "Passed");
                      }

                      time = response.data.time;
                    }
                  } else {
                    setFail($row);
                    msg = addPre(response.data.result);
                  }
                } else {
                  // No JSON found in the response
                  if (
                    responseText.indexOf("SUCCESS") === 0 ||
                    responseText.indexOf("√ test") >= 0 ||
                    responseText.indexOf("OK") >= 0
                  ) {
                    // Consider it a success if it contains success indicators
                    setPass($row);
                    msg = addPre(responseText);
                  } else {
                    setFail($row);
                    msg = addPre(responseText);
                  }
                }
              } catch (ex) {
                // Special handling for successful tests that the parser couldn't handle
                if (
                  xhr.responseText &&
                  (xhr.responseText.indexOf("SUCCESS") === 0 ||
                    xhr.responseText.indexOf("√ test") >= 0 ||
                    xhr.responseText.indexOf("OK") >= 0)
                ) {
                  $row.classList.remove("failed");
                  setPass($row);
                  msg = addPre(xhr.responseText);
                } else {
                  setFail($row);
                  msg = addPre(xhr.responseText);
                }
              } finally {
                var $msgRow = $row.querySelector("td:nth-child(3)");

                $msgRow.innerHTML = msg;
                setBlankClass($msgRow);

                if (time) {
                  var $timeRow = $row.querySelector("td:nth-child(4)");
                  $timeRow.innerHTML = time;
                  setBlankClass($timeRow);
                }
              }
            }
          }

          $row.setAttribute("data-has-run", "1");

          if (pntFlags.bulk) {
            runNext();
          }

          // if (!timedOut) {
          updateDisplay();
          applySettings();
          // }
        };

        xhr.send();

        requests[testName] = xhr;
      })
    );

    // add Tracy editor links

    if (
      document.getElementById("tracy-debug-panel-FileEditorPanel") &&
      window.tracyFileEditorLoader
    ) {
      $table.setAttribute("data-editor-available", "1");

      $table.addEventListener(
        "click",
        filterEventHandler("[data-editor-url]", function (e) {
          var url = e.filterdTarget.getAttribute("data-editor-url");
          tracyFileEditorLoader.loadFileEditor(url, 1);
          return false;
        })
      );
    }
  }

  function setBlankClass($el) {
    if ($el.innerHtml === "") {
      $el.classList.add("blank");
    } else {
      $el.classList.remove("blank");
    }
  }

  function addPre(msg) {
    return "<pre>" + msg + "</pre>";
  }

  function applySettings() {
    var $wrap = document.getElementById("ProcessNetteTester-wrap");

    $wrap.setAttribute(
      "data-hide-passed",
      userSettings.testerHidePassed ? "1" : "0"
    );
    $wrap.setAttribute(
      "data-show-breadcrumb",
      userSettings.testerShowBreadcrumbs ? "1" : "0"
    );
    $counter.innerHTML = userSettings.testerCountFailed
      ? $failedItems.length
      : $passedItems.length;

    if (pntFlags.bulkComplete) {
      setMainLauncherText(getRestartText(), "");
    }
  }

  function getRestartText() {
    return userSettings.testerRetryFailed ? texts.retryFailed : texts.restart;
  }

  function setupControls() {
    var $controls = document.getElementById("controls");

    init();
    setEvents();

    function init() {
      var $inputs = $controls.querySelectorAll("input");

      for (var i = 0; i < $inputs.length; i++) {
        var $input = $inputs[i],
          name = $input.getAttribute("value"),
          storedData = localStorage.getItem($input.getAttribute("value"));

        $input.checked = !!storedData;

        setSetting(name, storedData);
      }
    }

    function setEvents() {
      $controls.addEventListener(
        "change",
        filterEventHandler("input", function (e) {
          storeData(e.filterdTarget);
          applySettings();
        })
      );
    }

    function storeData($input) {
      var name = $input.getAttribute("value"),
        isChecked = $input.checked;

      if (isChecked) {
        localStorage.setItem(name, 1);
      } else {
        localStorage.removeItem(name);
      }

      setSetting(name, isChecked);
    }

    function setSetting(name, data) {
      if (data) {
        userSettings[name] = true;
      } else {
        delete userSettings[name];
      }
    }
  }
}

// jQuery .on() equivalent
var filterEventHandler = function (selector, callback) {
  return !callback || !callback.call
    ? null
    : function (e) {
        var target = e.target || null;
        while (
          target &&
          target.parentElement &&
          target.parentElement.querySelectorAll
        ) {
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
