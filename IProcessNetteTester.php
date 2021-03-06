<?php

/**
 * Interface IProcessNetteTester
 */
interface IProcessNetteTester
{
    /**
     * Directory name of tests root.
     *
     * @return string
     */
    public function getTestDirName();

    /**
     * Path to tests root directory (with trailing slash).
     *
     * @return string
     */
    public function getTestDirPath();

    /**
     * Get application HTML markup.
     *
     * @return string
     */
    public function renderMarkup();

    /**
     * Get application HTML markup.
     *
     * @return string
     */
    public function getAjaxResponse();
}
