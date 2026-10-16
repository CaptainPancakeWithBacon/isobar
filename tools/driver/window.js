// Test only: a plain window the driver can put on top of the terrain.
// `gjs -m window.js` opens it maximized, `gjs -m window.js small` leaves it small.
import Gtk from 'gi://Gtk?version=4.0';
import System from 'system';

const small = System.programArgs[0] === 'small';
const app = new Gtk.Application({application_id: 'dev.gijs.isobar.testwindow'});
app.connect('activate', () => {
    const win = new Gtk.ApplicationWindow({application: app, title: 'isobar-test-window', default_width: 400, default_height: 300});
    if (!small)
        win.maximize();
    win.present();
});
app.run([]);
