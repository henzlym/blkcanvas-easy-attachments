<?php

/**
 * Plugin Name: Blkcanvas - Easy Attachments
 * Plugin URI: https://blk-canvas.com/
 * Description: Download beautiful photos without the hassle or pay.
 * Author: Henzly Meghie
 * Author URI: https://blk-canvas.com/
 * Version: 1.0.0
 * License: GPL2+
 * License URI: https://www.gnu.org/licenses/gpl-2.0.txt
 *
 * @package CGB
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Block Initializer.
 */
require_once plugin_dir_path(__FILE__) . 'src/init.php';
