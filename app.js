// 3D Printer Interface
// Command line application to stream .gcode files directly to printer just by using ./modules/printer.js module
//
// demos:
// 1- send gcode data to printer from file using command line ARGUMENTS
// $ node appcmd.js ./bin/gcode/demo.gcode
//
// 2- send gcode data to printer from STDIN pipe (file content stream using cat)
// $ cat ./bin/gcode/demo.gcode | node appcmd.js
//
// 3- send gcode data to printer from STDIN - manual insert GCODE on the console  + ENTER (interactive/manual control)
// $ node appcmd.js
// (enter commands): 
// M104 S200\n
// G28\n
// G90\n
// G21\n
// G92\n
// M82\n
// G1 Z0.200 F7800.000\n
//------------------------------------------------------------------

var configdata = require('config');
var node_env = 
        process.env.NODE_ENV !== undefined ? 
        process.env.NODE_ENV : 
        "default";
console.log("[appcmd.js]:config/%s.json: $s", node_env, JSON.stringify(configdata));

var fs = require('fs'),
	path = process.argv[2],
	printer = require('./modules/printer.js');

var	readableStream;
var readableSize = 4*256;	

//------------------------------------------------------------------
// objects initialization/configuration
//------------------------------------------------------------------
printer.setCbAfterOpenPrinter(delayedmain);

// try interface without real 3d printer by using /dev/null
//printer.setConfigPrinter({serialport: "/dev/null", baudrate: 115200});
//printer.setConfigPrinter({serialport: "/dev/tty.usbmodem621", baudrate: 115200});
//printer.setConfigPrinter({serialport: "/dev/tty.usbmodem622", baudrate: 115200});

// or (with 3d printer hardware) - alternative init method with args
//printer.initializePrinter({serialport: "/dev/tty.usbmodem621", baudrate: 115200});

var spconfig = {};

spconfig.serialport = 
	configdata.serialport.serialport !== undefined ?
	configdata.serialport.serialport :
	"/dev/null";

spconfig.baudrate = 
	configdata.serialport.baudrate !== undefined ?
	configdata.serialport.baudrate :
	115200;

var readableSize = 4*256;

printer.initialize(spconfig);

//------------------------------------------------------------------
// main
//------------------------------------------------------------------

function delayedmain () {
	setTimeout(main, 2000);
}

function main () {
	console.log("Launching app.js");
	
	// check if .gcode file is inserted via command line arguments
	if (path !==undefined ) {
		readableStream = fs.createReadStream(path, {encoding: 'utf8', highWaterMark : 8});
		//readableStream.pipe(process.stdout);
		readableStream.pipe(printer.iStreamPrinter, {end: false});
		printer.oStreamPrinter.pipe(process.stdout);

		readableStream.once('end', function() {
  			console.log('Readable Stream Ended');
		});		

		readableStream.read(readableSize);
	}
	else {
		console.log("Get stream from STDIN pipe...");

		process.stdin.setEncoding('utf8');
		process.stdin.pipe(printer.iStreamPrinter, { end: false });
		printer.oStreamPrinter.pipe(process.stdout);
	}	
}