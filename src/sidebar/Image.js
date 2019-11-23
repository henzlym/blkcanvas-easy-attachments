import InsertIcon from '../svg/InsertIcon';
import ImageIcon from '../svg/ImageIcon';
import DownloadIcon from '../svg/DownloadIcon';
const { Fragment, Component } = wp.element;

export default class Image extends Component {
    constructor(props) {
        super(...arguments);
        this.props = props;
        this.state = {
            hover: false,
            imageClass: '',
            buttonContainerClass: '',
            buttonClass: '',
            intoPostButtonClass: '',
            featuredButtonClass: ''
        }
    }
    render() {

        const { photo: { id, user: { username, profile_image }, description, urls, links: { download_location } }, download, isDownloading, isDownloaded } = this.props;
        let downloading = (isDownloading == id) ? ' downloading' : '';
        let downloaded = (isDownloaded == id) ? ' downloaded' : ''; 
        return (
            <div id={`photo-${id}`} className={`easy-attachments-sidebar_photo_container${downloading}${downloaded}`}
                onMouseLeave={() => {
                    this.setState({
                        buttonClass: '',
                        featuredButtonClass: '',
                        intoPostButtonClass: '',
                        buttonContainerClass: ''
                    })
                }}>
                <div className="easy-attachments-sidebar_photo_user">
                    <img src={profile_image.large} alt="" />
                    <span>{username}</span>
                </div>
                <img src={urls.regular} alt={description} srcset="" />
                <div className="easy-attachments-download_container">
                    <button
                        title="Download into post"
                        className={`download_intopost${this.state.intoPostButtonClass}`}
                        onClick={(e) => {
                            download(this.props.photo, 'in-post');
                        }}><InsertIcon /></button>
                    <button
                        title="Set as featured image"
                        className={`download_featured${this.state.featuredButtonClass}`}
                        onClick={(e) => {
                            download(this.props.photo, 'featured-image');
                        }}><ImageIcon /></button>
                    <button
                        title="Download to media library"
                        className={`download${this.state.featuredButtonClass}`}
                        onClick={(e) => {
                            download(this.props.photo);
                        }}><DownloadIcon /></button>
                </div>
                <div className="easy-attachments-download_container_overlay">
                    <span>{downloading == ' downloading' ? ('Downloading') : ('Downloaded')}</span>
                    <div className="linePreloader"></div>
                </div>

            </div>
        );
    }
}