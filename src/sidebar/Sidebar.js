import './editor.scss';
import SearchIcon from  '../svg/SearchIcon'
import CameraIcon from "../block/CameraIcon";
import Image from './Image';

const querystring = require('querystring');
const { Fragment, Component } = wp.element;
const { ENTER } = wp.keycodes;
const { TextControl, Button } = wp.components;
const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
const accessKey = "bf623eb6ee39cc322bb85c8e4575cda12670ee12cbfd85376bac4a022400edde";

export default class Sidebar extends Component {
    constructor(props) {
        super(...arguments);
        this.props = props;
        this.state = {
            searchTerm: "",
            selectedCollection: 0,
            photos: [],
            featuredCollections: [],
            currentPostID: 0,
            currentPage:1,
            isDownloading: false,
            lastPage:1
        }
        this.downloadImage = this.downloadImage.bind(this);
        this.loadMore = this.loadMore.bind(this);
    }
    componentDidMount() {
        const currentPostID = wp.data.select("core/editor").getCurrentPostId();
        this.setState({ currentPostID });
        this.getUnsplashFeaturedCollections();
    }

    easyAttachmentsFetch(path, fetchMethod, params = null) {
        let queryData = params !== null ? Object.assign({ client_id: accessKey }, params) : { client_id: accessKey };
        let querystrings = querystring.stringify(queryData);
        let url = `https://api.unsplash.com/${path}?${querystrings}`;

        return fetch(url, {
            method: fetchMethod
        })
    }
    getUnsplashFeaturedCollections() {

        let response = this.easyAttachmentsFetch('collections/featured', 'GET');

        response.then((response) => {
            return response.json();
        }).then((response) => {

            if (response.length > 0) {
                this.setState({ featuredCollections: response })
            } else {
                this.setState({ featuredCollections: [] })
            }

        })

    }
    getCollection(collectionID) {

        let params = { id: collectionID };
        let response = this.easyAttachmentsFetch(`collections/${collectionID}/photos`, 'GET', params);

        response.then((response) => {
            let perPage = response.headers.get('x-per-page');
            let total = response.headers.get('x-total');
            this.setState({ lastPage: Math.ceil( total / perPage )  })
            return response.json();
        }).then((response) => {
            if (response.length > 0) {
                this.setState({ photos: response })
            } else {
                this.setState({ photos: [] })
            }
        })
    }
    searchUnsplashPhotos() {
        const { searchTerm } = this.state;

        if (searchTerm == '') {
            this.setState({ photos: [] });
            return;
        }

        let params = { query: searchTerm };
        let response = this.easyAttachmentsFetch('search/photos', 'GET', params);

        response.then((response) => {

            let perPage = response.headers.get('x-per-page');
            let total = response.headers.get('x-total');
            this.setState({ lastPage: Math.ceil( total / perPage )  })
            return response.json();

        }).then((response) => {
            if (response.results.length > 0) {
                this.setState({ photos: response.results })
            } else {
                this.setState({ photos: [] })
            }
        })

    }
    loadMore(){

        const { searchTerm, selectedCollection, currentPage, photos, lastPage } = this.state;
        let params = { page:currentPage+1 };
        let url;
        if(searchTerm){
            params.query = searchTerm;
            url = `search/photos`;
        }
        if(selectedCollection){
            params.collections = selectedCollection;
            url = `collections/${selectedCollection}/photos`;
        }

        let response = this.easyAttachmentsFetch(url, 'GET', params);

        response.then((response) => {
            return response.json();
        }).then((response) => {

            response = (response.results) ? response.results : response;

            if (response.length > 0) {                
                this.setState({ photos: photos.concat(response), currentPage:currentPage+1 })                
            } else {
                this.setState({ photos: [] })
            }
        })
    }
    downloadImage(photo, action = "") {

        let params = { id: photo.id };
        let response = this.easyAttachmentsFetch(`photos/${photo.id}/download`, 'GET', params);

        response.then((response) => {
            return response.json();
        }).then((response) => {

            if (response) {
                this.setState({ isDownloading: photo.id })
                fetch('/wp-json/easy-attachments/v1/download', {
                    method: 'POST',
                    body: JSON.stringify({ post_id: this.state.currentPostID, photo: photo, download_link: response.url }),
                    headers: {
                        'X-WP-Nonce': blkcanvasGlobal.nonce,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                })
                    .then(response => response.json())
                    .then((results) => {
                        if (results) {
                            if (action == 'in-post') {
                                let insertedBlock = wp.blocks.createBlock('core/image', {
                                    id: results.id,
                                    url: results.url,
                                    alt: results.alt,
                                    caption: results.caption,
                                });
                                wp.data.dispatch('core/editor').insertBlocks(insertedBlock);
                            }
                            if (action == 'featured-image') {
                                wp.data.dispatch('core/editor').editPost({ featured_media: results.id });
                            }
                            this.setState({ isDownloaded: photo.id, isDownloading: false })

                        } else {
                            wp.data.dispatch('core/notices').createNotice(
                                'error', // Can be one of: success, info, warning, error.
                                results.msg, // Text string to display.
                                {
                                    isDismissible: true, // Whether the user can dismiss the notice.
                                    // Any actions the user can perform.
                                }
                            );
                        }
                    });
            }
        })
    }
    render() {

        return (
            <Fragment>
                <PluginSidebarMoreMenuItem
                    target="easy-attachments"
                >
                    My Sidebar
                </PluginSidebarMoreMenuItem>
                <PluginSidebar

                    name="easy-attachments"
                    title="Easy Attachments"
                    icon={<CameraIcon />}
                >
                    <div className="easy-attachments-sidebar">
                        <div className="easy-attachments-sidebar_quicksearch">
                            <p>Featured Collections:</p>
                            <div className="easy-attachments-sidebar_quicksearch_list_container">
                                <ul className="easy-attachments-sidebar_quicksearch_list">
                                    {
                                        this.state.featuredCollections.length > 0 && (
                                            this.state.featuredCollections.map((collection, i) => {
                                                let listClass = this.state.selectedCollection == collection.id ? 'selected' : '';
                                                return (
                                                    <li
                                                        collectionID={collection.id}
                                                        className={`easy-attachments-sidebar_quicksearch-item ${listClass}`}
                                                        onClick={(e) => {
                                                            this.getCollection(collection.id)
                                                            this.setState({ selectedCollection: collection.id })

                                                        }}>
                                                        {collection.title}
                                                    </li>
                                                )
                                            })
                                        )
                                    }
                                </ul>
                            </div>
                        </div>
                        <div className="easy-attachments-sidebar_search-container">
                            <TextControl
                                className="easy-attachments-search_input"
                                value={this.state.searchTerm}
                                placeholder="Search free photos ..."
                                onKeyDown={(event) => {
                                    const { keyCode } = event;
                                    if ( keyCode === ENTER ) {
                                        this.searchUnsplashPhotos();
                                    }
                                }}
                                onChange={(term) => {
                                    this.setState({ searchTerm: term })
                                }}
                            />
                            <div
                                className="search-icon-container"
                                onClick={() => {
                                    this.searchUnsplashPhotos();
                                }}
                            >
                                <SearchIcon/>
                            </div>
                            
                        </div>
                        <div className="easy-attachments-sidebar_photos">
                            {
                                this.state.photos.length > 0 && (
                                    this.state.photos.map((photo, i) => {
                                        return <Image isDownloading={this.state.isDownloading} isDownloaded={this.state.isDownloaded} photo={photo} download={this.downloadImage} />
                                    })
                                )
                            }
                        </div>
                        {
                            this.state.photos.length > 0 && this.state.lastPage > 1 &&(
                                <div className="easy-attachments-sidebar_loadmore">
                                    <Button isDefault onClick={this.loadMore}>Load More</Button>
                                </div>
                            )
                        }

                    </div>
                </PluginSidebar>
            </Fragment>
        )
    }
}
