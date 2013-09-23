// Printer Module Objectives:
// - initialize serial port to communicate with a 3d printer
// - exports a writable stream to receive data for printer 
//   (GCODE data stream, individual GCODE lines or custom commands)
// - exports a readable stream to write responses from printer

var config = {serialport: "/dev/ttyACM0", baudrate: 115200};
var	iserialport = require("serialport");
var	iSerialPort = iserialport.SerialPort; // Serial Port - Localize object constructor
var	spCBAfterOpen = undefined;
var	sp = undefined;
var	spFlagInit = false;
var	emulatedPrinterResponseTime = 1000;

// module interface stream
var stream = require('stream');
var iStream = new stream.Writable({highWaterMark : 32});
var oStream = new stream.Stream();

iStream.writable = true;
oStream.readble = true;

// internal auxiliar vars
var array_block = [];
var array_strbuffer = "";
var lines_counter = 0;
var idcmdlist = [];
var blocklinethreshold = 125;

//------------------------------------------------------------------
// public functions
//------------------------------------------------------------------
function spSetConfig (iconfig) {

	console.log('[printer.js]:Serial Port Set Config: ', JSON.stringify(iconfig));

	// verify and updates config
	verifyUpdateConfig(iconfig);
};

function initialize (iconfig) {

	console.log('[printer.js]:initialize: ',JSON.stringify(iconfig));

	// verify if object was already initialized
	if (sp !== undefined)
		return sp;

	// verify and updates config
	if (typeof iconfig === 'object')
		verifyUpdateConfig(iconfig);

	// SerialPort object initializationconsole
	console.log('[printer.js]:Instantiate Serial Port object');
	sp = new iSerialPort(config.serialport, {
	    baudrate: config.baudrate,
	    parser: iserialport.parsers.readline("\n")
	});

	// Register Serial Port RX callback
	sp.on("data", spCBResponse);

	// register serial port on.open callback
	sp.on('open', function(err) {
    if ( !err )
    	spFlagInit = true;
        console.log("[printer.js]:Serial Port %s Connected at %d bps!", config.serialport, config.baudrate);

        if (spCBAfterOpen !== undefined) {
        	console.log("[printer.js]:Launching SerialPort After Open callback...");
        	spCBAfterOpen();
        }
        else {
        	console.log("[printer.js]:No SerialPort After Open callback defined!");
        }

        // calling printer emulator initializaion messages when using /dev/null
        emulatePrinterInitMsg();
	});
};

//------------------------------------------------------------------
// getters/setters functions
//------------------------------------------------------------------
function spSetCbAfterOpen (cbfunc) {
	spCBAfterOpen = cbfunc;
};

//------------------------------------------------------------------
// private functions
//------------------------------------------------------------------
function verifyUpdateConfig (iconfig) {

	console.log("[printer.js]:verifyUpdateConfig();");
	if (typeof iconfig === 'object' && iconfig.serialport !== undefined && iconfig.serialport !== undefined) {
		
		console.log('[printer.js]:Config SerialPort: '+iconfig.serialport);
		config.serialport = iconfig.serialport;
	}
	if (typeof iconfig === 'object' && iconfig.baudrate  !== undefined && iconfig.baudrate !== undefined) {
		
		console.log('[printer.js]:Config BaudRate: '+iconfig.baudrate);	
		config.baudrate = iconfig.baudrate;
	}
	console.log('[printer.js]:Serial Port initialization: %s, %d ...', config.serialport, config.baudrate);
};

