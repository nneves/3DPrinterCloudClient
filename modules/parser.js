var util = require('util');
var Transform = require('stream').Transform;
util.inherits(GCodeParser, Transform);

//------------------------------------------------------------------
// Class definition / inheritance
//------------------------------------------------------------------
function GCodeParser(options) {
  if (!(this instanceof GCodeParser))
    return new GCodeParser(options);

  Transform.call(this, options);

  this.array_block = [];
  this.array_strbuffer = "";
  this.lines_counter = 0;
  this.first_chunck = true;
  this.warpgcode = true;
  this.warpcmdid = false;
}

//------------------------------------------------------------------
// Prototype
//------------------------------------------------------------------
GCodeParser.prototype._transform = function(chunk, encoding, done) {

  /*
  console.log("\r\n");
  console.log("-----------------------------------------------------");
  console.log("[Transform]: Print chunck data:");
  console.log("-----------------------------------------------------");
  console.log("%s", chunk); */

  // count number of lines present in the data block
  var internalcounter = (chunk.match(/\n/g)||[]).length;
  /*
  console.log("-----------------------------------------------------");
  console.log("[Transform]: Found %d lines", internalcounter);
  console.log("-----------------------------------------------------"); */

  /*
  console.log("-----------------------------------------------------");
  console.log("[Transform]: Found %d chars", chunk.length);
  console.log("-----------------------------------------------------"); */

  // split stream data into lines of strings (array)
  this.array_block = chunk.split("\n");
  
  // pre-adds previous partial line to the new data
  if (this.array_block.length > 0)
    this.array_block[0] = this.array_strbuffer + this.array_block[0];
//--> missing else code ???

  // test if the last line is an incomplete line, if so 
  // buffers it to be pre-added into the next data block
  this.array_strbuffer = "";
  if (this.array_block.length > 1) {
    this.array_strbuffer = this.array_block[this.array_block.length - 1];
    this.array_block.splice(this.array_block.length - 1);
  }

  //console.log("[core.js]:iStream: Preparing to print Block Data:");
  var jsonData;
  for (var i=0; i<this.array_block.length; i++) {
    //console.log("[ %s ]",this.array_block[i]);

    // normalize gcode
    var nGCode = this.normalizeGCode(this.array_block[i]).trim();
    if (nGCode.length == 0) {
      //console.log('[parser.js]: Removing un-normalized gcode line: %s', this.array_block[i]);
      this.array_block.splice(i,1);
      --i;
      continue;
    }

    // validade gcode
    if (this.validateGCode(nGCode) == false) {
      //console.log('[parser.js]: Removing invalid gcode line: %s', this.array_block[i]);
      this.array_block.splice(i,1);
      --i;
      continue;
    }

    if (this.warpgcode) {
      
      if (this.warpcmdid)
        jsonData = {'gcode': nGCode, 'cmdid': this.lines_counter};
      else 
        jsonData = {'gcode': nGCode};
      
      nGCode = JSON.stringify(jsonData);      
    }
    this.array_block[i] = nGCode;
    this.lines_counter++;
  }

  this.push(this.array_block.join('\n'));  

  done();
};
//------------------------------------------------------------------
// sample
//var transformStream = new GCodeParser({decodeStrings: false, size: 8, highWaterMark: 8});
//------------------------------------------------------------------
// remove comments from gcode lines
GCodeParser.prototype.normalizeGCode = function(data) {

  if (data === undefined) {
    return "";
  }

  var gcode = data.toString();
  if (gcode.trim().length == 0) {
    return "";
  }  

  // check for stream initial micro chunk (8 chars)
  if (this.first_chunck && gcode.length < 24) {
    this.first_chunck = false;
    this.array_strbuffer = gcode;
    console.log("SPECIAL CASE: %s", gcode);
    return "";
  }

  // check for comments in gcode line, if found then split and remove comment
  var array_cmd = gcode.split(";");

  // check if ';' was found
  if (array_cmd.length > 0) {

    // check if the command is empty
    if (array_cmd[0].trim().length == 0) {
      return "";
    }

    // return gcode data without comments ';'
    return array_cmd[0].trim();  
  }

  // gcode data
  return gcode;  
};

GCodeParser.prototype.validateGCode = function(data) {

  if (data === undefined) {
    return false;
  }

  var gcode = data.toString().trim();
  if (gcode.length == 0) {
    return false;
  }  

  return true;
};

//------------------------------------------------------------------
// export
//------------------------------------------------------------------
module.exports = {
  GCodeParser: GCodeParser
};
//------------------------------------------------------------------