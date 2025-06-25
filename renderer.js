__electronLog.info("dominion starting");
// not sure how to get window inside terminal so ...
// minion:
const open = (url) => {
  window.electronAPI.open(url);
};
const opin = (url, id) => {
  window.electronAPI.opin(url, id);
};
const shut = (workspace) => {
  window.electronAPI.shut(workspace);
};
// workspace:
const info = () => {
  return window.electronAPI.info();
};
const save = (workspace) => {
  window.electronAPI.save(workspace);
};
const desc = (workspace) => {
  return window.electronAPI.desc(workspace);
};
const load = (workspace) => {
  window.electronAPI.load(workspace);
};
const less = (workspace) => {
  window.electronAPI.less(workspace);
};
const dele = (workspace) => {
  window.electronAPI.dele(workspace);
};
const list = () => {
  return window.electronAPI.list();
};
// dominion:
const help = `windows:
  [[;black;white]open] <url>          : opens a new window and loads <url>
  [[;black;white]opin] <id> <url>     : loads <url> in window <id>
  [[;black;white]shut] <name> / all   : shuts windows saved in <name> or [[b;;]all]
  [[;black;white]info]                : lists windows
workspace:
  [[;black;white]save] <name>         : saves windows under <name>
  [[;black;white]desc] <name>         : lists windows saved under <name>
  [[;black;white]load] / [[;black;white]less]  <name> : opens all windows saved under <name> ...
  [[;black;white]dele] <name>         : deletes <name>
  [[;black;white]list]                : lists workspaces
dominion:
  [[;black;white]help]                : ...
  [[;black;white]quit]                : closes [[b;;]all] windows and quits`;
const quit = () => {
  window.electronAPI.quit();
};

// ZE TERMINAL !!!
jQuery(function ($, undefined) {
  $("#terminal").terminal(
    {
      // minion:
      open: (url) => {
        open(url);
      },
      opin: (url, id) => {
        opin(url, id);
      },
      shut: (workspace) => {
        shut(workspace);
      },
      info: function () {
        info().then((result) => {
          result.forEach((minion) => {
            this.echo(
              `  [[;black;white] ${minion.id.toString().padStart(2, " ")} ] ${minion.urls.join(" + ")}`,
            );
          });
        });
      },
      // workspace:
      save: (workspace) => {
        save(workspace);
      },
      desc: function (workspace) {
        desc(workspace).then((result) => {
          result.forEach((minion, index) => {
            this.echo(`  [[;black;white]${minion}]`);
          });
        });
      },
      load: (workspace) => {
        load(workspace);
      },
      less: (workspace) => {
        less(workspace);
      },
      dele: (workspace) => {
        dele(workspace);
      },
      list: function () {
        list().then((result) => {
          result.forEach((workspace, index) => {
            this.echo(`  [[;black;white]${workspace}]`);
          });
        });
      },
      // dominion:
      help: function () {
        this.echo(help);
      },
      quit: quit,
    },
    {
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
      prompt: ">>> ",
      keymap: {
        "CTRL+D": function (e, original) {
          quit();
        },
      },
      completion: true,
      convertLinks: false,
      onCommandNotFound: (command, terminal) => {
        terminal.echo(
          `[[;red;]ERR [[b;;]${command}] not in ` +
            $.terminal.escape_formatting(
              "[open, opin, shut, info, save, desc, load, less, dele, list, ",
            ) +
            "[[ub;;]help], quit" +
            $.terminal.escape_formatting("]") +
            "]",
        );
      },
      historyFilter: (command) => {
        return "open opin shut info save desc load less dele list help quit".includes(
          $.terminal.parse_command(command).name,
        );
      },
      exceptionHandler: function (exception) {
        this.echo(`[[;red;]EXC ${exception.message}`);
        __electronLog.error(exception.stack);
      },
    },
  );
});
