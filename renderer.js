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
  [[;black;white]open] <url>       : opens a new window (minion) and loads <url>
workspace:
  [[;black;white]info]             : lists minions in workspace
  [[;black;white]save] <workspace> : saves current <workspace> i.e. url, position, etc. of each minion
  [[;black;white]desc] <workspace> : lists minions saved in <workspace>
  [[;black;white]load] <workspace> : loads saved <workspace>
  [[;black;white]dele] <workspace> : deletes <workspace>
  [[;black;white]list]             : lists all saved workspaces
dominion:
  [[;black;white]help]             : ...
  [[;black;white]quit]             : closes (do)minion and all its minions`
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
                    this.echo(`  [[;black;white]${url}]`)
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
                    this.echo(`  [[;black;white]${minion}]`)
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
                    this.echo(`  [[;black;white]${workspace}]`)
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
        onCommandNotFound: (command, terminal) => {
            terminal.echo(
                `[[;red;]ERR [[b;;]${command}] not in `
                + $.terminal.escape_formatting('[open, info, save, desc, load, dele, list, ')
                + '[[ub;;]help], quit'
                + $.terminal.escape_formatting(']')
                + ']')
        },
        historyFilter: (command) => {
            return 'open info save desc load dele list help quit'.includes(
                $.terminal.parse_command(command).name
            )
        }
    })
})