function spWrite (dlines) {
	
	var cmd = dlines.gcode;
	var cmdid = dlines.cmdid;

	if (cmdid === undefined)
		cmdid = 0;

	if (cmd === undefined || cmd.length == 0) {
		spCBResponse("empty_cmd\n");
		return false;
		//cmd = " G4 P1"; // do nothing for 1 ms
	}
	
	// verifiy if cmd last char equals to '\n'
	var endchar = '';
	if (cmd.charAt(cmd.length-1) != '\n')
		endchar = '\n';

	/*
	if (cmdid > 0)
		console.log("[printer.js]:spWrite: CMDID[%d]=%s", cmdid, cmd+endchar);
	else
		console.log("[printer.js]:spWrite: %s", cmd+endchar); 
	
	// add cmdid to response list
	if (cmdid > 0) {
		console.log("[printer.js]:Pushing CMDID=%d to response list", cmdid);
		idcmdlist.push(cmdid);
	} */

	// writes data to serialport
	sp.write(cmd.trim()+endchar);

	// normal conditions: serialport (cnc/reprap/3dprinter) will responde 'ok' and sp.on("data"...) is triggered
	// special condition: /dev/null needs to emulate serialport callback (using setTimeout for additional delay)
	if (config.serialport.toUpperCase() === '/DEV/NULL') {

		setTimeout(function () {
			console.log('[printer.js]: SerialPort simulated callback response (/dev/null): ok\r\n');
			spCBResponse("ok\n");

		}, emulatedPrinterResponseTime );
	}

	return true;
};

function spCBResponse (data) {

	// remove \r or \n from response data
	var idata = data.replace(/\r/g, "");
		idata = idata.replace(/\n/g, "");

	//console.log("[printer.js]:[Board_TX]->[Node.JS_RX]: %s\r\n", idata);
   	
	if (data.indexOf("ok") != -1) {
		lines_counter--;

		// NOTE: 
		// printer temperature data will be triggered in the 'ok' switch
		// {"response":"ok T:18.8 /0.0 B:0.0 /0.0 @:0"}
		// need to implement a special case with regex to test this 
		// specific response and warp it in a {"temperture":idata}; 
		var pattern = /([a-zA-z@]:)/;
		if (pattern.test(idata)) {
			// found temperature response, split data into format:
			// ["ok ", "T:", "131.3 /0.0 ", "B:", "0.0 /0.0 ", "@:", "0"]
			var tempdata = idata.split(pattern);
			var temperature = {
					"T0": tempdata[2].split("/")[0].replace(" ", ""),
					"T1": tempdata[2].split("/")[1].replace(" ", ""),
					"B0": tempdata[4].split("/")[0].replace(" ", ""),
					"B1": tempdata[4].split("/")[1].replace(" ", ""),
					"C": tempdata[6].replace(" ", "")
				};
			var rescmd2 = {"temperature":temperature};
			oStream.emit('data', JSON.stringify(rescmd2)+'\r\n\r\n');			
		}
		else {
			// normal response
			var rescmd = {"response":idata};
			if (idcmdlist.length > 0) {
				rescmd.cmdid = idcmdlist.shift();
				//console.log("[printer.js]:Adding CMDID=%d to response: %s", rescmd.cmdid, JSON.stringify(rescmd));
			}
			else {
				//console.log("[printer.js]: SerialPort response: %s", JSON.stringify(rescmd));
			}
			oStream.emit('data', JSON.stringify(rescmd)+'\r\n\r\n');			
		}
		// TRIGGERING iStream (datablock) || EventEmitter (dataline)
		dataBlockLineTrigger();
	}
	else if (data.indexOf("invalid_cmd") != -1) {  // future implementation
		lines_counter--;

		var rescmd = {"error":idata};
		//console.log("[printer.js]: SerialPort invalid_cmd: %s", JSON.stringify(rescmd));
		oStream.emit('data', JSON.stringify(rescmd)+'\r\n\r\n');		

		// TRIGGERING iStream (datablock) || EventEmitter (dataline)
		dataBlockLineTrigger();
	}
	else if (data.indexOf("empty_cmd") != -1) {
		lines_counter--;

		var rescmd = {"error":idata};
		//console.log("[printer.js]: SerialPort empty_cmd: %s", JSON.stringify(rescmd));
		oStream.emit('data', JSON.stringify(rescmd)+'\r\n\r\n');		

		// TRIGGERING iStream (datablock) || EventEmitter (dataline)
		dataBlockLineTrigger();
	}
	else if (data.indexOf("comment_cmd") != -1) {
		lines_counter--;

		var rescmd = {"error":idata};
		//console.log("[printer.js]: SerialPort comment_cmd: %s", JSON.stringify(rescmd));
		oStream.emit('data', JSON.stringify(rescmd)+'\r\n\r\n');		

		// TRIGGERING iStream (datablock) || EventEmitter (dataline)
		dataBlockLineTrigger();		
	}	
	else {
		var rescmd = {"printer":idata};
		//console.log("[printer.js]: SerialPort printer message: %s", JSON.stringify(rescmd));
		oStream.emit('data', JSON.stringify(rescmd)+'\r\n\r\n');				
	}
};

