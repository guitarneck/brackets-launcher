define(function (require, exports, module) {
    "use strict";

	/**
		TODO :
            hiddenConsole à implémenter
            killcmd aussi ???
	 **/
	
    var DEBUG = false;
    
    /** --- MODULES --- **/
    var CommandManager		= brackets.getModule("command/CommandManager"),
        Menus 				= brackets.getModule("command/Menus"),
        DocumentManager 	= brackets.getModule("document/DocumentManager"),
        WorkspaceManager	= brackets.getModule("view/WorkspaceManager"),
        ExtensionUtils 		= brackets.getModule("utils/ExtensionUtils"),
        NodeDomain 			= brackets.getModule("utils/NodeDomain"),
        ProjectManager 		= brackets.getModule("project/ProjectManager"),
        Dialogs 			= brackets.getModule("widgets/Dialogs"),
		
        FileSystem          = brackets.getModule('filesystem/FileSystem'),
        FileUtils           = brackets.getModule('file/FileUtils'),
				
        LAUNCHER_EXEC_DIALOG_ID = "launcher-exec-dialog",

		LS_PREFIX 			= "launcher-",
		LAUNCHER_MENU_ID	= LS_PREFIX + "menu",
        launcherMenu 		= Menus.addMenu("Launcher", LAUNCHER_MENU_ID, Menus.BEFORE, Menus.AppMenuBar.HELP_MENU),

        DOMAIN_NAME 		= "brackets-launcher",
		DOMAIN_CONFIG		= LS_PREFIX + "config.json",
		NPM_CONFIG			= "package.json",
        GULP_CONFIG         = 'gulpfile.js';
	
	var panelArgsHtml = require('text!html/panel-args.html');
	var panelArgs;
	
	var menuDivs = [], // Menu dividers
		menuItems = {}; // Menu items
		
    var projectName = null;
    
    var compiled = null;

    let configuration,icons;

    function configure ()
    {
        configuration = {
            "gulp"      :true,
            "nmp"       :true,
            "colors"    :["white","#b0b0b0"]
        };
    }
    
    /**
     * Connect to the backend nodejs domain
     */
    var domain = new NodeDomain(DOMAIN_NAME, ExtensionUtils.getModulePath(module, "node/processDomain"));
    
    domain.on("output", function(info, data) {
        Panel.write(data);
    });
    
    /**
     * The ConnectionManager helps to build and run request to execute a file on the serverside
     */
    function toDir(cwd)
    {
        // If no cwd is specified use the current file's directory
        // if available else fallback to the project directory
        var doc = DocumentManager.getCurrentDocument(),
            dir;
        if(cwd) {
            dir = cwd;
        } else if(doc !== null && doc.file.isFile) {
            dir = doc.file.parentPath;
        } else {
            dir = ProjectManager.getProjectRoot().fullPath;
        }
        return dir;
    }
    
    var ConnectionManager = {

        last: {
            command: null,
            cwd: null
        },

        /**
         * Creates a new EventSource
         *
         * @param (optional): Command
         * @param (optional): Current working directory to use
         */
        // This need to be inside quotes since new is a reserved word
        "new": function (command, cwd) {            
            var dir = toDir(cwd);
            
            ConnectionManager.exit();
            Panel.show(command);
            Panel.clear();
            
            domain.exec("startProcess", command, dir)
            .done(function(exitCode) {
                Panel.write("Program exited with status code of " + exitCode + ".");
            })
            .fail(function(err) {
                Panel.write("Error inside "+DOMAIN_NAME+"' processes occured: \n" + err);
            });
            
            // Store the last command and cwd
            this.last.command = command;
            this.last.cwd = dir;

        },

        "exe": function (command, cwd, cb) {
            var dir = toDir(cwd);
            
            ConnectionManager.exit();
            
            domain.exec("execProcess", command, dir)
            .done(function(result) {
                cb(result.code, result.code === 0 ? result.datas : []);
            })
            .fail(function(err) {
                console.error("Fail to exec command ",command," : ",err);
                cb(err);
            });
        },
        
		rerun: function () {

            var last = this.last;
            if(last.command === null) return;

            this.new(last.command, last.cwd);

        },

        /**
         * Close the current connection if server is started
         */
        exit: function () {
            domain.exec("stopProcess");
        }
    };

    /**
     * Panel alias terminal
     */
    $(".content").append(require("text!html/panel.html"));
    var Panel = {

        id: "brackets-launcher-terminal",
        panel: null,
        commandTitle: null,
        height: 201,

        get: function (qs)
        {
            return this.panel.querySelector(qs);
        },

        initColors: function ()
        {
            var css = this.get(".table-container").style;
            css.backgroundColor = configuration.colors[0];
            css.color = configuration.colors[1];
        },
        
        /**
         * Basic functionality
         */
        show: function (command)
        {
            this.panel.style.display = "block";
            this.commandTitle.textContent = command;
            WorkspaceManager.recomputeLayout();
        },
        hide: function ()
        {
            this.panel.style.display = "none";
            WorkspaceManager.recomputeLayout();
        },
        clear: function ()
        {
            this.pre.innerHTML = null;
        },

        /**
         * Prints a string into the terminal
         * It will be colored and then escape to prohibit XSS (Yes, inside an editor!)
         *
         * @param: String to be output
         */
        write: function (str)
        {
            var e = document.createElement("span");
			e.innerHTML = str;

            var scroll = false;
            if (this.pre.parentNode.scrollTop === 0 || this.pre.parentNode.scrollTop === this.pre.parentNode.scrollHeight || this.pre.parentNode.scrollHeight - this.pre.parentNode.scrollTop === this.pre.parentNode.clientHeight) {
                scroll = true;
            }

            this.pre.appendChild(e);

            if (scroll) {
                this.pre.parentNode.scrollTop = this.pre.parentNode.scrollHeight;
            }

		},

        /**
         * Used to enable resizing the panel
         */
        mousemove: function (e)
        {
            var h = Panel.height + (Panel.y - e.pageY);
            Panel.panel.style.height = h + "px";
            WorkspaceManager.recomputeLayout();

        },
        mouseup: function (e)
        {

            document.removeEventListener("mousemove", Panel.mousemove);
            document.removeEventListener("mouseup", Panel.mouseup);

            Panel.height = Panel.height + (Panel.y - e.pageY);

        },
        y: 0
    };

    // Still resizing
    Panel.panel = document.getElementById(Panel.id);
    Panel.commandTitle = Panel.get(".cmd");
    Panel.pre = Panel.get(".table-container pre");
    Panel.get(".resize").addEventListener("mousedown", function (e) {

        Panel.y = e.pageY;

        document.addEventListener("mousemove", Panel.mousemove);
        document.addEventListener("mouseup", Panel.mouseup);

    });

    /**
     * Terminal buttons
     */
    Panel.get(".action-close").addEventListener("click", function () {
        ConnectionManager.exit();
        Panel.hide();
    });
    Panel.get(".action-terminate").addEventListener("click", function () {
        ConnectionManager.exit();
    });
    Panel.get(".action-rerun").addEventListener("click", function () {
        ConnectionManager.rerun();
    });
    
    var Dialog = {
        /**
         * The exec modal is used to execute a command
         * HTML: html/modal-install.html
         */
        exec: {

            /**
             * HTML put inside the dialog
             */
            html: require("text!html/modal-exec.html"),

            /**
             * Opens up the modal
             */
            show: function () {

                Dialogs.showModalDialog(
                    LAUNCHER_EXEC_DIALOG_ID,
                    "Execute command",
                    this.html,
					[{
                        className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                        id: Dialogs.DIALOG_BTN_OK,
                        text: "Run"
                    }, {
                        className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                        id: Dialogs.DIALOG_BTN_CANCEL,
                        text: "Cancel"
                    }]
                ).done(function (id) {

                    if (id !== Dialogs.DIALOG_BTN_OK) return;

                    // Command musn't be empty
                    if (command.value.trim() == "") {
                        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "Error", "Please enter a command");
                        return;
                    }

                    ConnectionManager.new(command.value);
                });
					
				var command = document.querySelector("." + LAUNCHER_EXEC_DIALOG_ID + " .command");
				command.focus();                
            }
        }
    };

    function CompiledCommand ( command )
    {
        ///* Public */
        this.compiled = '';

        ///* Private */
        var _command = $.extend(true,{opts:{},args:[]},command);

        function _getParams ( str )
        {
           var ret = [];
           str.replace(/\$[0-9]+/g,function(v){ret.push(parseInt(v.substr(1)));return v});
           return ret;
        }

        /**
         * Configuration parameters special values :
         *  - $selectedFile         The selected file's name 
         *  - $dirOfSelectedFile    The directory of the selected file
         *  - $projectDir           The project directory
         *  - $projectName          Tne project name
         */
        var _systemParams = {
            "selectedFile"      : function ( cmd )
                {
                    var doc = DocumentManager.getCurrentDocument();
                    return doc ? doc.file.name : '';
                },

            "dirOfSelectedFile" : function ( cmd )
                {
                    var doc = DocumentManager.getCurrentDocument();
                    return doc ? doc.file.parentPath
                               : (cmd.opts.defaultPath ? cmd.opts.defaultPath
                                                       : _systemParams.projectDir(cmd));
                },

            "projectDir"        : function ( cmd )
                {
                    var dir = ProjectManager.getProjectRoot();
                    return dir ? dir.fullPath : '.';
                },

            "projectName"       : function ( cmd )
                {
                    var root = ProjectManager.getProjectRoot();
                    var name = projectName !== null ? projectName 
                                                    : (root ? root.name : '$?');

                    if ( name === '$?' )
                    {
                        var rank = cmd.args.length;
                        cmd.args[rank] = 'project-name-please';
                        name = '$'+rank;
                    }
                    return name;
                }
        };

        function _replaceSystemParams ( str ,cmd )
        {
            if( typeof str === "string" )
            {            
                for (var param in _systemParams) {
                    if ( str.indexOf('$'+param) < 0 ) continue;
                    str = str.replace(new RegExp('\\$'+param,'g'), _systemParams[param](cmd));
                }
            }
            return str;
        }
        
        ///* Public */
        this.replaceSystemParams = function ( cmd )
        {
            function scanOptArg (k)
            {
                for (var elem in cmd[k]) cmd[k][elem] = _replaceSystemParams(cmd[k][elem], cmd);
            }
            
            ['opts','args'].forEach(scanOptArg);
            
            cmd.cmd = _replaceSystemParams(cmd.cmd,cmd);
        }
        
        this.setupOpts = function ( cmd )
        {
            if ( cmd.opts.defaultPath && /^\.$|^\.\//.test(cmd.opts.defaultPath) )
                cmd.opts.defaultPath = cmd.opts.defaultPath.replace('.','$projectDir');
        }

    	this.buildCommand = function ( cmd ,args )
        {
            args = args || [];
            this.compiled = cmd.cmd.replace(/\$[0-9]+/g,function(v){
                var i = parseInt(v.substr(1));
                return args[i] ? args[i] : (cmd.args[i] ? cmd.args[i] : '');
                /*
                return _replaceSystemParams(
                            args[i] ? args[i] : (cmd.args[i] ? cmd.args[i] : ''),
                            cmd);
                */
            });
        }
                
        this.compile = function ( cmd ,args )
        {
            cmd = cmd || _command;
            args = args || [];
            this.setupOpts(cmd);
            this.buildCommand(cmd,args);
            this.replaceSystemParams(cmd);
            
            if( this.isValid(_command.cmd) ) this.compiled = _command.cmd;
        }
        
        this.isValid = function (str)
        {
            str = str || _command.cmd;
            if( str === '') return false;
            
            var countSystemParams = 0;
            for (var param in _systemParams)
                if ( str.indexOf('$'+param) >= 0 ) countSystemParams += 1;

            return _getParams(str).length + countSystemParams === 0;
        }

        this.getDefaultPath = function ()
        {
             return _command.opts.defaultPath ? _command.opts.defaultPath : '';
        }

        this.getSplitChar = function ()
        {
            return _command.splitChar || ':';
        }
        
        this.getArgs = function ()
        {
            return _command.args;
        }
        
        this.getCommand = function ()
        {
            return _command.cmd;
        }
        
        this.destroy = function ()
        {
            _command = null;
            this.compiled = '';
        }
    }
    
    function runCompiledCommand ()
    {
        if ( DEBUG )
        {
            console.log( compiled.compiled ,compiled.getDefaultPath() );
            return;
        }
		ConnectionManager.new( compiled.compiled,compiled.getDefaultPath() );
    }

	/**
	 * Command arguments
	 */
    var PANEL_LAUNCHER_ARGS_ID = DOMAIN_NAME + '-args';
    
    function showInputArgs() {
        if (!panelArgs) {            
            panelArgs = WorkspaceManager.createBottomPanel(PANEL_LAUNCHER_ARGS_ID, $(panelArgsHtml), 40);
            
            var btnClose = $('.close', $('#brackets-launcher-args'));

            btnClose.click(function() {
                if (panelArgs) {
                    panelArgs.hide();
                }
            });

            var input = $('#brackets-launcher-args-val');

            input.focusout(function() {
                btnClose.click();
            });

            input.keydown(function(evt) {
                if (evt.which === 27) {
                    btnClose.click();
                }
            });

            input.keypress(function(evt) {
                if (evt.which === 13) {
                    btnClose.click();
                    compiled.compile(null,input.val().split(compiled.getSplitChar()))
                    runCompiledCommand();
                }
            });

            WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_PANEL_SHOWN,function(event,id){
                if ( id === PANEL_LAUNCHER_ARGS_ID )
                {
                    input.focus();
                    input.select();
                }
            });

        }

        // So exibe a caixa de argumentos, se existir pelo menos uma marcacao
        // de parametros na construcao do comando.
        ////
        /*
        compileCommand(cmdSelected,[]);
        if (getParams(compiled.cmd).length === 0) {
			runCompiledCommand();
        */
        compiled.compile();
        if ( compiled.isValid() ) {
			runCompiledCommand();
        } else {
            $('#brackets-launcher-args-text').html(compiled.getCommand());
            $('#brackets-launcher-args-val').val(compiled.getArgs().join(compiled.getSplitChar()));
            panelArgs.show();
        }
                
    }
	
    
	function executeCommand () { //this = Command
        if ( compiled !== null )
        {
            compiled.destroy();
            compiled = null;
        }
        compiled = new CompiledCommand( menuItems[this.getID()] );
		showInputArgs();		
	}

    function addIcon (id,attrs)
    {
        let $icon = $(document.createElement("a"))
            .attr("id",id)
            .attr("href","#")
            .on("click",function(){
                CommandManager.execute(this.id.replace('-icon',''))
            });
        for(var attr in attrs) $icon.attr(attr,attrs[attr]);
        $icon.appendTo($("#main-toolbar .buttons"));
    }

    function loadConfigs (cfgData) {
		if ( !cfgData ) return;

        for ( var idx in menuDivs ) {
			launcherMenu.removeMenuDivider(menuDivs[idx].id);			
		}
        menuDivs.length = 0;

        let elm;
		for ( var item in menuItems ) {
            elm = document.getElementById(item+'-icon');
            elm && elm.parentNode.removeChild(elm);
			launcherMenu.removeMenuItem(item);			
		}
		menuItems = {};
		
        try {
            for (var i = 0, l = cfgData.length; i < l; i++) {
				if( cfgData[i].divider )
				{
					menuDivs.push(launcherMenu.addMenuDivider());
					continue;
				}
				
                var cmd = cfgData[i];
                cmd.cmdID = DOMAIN_NAME + '.cmd-' + i;
				
				var cmdObj = CommandManager.get(cmd.cmdID);
				if (!cmdObj)
				{
                	cmdObj = CommandManager.register(cmd.label, cmd.cmdID, executeCommand);
				} else {
					cmdObj.setName(cmd.label);
				}

                launcherMenu.addMenuItem(cmdObj);
				
				menuItems[cmd.cmdID] = cmd;
                
                if( cfgData[i].icon )
                {
                    let attrs = $.extend(true,icons,cfgData[i].icon);
                    attrs.title = cmd.label;
                    addIcon(cmd.cmdID+'-icon',attrs);
                }
            }
        } catch(err) {
            console.error('Error on file config '+ DOMAIN_CONFIG+': ' + err);
        }
    }

    function quickConf (lbl,cmd)
    {
        return {"label":lbl,"cmd":cmd,"args":[],"opts":{"defaultPath":"./"}};
    }
        
    /**
     * Read the config file "launcher-config.json".
     * Auto detect gulp tasks and npm scripts
     */
    function readConfigFile ()
    {
        var rootPath   = ProjectManager.getProjectRoot().fullPath;

		var lchConf = [],
            glpConf = [],
            npmConf = [];
        
        projectName = null;
        
        configure();
        
        function gulpPromise ()
        {
            var deferred = new $.Deferred();
            
            if ( configuration.gulp === false )
            {
                deferred.resolve();
                return deferred.promise();
            }
            
            var glpCfgFile = FileSystem.getFileForPath(rootPath + GULP_CONFIG);
            
            glpCfgFile.exists(function(err,exists){
                if ( exists )
                {
                    ConnectionManager.exe('gulp --tasks-simple','',function(err,datas){
                        if( err === 0 && datas.length > 0 )
                        {
                            var lines = [];
                            datas.forEach(function(line){
                                lines = lines.concat(line.split('\n'));
                            });
                            glpConf.push({divider:true});
                            glpConf.push(quickConf("Gulp...","gulp $0"));
                            lines.forEach(function(task){
                                if( task === "" ) return;
                                glpConf.push(quickConf("Gulp "+task,"gulp "+task));
                            });
                        }
                        deferred.resolve();
                    });
                }
                else deferred.resolve();
            });
            
            return deferred.promise();
        };
        
        function npmPromise ()
        {
            var deferred = new $.Deferred();

            if ( configuration.npm === false )
            {
                deferred.resolve();
                return deferred.promise();
            }

            var npmCfgFile = FileSystem.getFileForPath(rootPath + NPM_CONFIG);

            FileUtils.readAsText(npmCfgFile).done(function (rawText) {
                var npm = JSON.parse(rawText);
                if ( npm )
                {
                    projectName = npm['name'];
                    
                    for( var key in npm['scripts'] )
                    {
                        npmConf.push(quickConf("NPM "+key,"npm run "+key+" --silent"));
                    }
                    if( npmConf.length > 0 )
                    {
                        npmConf.unshift(quickConf("NPM...","npm $0"));
                        npmConf.unshift({divider:true});
                    }   
                }
                deferred.resolve();
            }).then(function(){deferred.resolve()});

            return deferred.promise();
        };

        function launcherPromise ()
        {
            var deferred = new $.Deferred(),
                lchCfgFile = FileSystem.getFileForPath(rootPath + DOMAIN_CONFIG);
            
            FileUtils.readAsText(lchCfgFile).done(function (rawText) {
                var configJson = JSON.parse(rawText);
				if (!configJson.menus) lchConf = [];
				else lchConf = [{divider:true}].concat(configJson.menus);
                
                typeof configJson["gulp"] !== 'undefined' && (configuration.gulp = configJson["gulp"]);
                typeof configJson["npm"] !== 'undefined' && (configuration.npm = configJson["npm"]);
                typeof configJson["colors"] !== 'undefined' && (configuration.colors = configJson["colors"]);

                if ( typeof configJson["link"] !== 'undefined' )
                {
                    let $link = $(document.createElement("link")).attr("rel","stylesheet");
                    for(var all in configJson["link"]) $link.attr(all,configJson["link"][all])
                    $link.appendTo($("head"));
                }

                icons = {};
                if ( typeof configJson["icons"] !== 'undefined' )
                {
                    for(var all in configJson["icons"]) icons[all] = configJson["icons"][all];
                }
                
                deferred.resolve();
        	}).fail(function(){deferred.reject()});
            
            return deferred.promise();
        };

        launcherPromise().done(function(){

            Panel.initColors();
            
            gulpPromise().then(function(){
                npmPromise().then(function(){
                    loadConfigs(lchConf.concat(npmConf,glpConf))
                })
            })
        
        }).fail(function(){
            console.log("Launcher config Fails !")
        });
        
        
    }
    
	// Some events
    ProjectManager.on('projectOpen projectRefresh',readConfigFile);
    DocumentManager.on('documentSaved',function(evt,doc){
        if ( doc.file.name == DOMAIN_CONFIG ||
             doc.file.name == NPM_CONFIG ||
             doc.file.name == GULP_CONFIG )
        { readConfigFile() }
    });
	
    var EXEC_CMD_ID				= DOMAIN_NAME+".exec";

    CommandManager.register("Execute command",EXEC_CMD_ID,function(){
        Dialog.exec.show();
    });

    launcherMenu.addMenuItem(EXEC_CMD_ID);

});