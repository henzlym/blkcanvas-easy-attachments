<?php

/**
 * Blocks Initializer
 *
 * Enqueue CSS/JS of all the blocks.
 *
 * @since   1.0.0
 * @package 
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

$upload_dir = wp_upload_dir();
define('EASY_ATTACHMENTS_MEDIA_LIBRARY_PATH', $upload_dir['path']);
define('EASY_ATTACHMENTS_MEDIA_LIBRARY_PATH_TEMP', $upload_dir['basedir'] . '/easy-attatchments');
define('EASY_ATTACHMENTS_MEDIA_LIBRARY_URL', $upload_dir['url']);
/**
 * Enqueue Gutenberg block assets for both frontend + backend.
 *
 * Assets enqueued:
 * 1. blocks.style.build.css - Frontend + Backend.
 * 2. blocks.build.js - Backend.
 * 3. blocks.editor.build.css - Backend.
 *
 * @uses {wp-blocks} for block type registration & related functions.
 * @uses {wp-element} for WP Element abstraction — structure of blocks.
 * @uses {wp-i18n} to internationalize the block's text.
 * @uses {wp-editor} for WP editor styles.
 * @since 1.0.0
 */
function easy_attachments_block_assets()
{ 
    // phpcs:ignore

    // Register block editor script for backend.
    wp_register_script(
        'easy_attachments-block-js', // Handle.
        plugins_url('dist/blocks.build.js', dirname(__FILE__)), // Block.build.js: We register the block here. Built with Webpack.
        array('wp-blocks', 'wp-i18n', 'wp-element', 'wp-editor'), // Dependencies, defined above.
        null, // filemtime( plugin_dir_path( __DIR__ ) . 'dist/blocks.build.js' ), // Version: filemtime — Gets file modification time.
        true // Enqueue the script in the footer.
    );

    // Register block editor styles for backend.
    wp_register_style(
        'easy_attachments-block-editor-css', // Handle.
        plugins_url('dist/blocks.editor.build.css', dirname(__FILE__)), // Block editor CSS.
        array('wp-edit-blocks'), // Dependency to include the CSS after it.
        null // filemtime( plugin_dir_path( __DIR__ ) . 'dist/blocks.editor.build.css' ) // Version: File modification time.
    );

    // WP Localized globals. Use dynamic PHP stuff in JavaScript via `Global` object.
    wp_localize_script(
        'easy_attachments-block-js',
        'blkcanvasGlobal', // Array containing dynamic data for a JS Global.
        [
            'pluginDirPath' => plugin_dir_path(__DIR__),
            'pluginDirUrl'  => plugin_dir_url(__FILE__),
            'redirectLink'  => get_site_url(),
            'nonce' => wp_create_nonce('wp_rest')
            // Add more data here that you want to access from `Global` object.
        ]
    );

}
// Hook: Block assets.
add_action('init', 'easy_attachments_block_assets');


/*
Plugin Name: Sidebar plugin
*/
function easy_attachments_sidebar_plugin_script_enqueue()
{
    wp_enqueue_script('easy_attachments-block-js');
    wp_enqueue_style('easy_attachments-block-editor-css');
}
add_action('enqueue_block_editor_assets', 'easy_attachments_sidebar_plugin_script_enqueue');