function emulatePrinterInitMsg () {

	//emulater printer initial messages when unsing /dev/null
	if (config.serialport.toUpperCase() === '/DEV/NULL') {

		setTimeout(function () {
			console.log('[printer.js]:emulatePrinterInitMsg\r\n');
			spCBResponse("printer: 3D Printer Initialization Messages\n");
			spCBResponse("printer: Emulated printer is ready!\n");

		}, emulatedPrinterResponseTime );
	}
};

function dataBlockLineTrigger () {
		
	// verify if it can 'drain' the iStream
	if (array_block.length <= blocklinethreshold) {
		//console.log("[printer.js]:dataBlockLineTrigger: array_block.length <= blocklinethreshold => iStream Emit 'Drain' [%d]", array_block.length);
		iStream.emit('drain');
	}
	else {
		// array_block.length > blocklinethreshold => there are still lines left to send to printer
		//console.log("[printer.js]:dataBlockLineTrigger: LinesCounter>0 => dataBlockSendLineData(); [%d]", array_block.length);
		// send data line to printer
		dataBlockSendLineData();
	}	
};

function dataBlockSendLineData () {
	
	//console.log("[printer.js]:dataBlockSendLineData");

	if (array_block.length == 0) {
		//console.log("[printer.js]:dataBlockSendLineData: array_block.length = 0");
		return;
	}

    // send data line to the JSON stream
    var cmd;
    var array_block_line = array_block.shift();
    
    // check if command was already warpped in a JSON object
    if (array_block_line.indexOf('{') >= 0 && array_block_line.indexOf('}') >= 0) {
        cmd = JSON.parse(array_block_line);
    }
    else {
        // got a normal GCODE string, put it in a valid JSON object
        cmd = {"gcode": array_block_line};
    }

    // send data to printer
    lines_counter++;
    spWrite(cmd);
};

iStream.write = function (data) {

  /*
  console.log("\r\n");
  console.log("-----------------------------------------------------");
  console.log("[Printer]: Print chunck data:");
  console.log("-----------------------------------------------------");
  console.log("%s", data); */
    
  	// count number of lines present in the data block
	var internalcounter = (data.toString().match(/\n/g)||[]).length;

	// split stream data into lines of strings (array) and adds to current array
	array_block = array_block.concat(data.toString().split("\n"));
	
    // start sending lines to printer
    dataBlockSendLineData();
	
  	//return true // true means 'yes i am ready for more data now'
  	// OR return false and emit('drain') when ready later	
	return false;
};

iStream.end = function (data) {
  // no more writes after end
  // emit "close" (optional)
  console.log("[printer.js]: Close inputStream!");
  this.emit('close');
};

//------------------------------------------------------------------
// export
//------------------------------------------------------------------
module.exports = {
	initialize: initialize,
	setConfigPrinter: spSetConfig,
	setCbAfterOpenPrinter: spSetCbAfterOpen,
	iStreamPrinter: iStream,
	oStreamPrinter: oStream
};
//------------------------------------------------------------------