import Sidebar from './sidebar/Sidebar';
const { registerPlugin } = wp.plugins;

registerPlugin('easy-attachments-sidebar', {
    render: function () {
        return <Sidebar />;
    },
});