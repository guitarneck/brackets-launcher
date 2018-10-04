(function () {
    "use strict";

	const DOMAIN_NAME = "brackets-launcher";
	
    const treekill	= require("treekill"),
          exec		= require("child_process").exec,
		  os       	= require('os');

    const ansispan  = require('../lib/ansi2span');
	
    let domain 		= null,
        child 		= null;

	
	const isWin = /^win/.test(os.platform());
	const isMac = /^darwin/.test(os.platform());
	
	//const osCmd = isWin ? 'cmd' : isMac ? 'tcsh' : 'bash';
	//let   osArg = isWin ? ['/K'] : ['l'];
	const osProf = isMac ? 'source ~/.bash_profile && ' : '';
    
    function cmdExecProcess(command, cwd, cb) {
		cmdStopProcess();
		
        child = exec(osProf + command,{
            cwd: cwd,
            silent: true
        });

        var datas = [];
        
        // Send data to the client
        var send = function(data) {
            datas.push( ansispan(data.toString()) );
        };

        child.stdout.on("data", send);
        child.stderr.on("data", send);

        child.on("exit", function(code) {
            cb(null,{code:code, datas:datas});
        });

        child.on("error", function(err) {
            cb(err);
        });
    }
    
    function stripColor (str)
    {
        return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
    }
    
    function cmdStartProcess(command, cwd, cb) {
		cmdStopProcess();
		
        child = exec(osProf + command,{
            cwd: cwd,
            silent: true
        });

        // Send data to the client
        var send = function(data) {
            domain.emitEvent(DOMAIN_NAME, "output", ansispan(data.toString()));
        };

        child.stdout.on("data", send);
        child.stderr.on("data", send);

        child.on("exit", function(code) {
            cb(null, code);
        });

        child.on("error", function(err) {
            cb(err);
        });
    }
    
    function cmdStopProcess() {
        if(child !== null) {
            treekill(child.pid);
        }
    }
    
    function init(domainManager) {
        domain = domainManager;

        if(!domainManager.hasDomain(DOMAIN_NAME)) {
            domainManager.registerDomain(DOMAIN_NAME, { major: 0, minor: 0 });
        }
        
        domainManager.registerCommand(
            DOMAIN_NAME,
            "execProcess",
            cmdExecProcess,
            true,
            "Exec the process using the supplied command",
            [
                {
                    name: "command",
                    type: "string"
                },
                {
                    name: "cwd",
                    type: "string"
                }
            ]
        );

        domainManager.registerCommand(
            DOMAIN_NAME,
            "startProcess",
            cmdStartProcess,
            true,
            "Starts the process using the supplied command",
            [
                {
                    name: "command",
                    type: "string"
                },
                {
                    name: "cwd",
                    type: "string"
                }
            ]
        );
        
        domainManager.registerCommand(
            DOMAIN_NAME,
            "stopProcess",
            cmdStopProcess,
            false,
            "Stops the process if one is already started",
            []
        );
        
        domainManager.registerEvent(
            DOMAIN_NAME,
            "output",
            [
                {
                    name: "output",
                    type: "string"
                }
            ]
        );
    }
    
    exports.init = init;

}());