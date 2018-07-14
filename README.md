ProcessNetteTester
================

Run [Nette Tester](https://tester.nette.org/) tests within [ProcessWire](http://processwire.com/) admin.

[GitHub](https://github.com/rolandtoth/ProcessNetteTester) • [Modules Directory](https://modules.processwire.com/modules/process-nette-tester/) • [Donate](https://www.paypal.me/rolandtothpal/5)

![ProcessNetteTester](https://rolandtoth.hu/pic/pw/processnettetester-v006.png "ProcessNetteTester")

## Features

- AJAX interface for running Nette Tester tests, in bulk or manually
- display counter, error message and execution time in a table
- run all tests at once or launch single tests
- show formatted test error messages and report PHP syntax errors
- stop on first failed test (optional)
- hide passed tests (optional)
- display failed/total instead passed/total (optional)
- re-run failed tests only (optional)
- auto scroll (optional)
- include or exclude tests based on query parameters
- start/stop all tests with the spacebar
- reset one test or all tests (ctrl+click)

## Install

Install the module as usual, from the Modules Directory or manually. The module installs a new field called `tester_tests_directory` that is added to the `admin` template. On uninstall the field will be removed from the template and deleted.

### Setting up a tester page

1. Add a new page under the Admin tree with the `admin` template, eg. under Admin\Setup.
2. Set it's name eg. to `tests`, save the page, then set it's process to `ProcessNetteTester` (located under the `Title` field).
3. A new `Tests directory` field appears below the `Process` field where you need to enter a directory path for your test files. This can be an existing directory (eg. for a module that already contains tests) or a new one you'll create later.
4. Publish the tester page.
5. Add test files to the directory you entered and view the page, it should display them in a table.

You can add as many tester page as you need. You can also add them to a new parent page to separate different kind of tests. In this case set the parent page's process to `ProcessList`. This way if you visit the parent page your tester pages will be listed.

### Adding tests

Put test files in the directory you set in step 3 of the "Setting up a tester page" section. The tester page will list test files named `*Test.php` from here, eg. `MyTest.php`, recursively.

A simple test looks like this:

```php
<?php namespace ProcessWire;

use \Tester\Assert;
use \Tester\TestCase;

/**
 * @testCase
 */
class FirstTest extends TestCase
{
    public function testHello()
    {
        $expected = 'hello';
        $actual = 'hell' . 'o';
        Assert::equal($expected, $actual);
    }
}

(new FirstTest())->run();
```


See the [Nette Tester website](https://tester.nette.org) for the documentation.

## How it works

### Bulk vs manual modes

#### Bulk run

A list of tests are loaded on page load and you can click on the top-left circular display to start running tests. In this mode tests are executed sequentially, one after the other.

Clicking on the display will pause/continue processing tests.

Bulk run stops when it reaches the last test. If all tests passed the display will read "RESTART", and clicking on it will reset the test list and start a new bulk run.

The spacebar can also be used to trigger a bulk run.

#### Manual run

Clicking on the button right to a test's name will run the test. If a bulk process is running, tests launched manually will be skipped.

### Aborting tests

When a test is running and clicking on the main display or a manual run button, the test will be aborted. If it's a bulk run it will be stopped too.

Note that aborting affects only the interface as the test in the background will continue to run, only the result will be ignored.

### Resetting tests

You can ctrl+click on the main display or on manual run buttons to reset (eg. icons, messages, main display counter and colors, etc).

## Statuses and colors

The main display and individual tests are colored according to test results:

- Default (black/blue): the test hasn't been run (main display: no tests were run yet)
- Passed (green): if the test was successful (main display: all tests passed)
- Failed (red): if the test fails (main display: if there's at least one failed test)
- Timed out (purple): if the test would go beyond 60 seconds to complete
- Aborted: if the test fails (main display: if there's at least one failed test)
- Pending: when the test is running (the icon in front of the test name animates)

## Settings

The module doesn't come with a configuration page but a few setting can be set during runtime. These are stored in localStorage and survive page loads, until the browser cache is cleared. They are also "live" so eg. you can modify them during a bulk run and their effects will be applied instantly.

- **Stop on fail**: if a test fails, do not continue to the next one (bulk run only)
- **Hide passed**: hide passed tests from the list
- **Count failed**: by default passed items are counted in the main display, eg 8/10 means "8 passed out of 10 tests". Check this to count the failed ones instead, which would be 2/10 in this example.
- **Retry failed**: if checked, on restarting a bulk run failed tests will re-run only, passed ones will be skipped
- **Autoscroll**: whether to auto scroll the list of tests, only available during a bulk run

## Including or excluding tests

If you would like to list only specific tests, you can add their filenames to the "include" or "exclude" URL parameters, separated by spaces. Use lowercase names, without ".php". The "Test" part of the filename is optional.

Examples:

```
http://mydomain.com/admin/setup/tests/?include=test1,test2,test3
http://mydomain.com/admin/setup/tests/?exclude=test4,test5
```

## Notes

Some Nette Tester features are available only in the commandine mode, eg. `Environment::THREAD`, please refer to the official docs.