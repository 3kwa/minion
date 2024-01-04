__electronLog.info("dominion starting")
// not sure how to get window inside terminal so ...
// minion:
const open = (url) => { window.electronAPI.open(url) };
// workspace:
const info = () => { return window.electronAPI.info() };
const save = (workspace) => { window.electronAPI.save(workspace) };
const desc = (workspace) => { return window.electronAPI.desc(workspace) };
const load = (workspace) => { window.electronAPI.load(workspace) };
const dele = (workspace) => { window.electronAPI.dele(workspace) };
const list = () => { return window.electronAPI.list() };
// dominion:
const help = `minion:
  open <url>       : opens a new window (minion) and loads <url>
workspace:
  info             : lists minions in workspace
  save <workspace> : saves current <workspace> i.e. url, position, etc. of each minion
  desc <workspace> : lists minions saved in <workspace>
  load <workspace> : loads saved <workspace>
  dele <workspace> : deletes <workspace>
  list             : lists all saved workspaces
dominion:
  help             : ...
  quit             : closes (do)minion and all its minions`
const quit = () => { window.electronAPI.quit() };

// ZE TERMINAL !!!
jQuery(function($, undefined) {
    $('#terminal').terminal({
        // minion:
        open: (url) => {
            open(url)
        },
        info: function() {
            info().then((result) => {
                result.forEach((url) => {
                    this.echo(`  ${url}`)
                })
            })
        },
        // workspace:
        save: (workspace) => {
            save(workspace)
        },
        desc: function(workspace) {
            desc(workspace).then((result) => {
                result.forEach((minion, index) => {
                    this.echo(`  ${minion}`)
                })
            })
        },
        load: (workspace) => {
            load(workspace)
        },
        dele: (workspace) => {
            dele(workspace)
        },
        list: function() {
            list().then((result) => {
                result.forEach((workspace, index) => {
                    this.echo(`  ${workspace}`)
                })
            })
        },
        // dominion:
        help: function() {
            this.echo(help);
        },
        quit: quit,
    }, {
        greetings: `minimalistic HTML/CSS/JavaScript viewer
---------------------------------------
minion:
  [1] a servile follower or underling
  [2] one highly favored
dominion:
  [1] supreme authority
  [2] absolute ownership
---------------------------------------
>>> help
${help}`,
        height: 550,
        prompt: '>>> ',
        keymap: {
            'CTRL+D': function(e, original) { quit() },
        },
        completion: true,
        convertLinks: false,
    })
})