add_action('rest_api_init', function () {
    register_rest_route('easy-attachments/v1', '/download', array(
        'methods' => 'POST',
        'callback' => 'easy_attachments_download',
        'permission_callback' => function () {
            return current_user_can('edit_others_posts');
        }

    ));
});
function easy_attachments_download(WP_REST_Request $request)
{
    require_once ABSPATH . "wp-admin/includes/file.php";
    require_once ABSPATH . "wp-admin/includes/media.php";
    require_once ABSPATH . "wp-admin/includes/image.php";



    // You can get the combined, merged set of parameters:
    $post_id = (null !== $request->get_param('post_id')) ? $request->get_param('post_id') : 0;
    $photo = (null !== $request->get_param('photo')) ? $request->get_param('photo') : null;
    $photo_id = sanitize_text_field($photo['id']);
    $download_link = (null !== $request->get_param('download_link')) ? sanitize_text_field($request->get_param('download_link')) : "";
    $media_path = EASY_ATTACHMENTS_MEDIA_LIBRARY_PATH; // Temp Image Path
    $temp_path = EASY_ATTACHMENTS_MEDIA_LIBRARY_PATH_TEMP;
    $media_url = EASY_ATTACHMENTS_MEDIA_LIBRARY_URL . '/'; // Temp Image Url
    $filename = $photo_id . '.jpg';
    $img_path = $temp_path . '/' . $filename;

    $photo_description = isset($photo['description']) ? sanitize_text_field($photo['description']) : "";
    $photo_user_name = isset($photo['user']['name']) ? sanitize_text_field($photo['user']['name']) : "";
    $photo_user_username = isset($photo['user']['username']) ? sanitize_text_field($photo['user']['username']) : "";
    $photo_user_link = isset($photo['user']['links']['html']) ? esc_url_raw($photo['user']['links']['html']) : "";
    
    if ($photo_description !== "") {
        $title = $photo_description;
        $photo_description = "$title / $photo_user_name via Unsplash";
    } else {
        $title = "$photo_user_name via Unsplash";
    }

    // Sanity check inputs
    if (!isset($download_link) || empty($download_link)) {
        return $result;
    }

    // $url = "http://wordpress.org/about/images/logos/wordpress-logo-stacked-rgb.png";
    if (!is_dir($temp_path)) {
        wp_mkdir_p($temp_path);
    }

    if (function_exists('copy')) {
        // Save file to server using copy() function
        $saved_file = @copy($download_link . 'jpg', $img_path);
        if ($saved_file) {
            //  SUCCESS - Image saved

            // Copy file from uploads/easy-attachments to a media library directory.
            $new_filename = $media_path . '/' . $filename;
            $copy_file = @copy($img_path, $new_filename);

            if (!$copy_file) {
                // Error         
                $response = array(
                    'success' => false,
                    'msg' => __('Unable to copy image to the media library. Please check your server permissions.', 'easy-attachments')
                );
            } else {

                $filetype = wp_check_filetype(basename($new_filename), null);
                //  SUCCESS - Image saved
                // Build attachment array
                $attachment = array(
                    'guid' => $media_url . basename($new_filename),
                    'post_mime_type' => $filetype['type'],
                    'post_title' => $title,
                    'post_excerpt' => $photo_description,
                    'post_content' => '',
                    'post_status' => 'inherit'
                );

                $image_id = wp_insert_attachment($attachment, $new_filename, $post_id); // Insert as attachment
                $easy_attachments = array();
                $easy_attachments['ID'] = $photo_id;
                $easy_attachments['img_credit'] = 'via Unsplash';
                $easy_attachments['img_artist'] = $photo_user_username;
                $easy_attachments['credit_line'] = "Photo by <a href='" . $photo_user_link . "'>$photo_user_username</a> / via Unsplash";

                update_post_meta($image_id, '_wp_attachment_image_alt', $photo_description); // Add alt text
                update_post_meta($image_id, 'easy_attachments', $easy_attachments);

                $attach_data = wp_generate_attachment_metadata($image_id, $new_filename); // Generate metadata
                wp_update_attachment_metadata($image_id, $attach_data); // Add metadata

                if (file_exists($new_filename)) {
                    // Success
                    $response = array(
                        'success' => true,
                        'msg' => __('Image successfully uploaded to your media library!', 'easy-attachments'),
                        'id' => $image_id,
                        'url' => wp_get_attachment_url($image_id),
                        'alt' => $photo_description,
                        'caption' => $photo_description,
                        'admin_url' => admin_url(),
                    );
                } else {

                    // ERROR - File does NOT exist
                    $response = array(
                        'error' => true,
                        'msg' => __('Uploaded image not found, please ensure you have proper permissions set on the uploads directory.', 'easy-attachments'),
                        'path' => '',
                        'filename' => ''
                    );
                }
            }
        } else {

            // ERROR - Error on save
            $response = array(
                'error' => true,
                'msg' => __('Unable to download image to server, please check the server permissions of the easy-attachments folder in your WP uploads directory.', 'easy-attachments'),
                'path' => '',
                'filename' => ''
            );
        }
    } else {
        $response = array(
            'error' => true,
            'msg' => __('The core PHP copy() function is not available on your server. Please contact your server administrator to upgrade your PHP version.', 'easy-attachments'),
            'path' => $path,
            'filename' => $filename
        );
    }

    wp_send_json($response);
}
