const { resolve } = require('path');
const { existsSync } = require('fs');
const { unlink } = require('fs').promises;
const Plugin = require('powercord/Plugin');
const { inject, uninject } = require('powercord/injector');
const { React, ReactDOM, getModule } = require('powercord/webpack');
const Notice = require('./Notice');

const INVITE = [ '5eSH46g', '538759280057122817' ];

module.exports = class Announcements extends Plugin {
  constructor () {
    super();
    this.notices = [];
  }

  async start () {
    this._patchNotices();
    const injectedFile = resolve(__dirname, '..', '..', '..', '__injected.txt');
    if (existsSync(injectedFile)) {
      await unlink(injectedFile);
      this.sendNotice({
        id: 'pc-first-welcome',
        message: 'Welcome! Powercord has been successfully injected into your Discord client. Feel free to join our Discord server for announcements, support and more!',
        button: {
          text: 'Join Server',
          onClick: () => {
            this.closeNotice('pc-first-welcome');
            require('powercord/webpack').getModule([ 'acceptInvite' ]).acceptInvite(INVITE[0], {}, () => {
              require('powercord/webpack').getModule([ 'selectGuild' ]).selectGuild(INVITE[1]);
            });
          }
        }
      }, true);
    }
  }

  unload () {
    uninject('pc-custom-notices');
  }

  sendNotice (notice, alwaysDisplay) {
    if (!this.notices.find(n => n.id === notice.id) && (alwaysDisplay || !this.settings.get('dismissed', []).includes(notice.id))) {
      this.notices.push(notice);
      this._renderNotice();
    }
  }

  closeNotice (noticeId) {
    this.notices = this.notices.filter(n => n.id !== noticeId);
    this.settings.set('dismissed', [ ...this.settings.get('dismissed', []), noticeId ]);
    this._renderNotice();
  }

  _patchNotices () {
    const NoticeStore = getModule([ 'getNotice' ]);
    inject('pc-custom-notices', NoticeStore, 'getNotice', (_, res) => { // eslint-disable-line
      if (!res) {
        this._renderNotice();
      }
      return res;
    });
  }

  _renderNotice () {
    if (document.querySelector('.pc-guildsWrapper + .pc-flex > .pc-flexChild .pc-notice')) {
      return;
    }

    const element = document.querySelector('.pc-guildsWrapper + .pc-flex .powercord-notice');
    if (element) {
      element.parentElement.remove();
    }

    const noticeContainer = document.querySelector('.pc-guildsWrapper + .pc-flex');
    if (noticeContainer && this.notices.length > 0) {
      const div = document.createElement('div');
      noticeContainer.insertBefore(div, noticeContainer.firstChild);

      const notice = this.notices[this.notices.length - 1];
      ReactDOM.render(
        React.createElement(Notice, {
          notice,
          onClose: () => this.closeNotice(notice.id)
        }), div
      );
    }
  }
};
